/**
 * Unit tests: Entra ID client-credentials token provider.
 * The transport is injected, so no network is touched. Mirrors the browser suites' style:
 * one behaviour per `it`, and assertions on the *reason* a call failed.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EntraIdTokenProvider, TOKEN_REFRESH_SKEW_MS, type FetchLike } from "../../../packages/shared/src/bc/token-provider.ts";
import { EntraIdAuthError } from "../../../packages/shared/src/core/errors.ts";
import { createFakeClock } from "../../support/test-helpers.ts";

const TENANT = "contoso.onmicrosoft.com";
const CLIENT = "11111111-2222-3333-4444-555555555555";
const SECRET = "super-secret-value";

interface FakeCall {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  signal?: AbortSignal;
}

function tokenResponse(overrides: Record<string, unknown> = {}, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : `HTTP ${status}`,
    headers: new Headers(),
    json: async () => ({ access_token: "token-1", expires_in: 3600, token_type: "Bearer", ...overrides }),
    text: async () => "",
  };
}

/** Scripted transport: each call consumes the next response. */
const START = 1_700_000_000_000;

/** `clock.current()` is the value the provider will read on its *next* call. */
function buildProvider(
  responses: Array<(() => unknown) | ReturnType<typeof tokenResponse>>,
  opts: { now?: () => number } = {}
) {
  const calls: FakeCall[] = [];
  const clock = createFakeClock(START);
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: String(init?.body ?? ""),
      headers: (init?.headers ?? {}) as Record<string, string>,
      signal: init?.signal ?? undefined,
    });
    const next = responses[calls.length - 1];
    if (next === undefined) throw new Error("unexpected extra fetch");
    return (typeof next === "function" ? next() : next) as never;
  };

  const provider = new EntraIdTokenProvider({
    fetch: fetchImpl,
    now: opts.now ?? clock.now,
    sleep: async () => { },
  });
  return { provider, calls, clock };
}

describe("EntraIdTokenProvider — request shape", () => {
  it("posts a client-credentials grant to the tenant token endpoint", async () => {
    const { provider, calls } = buildProvider([tokenResponse()]);
    await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url, `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`);
    assert.equal(calls[0].headers["Content-Type"], "application/x-www-form-urlencoded");

    const body = new URLSearchParams(calls[0].body);
    assert.equal(body.get("grant_type"), "client_credentials");
    assert.equal(body.get("client_id"), CLIENT);
    assert.equal(body.get("client_secret"), SECRET);
    assert.match(body.get("scope") ?? "", /\.default$/);
  });

  it("returns the token and its absolute expiry", async () => {
    const fixedNow = 1_700_000_000_000;
    const { provider } = buildProvider([tokenResponse({ expires_in: 3600 })], { now: () => fixedNow });
    const token = await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET });

    assert.equal(token.accessToken, "token-1");
    assert.equal(token.expiresAt, fixedNow + 3_600_000);
  });
});

describe("EntraIdTokenProvider — caching", () => {
  it("reuses a cached token for the same credentials", async () => {
    const { provider, calls } = buildProvider([tokenResponse()]);
    const credentials = { tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET };

    await provider.getToken(credentials);
    await provider.getToken(credentials);
    assert.equal(calls.length, 1);
  });

  it("keeps a separate token per tenant so one tenant cannot receive another's token", async () => {
    const { provider, calls } = buildProvider([
      tokenResponse({ access_token: "token-a" }),
      tokenResponse({ access_token: "token-b" }),
    ]);

    const a = await provider.getToken({ tenantId: "a.onmicrosoft.com", clientId: CLIENT, clientSecret: SECRET });
    const b = await provider.getToken({ tenantId: "b.onmicrosoft.com", clientId: CLIENT, clientSecret: SECRET });

    assert.equal(a.accessToken, "token-a");
    assert.equal(b.accessToken, "token-b");
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /b\.onmicrosoft\.com/);
  });

  it("keeps a separate token per client id", async () => {
    const { provider, calls } = buildProvider([
      tokenResponse({ access_token: "token-1" }),
      tokenResponse({ access_token: "token-2" }),
    ]);
    await provider.getToken({ tenantId: TENANT, clientId: "client-1", clientSecret: SECRET });
    const second = await provider.getToken({ tenantId: TENANT, clientId: "client-2", clientSecret: SECRET });

    assert.equal(second.accessToken, "token-2");
    assert.equal(calls.length, 2);
  });

  it("does not reuse a token when the secret changes", async () => {
    const { provider, calls } = buildProvider([tokenResponse(), tokenResponse()]);
    await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: "first" });
    await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: "second" });
    assert.equal(calls.length, 2);
  });

  it("refreshes before expiry by the configured skew", async () => {
    let now = 1_700_000_000_000;
    const calls: number[] = [];
    const provider = new EntraIdTokenProvider({
      fetch: (async () => {
        calls.push(now);
        return tokenResponse({ access_token: `token-${calls.length}` });
      }) as FetchLike,
      now: () => now,
      sleep: async () => {},
    });
    const credentials = { tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET };

    const first = await provider.getToken(credentials);
    assert.equal(calls.length, 1);

    // Well before the skew window: the cached token is reused.
    now = first.expiresAt - TOKEN_REFRESH_SKEW_MS - 1;
    await provider.getToken(credentials);
    assert.equal(calls.length, 1, "outside the skew window the cache is served");

    // Inside the skew window: a new request is made even though the token has not expired.
    now = first.expiresAt - TOKEN_REFRESH_SKEW_MS;
    const refreshed = await provider.getToken(credentials);
    assert.equal(calls.length, 2, "the skew window forces an early refresh");
    assert.equal(refreshed.accessToken, "token-2");
  });

  it("clear() drops every cached token", async () => {
    const { provider, calls } = buildProvider([tokenResponse(), tokenResponse()]);
    const credentials = { tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET };
    await provider.getToken(credentials);
    provider.clear();
    await provider.getToken(credentials);
    assert.equal(calls.length, 2);
  });

  it("reports how many credentials are cached, for the health endpoint", () => {
    const { provider } = buildProvider([tokenResponse()]);
    assert.equal(provider.cachedCount, 0);
  });
});

describe("EntraIdTokenProvider — single flight", () => {
  it("collapses concurrent callers for the same credentials into one request", async () => {
    let resolveFetch: (value: unknown) => void = () => { };
    const pending = new Promise(resolve => {
      resolveFetch = resolve;
    });
    const calls: number[] = [];
    const provider = new EntraIdTokenProvider({
      fetch: (async () => {
        calls.push(1);
        await pending;
        return tokenResponse();
      }) as FetchLike,
      now: () => 1_700_000_000_000,
      sleep: async () => { },
    });

    const credentials = { tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET };
    const all = Promise.all(Array.from({ length: 10 }, () => provider.getToken(credentials)));
    resolveFetch(undefined);
    const tokens = await all;

    assert.equal(calls.length, 1, "ten concurrent callers must share one request");
    assert.ok(tokens.every(token => token.accessToken === "token-1"));
  });

  it("retries cleanly after a failed shared request", async () => {
    let attempt = 0;
    const provider = new EntraIdTokenProvider({
      fetch: (async () => {
        attempt += 1;
        // Fail every attempt of the first token request, then recover.
        if (attempt <= 3) throw new Error("socket hang up");
        return tokenResponse({ access_token: "recovered" });
      }) as FetchLike,
      now: () => 1_700_000_000_000,
      sleep: async () => { },
    });

    const credentials = { tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET };
    await assert.rejects(() => provider.getToken(credentials), /socket hang up/);

    // A failed flight must not poison the cache: the next call starts a fresh request.
    const token = await provider.getToken(credentials);
    assert.equal(token.accessToken, "recovered");
    assert.equal(attempt, 4);
  });
});

describe("EntraIdTokenProvider — failures", () => {
  it("does not retry a 4xx that will never succeed", async () => {
    const { provider, calls } = buildProvider([tokenResponse({ error: "invalid_client" }, 401)]);
    await assert.rejects(
      () => provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET }),
      (error: Error) => error instanceof EntraIdAuthError && /invalid_client|401/.test(error.message)
    );
    assert.equal(calls.length, 1);
  });

  it("retries a 429 and honours Retry-After", async () => {
    const sleeps: number[] = [];
    let attempt = 0;
    const provider = new EntraIdTokenProvider({
      fetch: (async () => {
        attempt += 1;
        if (attempt === 1) {
          const response = tokenResponse({}, 429);
          response.headers = new Headers({ "retry-after": "2" });
          return response;
        }
        return tokenResponse();
      }) as FetchLike,
      now: () => 1_700_000_000_000,
      sleep: async ms => {
        sleeps.push(ms);
      },
    });

    const token = await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET });
    assert.equal(token.accessToken, "token-1");
    assert.equal(attempt, 2);
    assert.deepEqual(sleeps, [2000], "Retry-After is seconds, converted to milliseconds");
  });

  it("retries 5xx with backoff and gives up after the configured attempts", async () => {
    const sleeps: number[] = [];
    const retrying = new EntraIdTokenProvider({
      fetch: (async () => tokenResponse({}, 503)) as FetchLike,
      now: () => 1_700_000_000_000,
      sleep: async ms => {
        sleeps.push(ms);
      },
      maxAttempts: 3,
    });

    await assert.rejects(
      () => retrying.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET }),
      /503|unavailable|Entra/i
    );
    assert.equal(sleeps.length, 2, "three attempts means two backoff waits");
    assert.ok(sleeps[1] > sleeps[0], "backoff grows between attempts");
  });

  it("rejects a response with no access_token", async () => {
    const { provider } = buildProvider([tokenResponse({ access_token: undefined })]);
    await assert.rejects(() => provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET }), /access_token/i);
  });

  it("rejects a response with a non-positive expires_in", async () => {
    const { provider } = buildProvider([tokenResponse({ expires_in: 0 })]);
    await assert.rejects(() => provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET }), /expires_in/i);
  });

  it("passes an abort signal so a hung request cannot block forever", async () => {
    const { provider, calls } = buildProvider([tokenResponse()]);
    await provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET });
    assert.ok(calls[0].signal, "a timeout signal must be attached to the request");
  });

  it("never puts the client secret in an error message", async () => {
    const { provider } = buildProvider([tokenResponse({ error_description: `bad secret ${SECRET}` }, 400)]);
    await assert.rejects(
      () => provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: SECRET }),
      (error: Error) => {
        assert.equal(error.message.includes(SECRET), false, "the secret must be redacted");
        return error instanceof EntraIdAuthError;
      }
    );
  });

  it("rejects incomplete credentials before calling the network", async () => {
    const { provider, calls } = buildProvider([tokenResponse()]);
    await assert.rejects(() => provider.getToken({ tenantId: "", clientId: CLIENT, clientSecret: SECRET }), /tenant/i);
    await assert.rejects(() => provider.getToken({ tenantId: TENANT, clientId: "", clientSecret: SECRET }), /client id/i);
    await assert.rejects(() => provider.getToken({ tenantId: TENANT, clientId: CLIENT, clientSecret: "" }), /secret/i);
    assert.equal(calls.length, 0);
  });
});
