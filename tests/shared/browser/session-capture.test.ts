/**
 * Unit tests: capturing a Business Central session for headless runs.
 * The browser is injected, so no browser is launched here.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { captureBusinessCentralSession } from "../../../packages/shared/src/browser/session-capture.ts";
import { StorageStateService } from "../../../packages/shared/src/browser/storage-state.ts";
import { at } from "../../support/test-helpers.ts";

const NOW = Date.parse("2026-11-20T10:00:00.000Z");
const TARGET = at("C:\\proj\\auth\\bc-storage-state.json");

const LIVE_STATE = JSON.stringify({
  cookies: [
    { name: "BC.AccessToken", value: "secret-value", domain: "businesscentral.dynamics.com", path: "/", expires: NOW / 1000 + 3600 },
  ],
  origins: [{ origin: "https://businesscentral.dynamics.com", localStorage: [] }],
});

function buildDeps(options: { state?: string } = {}) {
  const files = new Map<string, string>();
  const captured: string[] = [];
  const browser = {
    async launch() {
      return {
        async newContext(init: { storageState?: string }) {
          captured.push(init.storageState ? "with-state" : "anonymous");
          return {
            async newPage() {
              return { async goto() {}, async close() {} };
            },
            async storageState() {
              return options.state ?? LIVE_STATE;
            },
            async close() {},
          };
        },
        async close() {},
      };
    },
  };

  const storageState = new StorageStateService({
    readFile: p => {
      const value = files.get(p);
      if (value === undefined) throw new Error(`ENOENT: ${p}`);
      return value;
    },
    writeFile: (p, data) => void files.set(p, String(data)),
    mkdir: () => {},
    fileExists: p => files.has(p),
    now: () => new Date(NOW),
  });

  return { browser, storageState, files, captured };
}

describe("captureBusinessCentralSession", () => {
  it("launches headed, waits for the operator and persists the captured session", async () => {
    const { browser, storageState, files, captured } = buildDeps();
    const waits: number[] = [];

    const result = await captureBusinessCentralSession(
      { url: "https://businesscentral.dynamics.com", outPath: TARGET },
      { browser, storageState, waitForOperator: async () => void waits.push(1) }
    );

    assert.equal(result.path, TARGET);
    assert.equal(result.valid, true);
    assert.equal(result.cookieCount, 1);
    assert.deepEqual(waits, [1], "the operator is prompted before the state is read");
    assert.deepEqual(captured, ["anonymous"], "the login starts from a clean context");
    assert.ok(files.has(TARGET));
  });

  it("never reports the cookie value", async () => {
    const { browser, storageState } = buildDeps();
    const result = await captureBusinessCentralSession(
      { url: "https://businesscentral.dynamics.com", outPath: TARGET },
      { browser, storageState, waitForOperator: async () => {} }
    );
    assert.equal(JSON.stringify(result).includes("secret-value"), false);
  });

  it("rejects a capture with no Business Central session cookie", async () => {
    const { browser, storageState, files } = buildDeps({
      state: JSON.stringify({ cookies: [{ name: "Other", value: "x", domain: "example.com", path: "/", expires: -1 }], origins: [] }),
    });

    await assert.rejects(
      () =>
        captureBusinessCentralSession(
          { url: "https://businesscentral.dynamics.com", outPath: TARGET },
          { browser, storageState, waitForOperator: async () => {} }
        ),
      /no Business Central session cookie/i
    );
    assert.equal(files.has(TARGET), false, "a broken capture must not overwrite a good one");
  });

  it("always closes the browser, even when capture fails", async () => {
    let closed = 0;
    const { storageState } = buildDeps();
    const browser = {
      async launch() {
        return {
          async newContext() {
            throw new Error("context exploded");
          },
          async close() {
            closed += 1;
          },
        };
      },
    };

    await assert.rejects(
      () =>
        captureBusinessCentralSession(
          { url: "https://businesscentral.dynamics.com", outPath: TARGET },
          { browser, storageState, waitForOperator: async () => {} }
        ),
      /context exploded/
    );
    assert.equal(closed, 1);
  });

  it("requires an https Business Central URL", async () => {
    const { browser, storageState } = buildDeps();
    await assert.rejects(
      () =>
        captureBusinessCentralSession(
          { url: "http://localhost", outPath: TARGET },
          { browser, storageState, waitForOperator: async () => {} }
        ),
      /https/i
    );
  });
});
