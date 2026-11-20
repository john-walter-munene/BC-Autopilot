/**
 * Unit tests: Business Central OData v4 client.
 * The token provider and the transport are injected, so no network is touched.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ODataClient, buildODataUrl } from "../../../packages/shared/src/bc/odata-client.ts";
import { BcODataError } from "../../../packages/shared/src/bc/bc-odata-error.ts";

const BASE = "https://api.businesscentral.dynamics.com/v2.0/tenant-123/Sandbox/api/v2.0";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal | null;
}

function isRetryableODataError(error: unknown): boolean {
  return error instanceof BcODataError && error.retryable === true;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Token provider stub that hands out `token-N` and counts calls. */
function buildTokenProvider() {
  const calls: number[] = [];
  let cleared = 0;
  return {
    calls,
    get cleared() {
      return cleared;
    },
    provider: {
      async getToken() {
        calls.push(calls.length + 1);
        return { accessToken: `token-${calls.length}`, expiresAt: Date.now() + 3_600_000 };
      },
      clear() {
        cleared += 1;
      },
    },
  };
}

function buildClient(responses: Array<ReturnType<typeof jsonResponse> | (() => Promise<never>)>, tokenOptions = {}) {
  const calls: Call[] = [];
  const tokens = buildTokenProvider();
  const client = new ODataClient({
    baseUrl: BASE,
    tokenProvider: tokens.provider,
    credentials: { tenantId: "tenant-123", clientId: "client", clientSecret: "secret" },
    fetch: async (url, init) => {
      calls.push({
        url,
        method: init?.method ?? "GET",
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body,
        signal: init?.signal,
      });
      const next = responses[calls.length - 1];
      if (next === undefined) throw new Error(`unexpected extra fetch to ${url}`);
      return (typeof next === "function" ? next() : next) as never;
    },
    ...tokenOptions,
  });
  return { client, calls, tokens };
}

describe("buildODataUrl", () => {
  it("joins the base, entity set and query without doubled slashes", () => {
    assert.equal(
      buildODataUrl("https://bc/api/v2.0/", "customerLoyalties", { $top: 10, $select: "id,number" }),
      "https://bc/api/v2.0/customerLoyalties?%24top=10&%24select=id%2Cnumber"
    );
  });

  it("supports a record key and no query", () => {
    assert.equal(buildODataUrl("https://bc/api/v2.0", "customers(abc)", {}), "https://bc/api/v2.0/customers(abc)");
  });

  it("escapes OData filter values through the caller-provided string", () => {
    const url = buildODataUrl("https://bc", "customers", { $filter: "number eq '10000'" });
    assert.match(url, /%24filter=number\+eq|\+eq|%20eq/i);
    assert.equal(url.includes(" "), false, "spaces must be encoded");
  });
});

describe("ODataClient — request shape", () => {
  it("adds a bearer token and accepts JSON", async () => {
    const { client, calls } = buildClient([jsonResponse({ value: [] })]);
    await client.get("customerLoyalties");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].headers.Authorization, "Bearer token-1");
    assert.equal(calls[0].headers.Accept, "application/json");
  });

  it("sends a JSON body for POST and PATCH", async () => {
    const { client, calls } = buildClient([jsonResponse({ id: "1" }, 201), jsonResponse({ id: "1" })]);
    await client.post("customerLoyalties", { displayName: "Adatum" });
    await client.patch("customerLoyalties(1)", { displayName: "Adatum Ltd" });

    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(calls[0].body!), { displayName: "Adatum" });
    assert.equal(calls[1].method, "PATCH");
    assert.match(calls[1].url, /customerLoyalties\(1\)$/);
  });

  it("resolves a relative entity set against the configured base URL", async () => {
    const { client, calls } = buildClient([jsonResponse({ value: [] })]);
    await client.get("customerLoyalties", { $top: 5 });
    assert.equal(calls[0].url, `${BASE}/customerLoyalties?%24top=5`);
  });
});

describe("ODataClient — error mapping", () => {
  it("maps 404 to a not_found domain error", async () => {
    const { client } = buildClient([jsonResponse({ error: { message: "no such entity" } }, 404)]);
    await assert.rejects(
      () => client.get("missing"),
      (error: unknown) => error instanceof BcODataError && error.kind === "not_found" && error.status === 404
    );
  });

  it("maps 400 to a validation error and keeps the message", async () => {
    const { client } = buildClient([jsonResponse({ error: { message: "displayName is required" } }, 400)]);
    await assert.rejects(
      () => client.post("customerLoyalties", {}),
      (error: Error) => {
        assert.ok(error instanceof BcODataError);
        if (!(error instanceof BcODataError)) return false;
        assert.equal(error.kind, "validation");
        assert.match(error.message, /displayName is required/);
        return true;
      }
    );
  });

  it("maps 403 to a permission error", async () => {
    const { client } = buildClient([jsonResponse({ error: { message: "forbidden" } }, 403)]);
    await assert.rejects(
      () => client.get("customers"),
      (error: unknown) => error instanceof BcODataError && error.kind === "forbidden"
    );
  });

  it("maps 429 and 5xx to a retryable error", async () => {
    const { client } = buildClient([jsonResponse({}, 429), jsonResponse({}, 503)]);
    await assert.rejects(() => client.get("customers"), isRetryableODataError);
    await assert.rejects(() => client.get("customers"), isRetryableODataError);
  });

  it("surfaces the OData error payload in the message", async () => {
    const { client } = buildClient([jsonResponse({ error: { code: "BadRequest", message: "Invalid filter" } }, 400)]);
    await assert.rejects(
      () => client.get("customers", { $filter: "nope" }),
      (error: Error) => /BadRequest/.test(error.message) && /Invalid filter/.test(error.message)
    );
  });

  it("does not leak the bearer token into an error message", async () => {
    const { client } = buildClient([
      () => Promise.reject(new Error("connect ECONNREFUSED")),
      jsonResponse({}, 500),
    ]);
    await assert.rejects(
      () => client.get("customers"),
      (error: Error) => !error.message.includes("token-1")
    );
  });
});

describe("ODataClient — 401 recovery", () => {
  it("clears the cached token and retries once after a 401", async () => {
    const { client, calls, tokens } = buildClient([
      jsonResponse({ error: { message: "expired" } }, 401),
      jsonResponse({ value: [{ id: "1" }] }),
    ]);

    const result = await client.get<{ value: { id: string }[] }>("customerLoyalties");

    assert.equal(calls.length, 2);
    assert.equal(calls[1].headers.Authorization, "Bearer token-2", "a fresh token is requested");
    assert.equal(tokens.cleared, 1);
    assert.equal(result.value[0].id, "1");
  });

  it("fails with an auth error when the retry is also 401", async () => {
    const { client, calls } = buildClient([jsonResponse({}, 401), jsonResponse({}, 401)]);
    await assert.rejects(
      () => client.get("customerLoyalties"),
      (error: unknown) => error instanceof BcODataError && error.kind === "unauthorized"
    );
    assert.equal(calls.length, 2, "only one retry, never a loop");
  });

  it("does not retry a 401 on a non-idempotent POST", async () => {
    // Posting twice could duplicate a document; re-auth alone must not cause a write.
    const { client, calls, tokens } = buildClient([jsonResponse({}, 401), jsonResponse({ id: "1" }, 201)]);
    await assert.rejects(() => client.post("customerLoyalties", { displayName: "x" }), BcODataError);
    assert.equal(calls.length, 1);
    assert.equal(tokens.cleared, 1, "the stale token is still discarded");
  });
});

describe("ODataClient — timeouts", () => {
  it("attaches an abort signal to every request", async () => {
    const { client, calls } = buildClient([jsonResponse({ value: [] })]);
    await client.get("customers");
    assert.ok(calls[0].signal, "a timeout signal must be present");
  });

  it("reports a timeout as a retryable domain error", async () => {
    const { client } = buildClient([
      () => {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        return Promise.reject(error);
      },
    ]);
    await assert.rejects(
      () => client.get("customers"),
      (error: unknown) => isRetryableODataError(error) && /timed out|timeout/i.test(error.message)
    );
  });
});

describe("ODataClient — paging", () => {
  it("follows @odata.nextLink and concatenates values", async () => {
    const { client, calls } = buildClient([
      jsonResponse({ value: [{ id: "1" }], "@odata.nextLink": "https://bc/api/v2.0/customers?$skiptoken=abc" }),
      jsonResponse({ value: [{ id: "2" }] }),
    ]);

    const all = await client.getAll<{ id: string }>("customers");

    assert.deepEqual(all.map(record => record.id), ["1", "2"]);
    assert.equal(calls[1].url, "https://bc/api/v2.0/customers?$skiptoken=abc");
  });

  it("stops at maxPages so a bad nextLink cannot loop forever", async () => {
    const { client, calls } = buildClient([
      jsonResponse({ value: [{ id: "1" }], "@odata.nextLink": `${BASE}/customers?$skiptoken=a` }),
      jsonResponse({ value: [{ id: "2" }], "@odata.nextLink": `${BASE}/customers?$skiptoken=b` }),
    ]);
    const all = await client.getAll<{ id: string }>("customers", {}, { maxPages: 1 });
    assert.equal(all.length, 1);
    assert.equal(calls.length, 1);
  });
});
