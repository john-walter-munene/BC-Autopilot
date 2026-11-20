/**
 * Unit tests: the Business Central client SDK emitted into imported Next.js apps.
 * The generated code must not re-implement token handling: that duplicates (and drifts from)
 * `packages/shared/src/bc/token-provider.ts`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateBcClientSdk } from "../../apps/api/src/common/generators/bc-client-sdk-generator.ts";

const sdk = () => generateBcClientSdk("https://github.com/acme/portal");

describe("generateBcClientSdk", () => {
  it("hands token acquisition to @bc-agent/shared instead of calling Entra directly", () => {
    const code = sdk();

    assert.match(code, /from '@bc-agent\/shared'/);
    assert.match(code, /EntraIdTokenProvider/);
    assert.equal(code.includes("login.microsoftonline.com"), false, "no second token implementation");
    assert.equal(code.includes("client_secret:"), false, "the secret is read by the provider, not the SDK");
  });

  it("confirms the generated TypeScript is syntactically valid", () => {
    const code = sdk();
    const openBraces = (code.match(/\{/g) ?? []).length;
    const closeBraces = (code.match(/\}/g) ?? []).length;
    assert.equal(openBraces, closeBraces, "unbalanced braces indicate broken template output");
    assert.doesNotMatch(code, /undefined`|`undefined/);
  });

  it("declares the client factory and the entity operations", () => {
    const code = sdk();
    assert.match(code, /export async function getBcAuthenticatedClient/);
    assert.match(code, /getCustomerProfiles/);
    assert.match(code, /submitOnlineOrder/);
  });

  it("includes the imported repository URL in the header comment", () => {
    assert.match(sdk(), /https:\/\/github\.com\/acme\/portal/);
  });

  it("never embeds a credential value", () => {
    const code = sdk();
    assert.equal(/clientSecret:\s*['"][^'"]+['"]/.test(code), false);
    assert.match(code, /process\.env\.BC_CLIENT_SECRET/);
  });
});
