/**
 * Unit tests: one browser run end-to-end at the module boundary.
 * Runner + storage state + evidence retention, with every dependency injected.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { PlaywrightEvidencePipeline, type PlaywrightEvidenceDeps } from "./playwright-evidence.ts";
import { PlaywrightRunner } from "./playwright-runner.ts";
import { StorageStateService } from "./storage-state.ts";
import { PLAYWRIGHT_REPORT_FILE } from "./playwright-report.ts";

import { createFakeClock, createFakeExecFile } from "../testing/test-helpers.ts";

const ROOT = path.resolve("C:\\proj");
const AUTH = path.join(ROOT, "auth", "bc-storage-state.json");
const OUT = path.join(ROOT, "test-results");

const NOW = Date.parse("2026-11-16T12:00:00.000Z");

const LIVE_STATE = JSON.stringify({
  cookies: [{ name: "BC.AccessToken", value: "secret", domain: "businesscentral.dynamics.com", path: "/", expires: NOW / 1000 + 3600 }],
  origins: [],
});

const PASS_REPORT = JSON.stringify({
  stats: { duration: 2_000 },
  suites: [
    {
      specs: [{ title: "customer card fields", tests: [{ results: [{ status: "passed", duration: 2_000 }], status: "expected" }] }],
    },
  ],
});

const FAIL_REPORT = JSON.stringify({
  stats: { duration: 9_000 },
  suites: [
    {
      specs: [
        {
          title: "page inspector",
          tests: [{ results: [{ status: "failed", duration: 9_000, error: { message: "locator not found" } }], status: "unexpected" }],
        },
      ],
    },
  ],
});

function buildPipeline(opts: {
  exitCode?: number;
  report?: string;
  authState?: string | null;
  artefacts?: { trace?: boolean; video?: boolean; screenshot?: boolean };
}) {
  const files = new Map<string, Buffer>();
  // Directories must exist for discovery to descend; node:fs reports them as entries too.
  const dirs = new Set<string>([ROOT, path.join(ROOT, "tests"), path.join(ROOT, "auth"), OUT]);
  const removed: string[] = [];

  if (opts.authState !== null) files.set(AUTH, Buffer.from(opts.authState ?? LIVE_STATE));
  files.set(path.join(OUT, PLAYWRIGHT_REPORT_FILE), Buffer.from(opts.report ?? PASS_REPORT));

  const artefacts = opts.artefacts ?? {};
  const artefactPaths: Record<string, string> = {};
  if (artefacts.trace) artefactPaths.trace = path.join(OUT, "trace.zip");
  if (artefacts.video) artefactPaths.video = path.join(OUT, "video.webm");
  if (artefacts.screenshot) artefactPaths.screenshot = path.join(OUT, "bc-extension-verified.png");
  for (const p of Object.values(artefactPaths)) files.set(p, Buffer.from(`bytes-of-${path.basename(p)}`));

  const exec = createFakeExecFile(() => ({
    error: opts.exitCode ? Object.assign(new Error("exit"), { code: opts.exitCode }) : null,
    stdout: "",
    stderr: "",
  }));

  const runner = new PlaywrightRunner({
    execFile: exec.execFile,
    fileExists: p => files.has(p),
    readFile: p => {
      const value = files.get(p);
      if (!value) throw new Error(`ENOENT: ${p}`);
      return value.toString("utf8");
    },
    resolvePlaywrightPath: () => "npx-playwright",
    rootDir: ROOT,
  });

  const storageState = new StorageStateService({
    readFile: p => {
      const value = files.get(p);
      if (!value) throw new Error(`ENOENT: ${p}`);
      return value.toString("utf8");
    },
    writeFile: (p, data) => void files.set(p, Buffer.from(String(data))),
    mkdir: d => void dirs.add(d),
    fileExists: p => files.has(p),
    now: () => new Date(NOW),
  });

  const deps: PlaywrightEvidenceDeps = {
    runner,
    storageState,
    inspectStorageState: (p, o) => storageState.resolve(p, o),
    outputDir: OUT,
    evidence: {
      // Direct children only: files and run directories, like node:fs.readdirSync.
      readDir: dir => {
        const children = new Set<string>();
        for (const key of dirs) {
          if (path.dirname(key) === dir) children.add(path.basename(key));
        }
        for (const key of files.keys()) {
          if (path.dirname(key) === dir) children.add(path.basename(key));
          else if (key.startsWith(dir + path.sep)) children.add(key.slice(dir.length + 1).split(path.sep)[0]);
        }
        return [...children].sort();
      },
      remove: (target: string) => {
        removed.push(target);
        for (const key of [...files.keys()]) {
          if (key === target || key.startsWith(target + path.sep)) files.delete(key);
        }
        for (const key of [...dirs]) {
          if (key === target || key.startsWith(target + path.sep)) dirs.delete(key);
        }
      },
      readFile: p => {
        if (!files.has(p)) throw new Error(`EISDIR: ${p}`);
        return files.get(p)!;
      },
      writeFile: (p, data) => void files.set(p, Buffer.from(String(data))),
      mkdir: d => void dirs.add(d),
      exists: p => files.has(p) || dirs.has(p),
      now: () => new Date(NOW),
    },
    rootDir: ROOT,
    now: createFakeClock().now,
    runIdFactory: () => "run-fixed",
  };

  return { pipeline: new PlaywrightEvidencePipeline(deps), files, dirs, removed, exec, artefactPaths };
}

describe("PlaywrightEvidencePipeline.run", () => {
  it("runs a suite, reports honestly and retains the screenshot", async () => {
    const { pipeline, files } = buildPipeline({ artefacts: { screenshot: true } });
    const result = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });

    assert.equal(result.success, true);
    assert.equal(result.runId, "run-fixed");
    assert.equal(result.report?.counts.passed, 1);
    assert.equal(result.evidence.retained.length, 1);
    assert.equal(result.evidence.retained[0].kind, "screenshot");
    assert.ok(files.has(path.join(OUT, "evidence", "run-fixed", "bc-extension-verified.png")));
  });

  it("retains trace and video after a failure and marks the run failed", async () => {
    const { pipeline } = buildPipeline({
      exitCode: 1,
      report: FAIL_REPORT,
      artefacts: { trace: true, video: true, screenshot: true },
    });
    const result = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });

    assert.equal(result.success, false);
    assert.deepEqual(result.evidence.retained.map(r => r.kind).sort(), ["screenshot", "trace", "video"]);
  });

  it("refuses to run without usable storage state and never spawns Playwright", async () => {
    const { pipeline, exec } = buildPipeline({ authState: null });
    const result = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });

    assert.equal(result.success, false);
    assert.equal(result.ran, false);
    assert.match(result.failureReason ?? "", /not found/i);
    assert.equal(exec.calls.length, 0);
  });

  it("passes the storage state to Playwright through the environment", async () => {
    const { pipeline, exec } = buildPipeline({});
    await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });

    const call = exec.calls[0];
    assert.equal(call.options.env?.PLAYWRIGHT_STORAGE_STATE, AUTH);
    assert.equal(call.options.env?.BC_STORAGE_STATE, AUTH);
  });

  it("runs with the requested base URL without leaking the cookie value into the environment", async () => {
    const { pipeline, exec } = buildPipeline({});
    await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH, baseUrl: "https://bc.example/sandbox" });

    const env = exec.calls[0].options.env ?? {};
    assert.equal(env.BC_WEB_URL, "https://bc.example/sandbox");
    assert.equal(JSON.stringify(env).includes("secret"), false);
  });

  it("prunes older evidence runs after writing the new one", async () => {
    const { pipeline, removed } = buildPipeline({});
    const first = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH, retention: { maxRuns: 5 } });
    assert.deepEqual(first.prune, { kept: ["run-fixed"], pruned: [], totalBytes: first.evidence.totalBytes }, "the policy ran and kept the run");

    const second = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH, retention: { maxRuns: 0 } });
    assert.deepEqual(second.prune?.pruned, ["run-fixed"], "maxRuns: 0 drops the run that was just recorded");
    assert.equal(removed.length, 1);
  });

  it("fails when the suite ran but produced no evidence directory, without inventing artefacts", async () => {
    const { pipeline } = buildPipeline({ artefacts: {} });
    const result = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });
    assert.deepEqual(result.evidence.retained, []);
    assert.equal(result.evidence.removed.length, 0);
  });

  it("reports the run id and summary the CLI prints", async () => {
    const { pipeline } = buildPipeline({});
    const result = await pipeline.run({ testDir: "tests/playwright", authStatePath: AUTH });
    assert.match(result.summary, /run-fixed/);
    assert.match(result.summary, /PASSED/);
  });
});


