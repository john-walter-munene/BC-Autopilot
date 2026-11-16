/**
 * Unit tests: managed Playwright storage state (Entra ID session reuse).
 * Mirrors node-postgres `packages/pg/test/unit` style: no real disk, no real browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  DEFAULT_STORAGE_STATE_PATH,
  StorageStateService,
  inspectStorageState,
  summariseStorageState,
  BC_AUTH_COOKIE_NAMES,
} from "./storage-state.ts";

const NOW = Date.parse("2026-11-16T12:00:00.000Z");

function isoOffset(ms: number): string {
  return new Date(NOW + ms).toISOString();
}

/** A captured state with one live BC session cookie and one expired one. */
function liveState() {
  return JSON.stringify({
    cookies: [
      {
        name: "BC.AccessToken",
        value: "redacted",
        domain: "businesscentral.dynamics.com",
        path: "/",
        expires: NOW / 1000 + 3600,
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
      {
        name: "ARRAffinity",
        value: "redacted",
        domain: "businesscentral.dynamics.com",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
    ],
    origins: [{ origin: "https://businesscentral.dynamics.com", localStorage: [] }],
  });
}

function buildService(opts: { files?: Record<string, string>; nowMs?: number } = {}) {
  const files = new Map<string, string>(Object.entries(opts.files ?? {}));
  const writes: string[] = [];
  const service = new StorageStateService({
    readFile: p => {
      const value = files.get(p);
      if (value === undefined) throw new Error(`ENOENT: ${p}`);
      return value;
    },
    writeFile: (p, data) => {
      writes.push(p);
      files.set(p, String(data));
    },
    mkdir: () => {},
    fileExists: p => files.has(p),
    now: () => new Date(opts.nowMs ?? NOW),
  });
  return { service, files, writes };
}

describe("BC_AUTH_COOKIE_NAMES", () => {
  it("lists the session cookies the BC web client issues", () => {
    assert.ok(BC_AUTH_COOKIE_NAMES.includes("BC.AccessToken"));
    assert.ok(BC_AUTH_COOKIE_NAMES.includes("ARRAffinity"));
  });
});

describe("DEFAULT_STORAGE_STATE_PATH", () => {
  it("points at the documented auth folder", () => {
    assert.equal(DEFAULT_STORAGE_STATE_PATH, path.join("auth", "bc-storage-state.json"));
  });
});

describe("inspectStorageState", () => {
  it("reports a live BC session", () => {
    const state = inspectStorageState(liveState(), NOW);
    assert.equal(state.present, true);
    assert.equal(state.valid, true);
    assert.equal(state.cookieCount, 2);
    assert.equal(state.sessionCookiePresent, true);
    assert.deepEqual(state.reasons, []);
    assert.equal(state.expiresAt, isoOffset(3_600_000));
  });

  it("flags an expired session", () => {
    const state = inspectStorageState(liveState(), NOW + 2 * 3_600_000);
    assert.equal(state.present, true);
    assert.equal(state.valid, false);
    assert.match(state.reasons.join("\n"), /expired/i);
  });

  it("flags a state with no Business Central session cookie", () => {
    const noSession = JSON.stringify({
      cookies: [{ name: "Other", value: "x", domain: "example.com", path: "/", expires: -1 }],
      origins: [],
    });
    const state = inspectStorageState(noSession, NOW);
    assert.equal(state.valid, false);
    assert.equal(state.sessionCookiePresent, false);
    assert.match(state.reasons.join("\n"), /no Business Central session cookie/i);
  });

  it("flags an empty state", () => {
    const state = inspectStorageState(JSON.stringify({ cookies: [], origins: [] }), NOW);
    assert.equal(state.valid, false);
    assert.match(state.reasons.join("\n"), /empty/i);
  });

  it("flags malformed JSON without throwing", () => {
    const state = inspectStorageState("{ not json", NOW);
    assert.equal(state.present, true);
    assert.equal(state.valid, false);
    assert.match(state.reasons.join("\n"), /parse/i);
  });

  it("flags a state that is JSON but not a storage state object", () => {
    const state = inspectStorageState(JSON.stringify({ cookies: "nope" }), NOW);
    assert.equal(state.valid, false);
    assert.match(state.reasons.join("\n"), /not a Playwright storage state/i);
  });

  it("never echoes cookie values into the summary", () => {
    const summary = summariseStorageState(inspectStorageState(liveState(), NOW));
    assert.equal(summary.includes("redacted"), false);
  });

  it("treats a session-expiry cookie as a session cookie", () => {
    const sessionOnly = JSON.stringify({
      cookies: [{ name: "BC.Session", value: "v", domain: "businesscentral.dynamics.com", path: "/", expires: -1 }],
      origins: [],
    });
    const state = inspectStorageState(sessionOnly, NOW);
    assert.equal(state.sessionCookiePresent, true);
    assert.equal(state.valid, true);
    assert.equal(state.expiresAt, undefined);
  });
});

describe("StorageStateService.resolve", () => {
  it("reports missing when the auth state file is absent", () => {
    const { service } = buildService();
    const result = service.resolve("C:\\proj\\auth\\state.json");
    assert.equal(result.present, false);
    assert.equal(result.valid, false);
    assert.match(result.reasons.join("\n"), /not found/i);
  });

  it("reads and validates an absolute path", () => {
    const filePath = path.resolve("C:\\proj\\auth\\state.json");
    const { service } = buildService({ files: { [filePath]: liveState() } });
    const result = service.resolve("C:\\proj\\auth\\state.json");
    assert.equal(result.present, true);
    assert.equal(result.valid, true);
    assert.equal(result.path, filePath);
  });

  it("resolves a relative path against the supplied cwd, like Playwright does", () => {
    const cwd = path.resolve("C:\\proj");
    const expected = path.join(cwd, DEFAULT_STORAGE_STATE_PATH);
    const { service } = buildService({ files: { [expected]: liveState() } });
    const result = service.resolve(DEFAULT_STORAGE_STATE_PATH, { cwd });
    assert.equal(result.path, expected);
    assert.equal(result.valid, true);
  });
});

describe("StorageStateService.capture", () => {
  it("writes the compacted state and appends-origin capturedAt rather than embedding secrets in metadata", () => {
    const target = path.resolve("C:\\proj\\auth\\state.json");
    const { service, writes, files } = buildService();
    const result = service.capture(target, liveState());

    assert.equal(result.path, target);
    assert.equal(result.valid, true);
    assert.deepEqual(writes, [target]);

    const written = JSON.parse(files.get(target)!);
    assert.equal(written.cookies.length, 2);
    assert.equal(written.capturedAt, new Date(NOW).toISOString());
  });

  it("rejects capture of a state with no BC session cookie", () => {
    const target = path.resolve("C:\\proj\\auth\\state.json");
    const { service, writes } = buildService();
    assert.throws(() => service.capture(target, JSON.stringify({ cookies: [], origins: [] })), /no Business Central session cookie/i);
    assert.deepEqual(writes, []);
  });

  it("rejects capture of malformed JSON", () => {
    const { service, writes } = buildService();
    assert.throws(() => service.capture("C:\\proj\\auth\\state.json", "{oops"), /parse/i);
    assert.deepEqual(writes, []);
  });

  it("creates the parent directory before writing", () => {
    const dirs: string[] = [];
    const target = path.resolve("C:\\proj\\nested\\auth\\state.json");
    const service = new StorageStateService({
      readFile: () => "",
      writeFile: () => {},
      mkdir: d => {
        dirs.push(d);
      },
      fileExists: () => false,
      now: () => new Date(NOW),
    });
    service.capture(target, liveState());
    assert.deepEqual(dirs, [path.dirname(target)]);
  });
});

describe("StorageStateService.requireUsable", () => {
  it("returns the state path when valid", () => {
    const filePath = path.resolve("C:\\proj\\auth\\state.json");
    const { service } = buildService({ files: { [filePath]: liveState() } });
    assert.equal(service.requireUsable("C:\\proj\\auth\\state.json"), filePath);
  });

  it("fails fast with an actionable message when the state is missing", () => {
    const { service } = buildService();
    assert.throws(() => service.requireUsable("C:\\proj\\auth\\state.json"), /Run the CLI login command|capture/i);
  });

  it("fails fast when the state has expired", () => {
    const filePath = path.resolve("C:\\proj\\auth\\state.json");
    const { service } = buildService({ files: { [filePath]: liveState() }, nowMs: NOW + 7_200_000 });
    assert.throws(() => service.requireUsable("C:\\proj\\auth\\state.json"), /expired/i);
  });

  it("treats state as invalid but present before it happens", () => {
    const filePath = path.resolve("C:\\proj\\auth\\state.json");
    const { service } = buildService({ files: { [filePath]: liveState() }, nowMs: NOW - 60_000 });
    const result = service.resolve("C:\\proj\\auth\\state.json");
    assert.equal(result.present, true);
    assert.equal(result.valid, true);
  });
});
