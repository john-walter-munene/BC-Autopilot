/**
 * Unit tests: Entra ID auth service (API adapter).
 * This layer used to keep a single token regardless of tenant; these tests pin the fix.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EntraIdAuthService } from "../../apps/api/src/modules/auth/auth.service.ts";
import { EntraIdTokenProvider, type FetchLike } from "../../packages/shared/src/bc/token-provider.ts";

const SECRET = "super-secret";

function buildService() {
  const urls: string[] = [];
  const fetchImpl: FetchLike = async url => {
    urls.push(url);
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({ access_token: `token-for-${urls.length}`, expires_in: 3600 }),
      text: async () => "",
    };
  };

  const provider = new EntraIdTokenProvider({ fetch: fetchImpl, sleep: async () => { } });
  const service = new EntraIdAuthService({ provider });
  return { service, urls };
}

describe("EntraIdAuthService", () => {
  it("returns an access token for the requested tenant", async () => {
    const { service } = buildService();
    const token = await service.getAccessToken("contoso.onmicrosoft.com", "client", SECRET);
    assert.match(token, /^token-for-/);
  });

  it("never returns one tenant's token to another tenant", async () => {
    const { service } = buildService();
    const first = await service.getAccessToken("a.onmicrosoft.com", "client", SECRET);
    const second = await service.getAccessToken("b.onmicrosoft.com", "client", SECRET);

    assert.notEqual(first, second, "each tenant must get its own token");
  });

  it("still caches per tenant, so repeat calls do not re-authenticate", async () => {
    const { service, urls } = buildService();
    await service.getAccessToken("a.onmicrosoft.com", "client", SECRET);
    await service.getAccessToken("a.onmicrosoft.com", "client", SECRET);
    assert.equal(urls.length, 1);
  });

  it("clearCache() forces a new token", async () => {
    const { service, urls } = buildService();
    await service.getAccessToken("a.onmicrosoft.com", "client", SECRET);
    service.clearCache();
    await service.getAccessToken("a.onmicrosoft.com", "client", SECRET);
    assert.equal(urls.length, 2);
  });

  it("rejects incomplete credentials", async () => {
    const { service } = buildService();
    await assert.rejects(() => service.getAccessToken("", "client", SECRET), /tenant/i);
  });
});
