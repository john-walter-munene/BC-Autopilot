/**
 * Unit tests: Playwright runner (process boundary).
 * Verifies spawn wiring, report read-back, and failure honesty without launching a browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { PlaywrightRunner, extractJson, playwrightCommand, type PlaywrightRunDeps } from "../../../packages/shared/src/browser/playwright-runner.ts";
import { PLAYWRIGHT_REPORT_FILE } from "../../../packages/shared/src/browser/playwright-report.ts";
import { createFakeClock, createFakeExecFile } from "../../support/test-helpers.ts";

const ROOT = path.resolve("C:\\proj");
const REPORT_PATH = path.join(ROOT, "test-results", PLAYWRIGHT_REPORT_FILE);

const PASSING_REPORT = JSON.stringify({
  stats: { duration: 4_000 },
  suites: [
    {
      title: "bc-customization.spec.ts",
      file: "tests/bc-customization.spec.ts",
      specs: [{ title: "verifies loyalty fields", tests: [{ results: [{ status: "passed", duration: 4_000 }], status: "expected" }] }],
    },
  ],
});

const FAILING_REPORT = JSON.stringify({
  stats: { duration: 15_000 },
  suites: [
    {
      title: "bc-customization.spec.ts",
      file: "tests/bc-customization.spec.ts",
      specs: [
        {
          title: "verifies loyalty fields",
          tests: [{ results: [{ status: "failed", duration: 15_000, error: { message: "Timeout 15000ms exceeded" } }], status: "unexpected" }],
        },
      ],
    },
  ],
});

describe("extractJson", () => {
  it("returns a bare JSON document unchanged", () => {
    assert.equal(extractJson('{"suites":[]}'), '{"suites":[]}');
  });

  it("finds the report when Playwright prefixes diagnostics on stdout", () => {
    const stdout = 'Warning: something\n{"suites":[],"stats":{}}\nDone\n';
    assert.equal(extractJson(stdout), '{"suites":[],"stats":{}}');
  });

  it("returns null when stdout holds no report", () => {
    assert.equal(extractJson("Running 1 test using 1 worker\n"), null);
    assert.equal(extractJson("{\"not\":\"a report\"}"), null);
  });
});

describe("playwrightCommand", () => {
  it("runs a JS entry with the current Node binary instead of spawning a shell shim", () => {
    const resolved = playwrightCommand("C:\\proj\\node_modules\\@playwright\\test\\cli.js");
    assert.equal(resolved.command, process.execPath);
    assert.deepEqual(resolved.prefixArgs, ["C:\\proj\\node_modules\\@playwright\\test\\cli.js"]);
  });

  it("spawns a native executable directly", () => {
    const resolved = playwrightCommand("/usr/local/bin/playwright");
    assert.equal(resolved.command, "/usr/local/bin/playwright");
    assert.deepEqual(resolved.prefixArgs, []);
  });
});

function buildRunner(opts: {
  exitCode?: number | null;
  killed?: boolean;
  report?: string | null;
  reportExists?: boolean;
  spawnError?: Error;
  stdout?: string;
}) {
  const exec = createFakeExecFile(call => {
    if (opts.spawnError) {
      // A spawn failure carries a string code (ENOENT/EACCES), not an exit status.
      return { error: Object.assign(opts.spawnError, { code: "EACCES" }) };
    }
    return {
      error: opts.exitCode ? Object.assign(new Error("playwright exited"), { code: opts.exitCode, killed: opts.killed }) : null,
      stdout: opts.stdout ?? "Running 1 test using 1 worker\n",
      stderr: "",
    };
  });
  const clock = createFakeClock();
  const readPaths: string[] = [];
  const deps: PlaywrightRunDeps = {
    execFile: exec.execFile,
    now: clock.now,
    fileExists: p => {
      if (p === REPORT_PATH) return opts.reportExists ?? true;
      return false;
    },
    readFile: p => {
      readPaths.push(p);
      if (p !== REPORT_PATH) throw new Error(`ENOENT: ${p}`);
      return opts.report ?? "";
    },
    resolvePlaywrightPath: () => "npx-playwright",
    rootDir: ROOT,
  };
  return { runner: new PlaywrightRunner(deps), exec, readPaths };
}

describe("PlaywrightRunner.run", () => {
  it("reports success and the parsed tests for a clean run", async () => {
    const { runner } = buildRunner({ report: PASSING_REPORT });
    const result = await runner.run({ config: "tests/playwright", testDir: "tests/playwright" });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report?.counts.passed, 1);
    assert.equal(result.report?.counts.failed, 0);
    assert.equal(result.timedOut, false);
  });

  it("records a deterministic duration from the injected clock", async () => {
    const { runner } = buildRunner({ report: PASSING_REPORT });
    const result = await runner.run({ testDir: "tests/playwright" });
    assert.equal(result.durationMs, 25);
  });

  it("fails when tests fail even though the reporter wrote a report", async () => {
    const { runner } = buildRunner({ exitCode: 1, report: FAILING_REPORT });
    const result = await runner.run({ testDir: "tests/playwright" });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
    assert.equal(result.report?.counts.failed, 1);
    assert.match(result.summary, /FAILED/);
    assert.match(result.summary, /first failure: verifies loyalty fields/);
  });

  it("fails when the reporter wrote no report, even if the process exited 0", async () => {
    const { runner } = buildRunner({ reportExists: false });
    const result = await runner.run({ testDir: "tests/playwright" });

    assert.equal(result.success, false);
    assert.equal(result.report, null);
    assert.match(result.stderr || result.summary, /report/i);
  });

  it("fails when the report cannot be parsed", async () => {
    const { runner } = buildRunner({ report: "{ truncated" });
    const result = await runner.run({ testDir: "tests/playwright" });

    assert.equal(result.success, false);
    assert.match(result.summary, /could not be parsed/i);
  });

  it("flags a timeout", async () => {
    const { runner } = buildRunner({ exitCode: 1, killed: true, reportExists: false });
    const result = await runner.run({ testDir: "tests/playwright", timeoutMs: 1_000 });
    assert.equal(result.timedOut, true);
    assert.equal(result.success, false);
  });

  it("reports a clear failure when Playwright is not installed", async () => {
    const { runner, exec } = buildRunner({ reportExists: false });
    const deps: PlaywrightRunDeps = {
      execFile: exec.execFile,
      fileExists: () => false,
      readFile: () => "",
      resolvePlaywrightPath: () => null,
      rootDir: ROOT,
    };
    const result = await new PlaywrightRunner(deps).run({ testDir: "tests/playwright" });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, null);
    assert.match(result.stderr, /Playwright was not found/);
    assert.equal(exec.calls.length, 0, "must not spawn when Playwright is missing");
  });

  it("passes the working directory, timeout and env through to the child process", async () => {
    const { runner, exec } = buildRunner({ report: PASSING_REPORT });
    await runner.run({ testDir: "tests/playwright", cwd: path.join(ROOT, "apps"), timeoutMs: 9_000, env: { BC_WEB_URL: "http://bc" } });

    assert.equal(exec.calls.length, 1);
    assert.equal(exec.calls[0].options.cwd, path.join(ROOT, "apps"));
    assert.equal(exec.calls[0].options.timeout, 9_000);
    assert.equal(exec.calls[0].options.env?.BC_WEB_URL, "http://bc");
  });

  it("parses the report from stdout when the reporter writes there instead of to disk", async () => {
    // Verified against real Playwright: `--reporter json` prints to stdout by default.
    const { runner } = buildRunner({ reportExists: false, stdout: `diagnostic line\n${PASSING_REPORT}\n` });
    const result = await runner.run({ testDir: "tests/playwright" });

    assert.equal(result.success, true);
    assert.equal(result.report?.counts.passed, 1);
  });

  it("reads the report from the configured output directory", async () => {
    const custom = path.join(ROOT, "custom-out");
    const readPaths: string[] = [];
    const exec = createFakeExecFile(() => ({ stdout: "" }));
    const runner = new PlaywrightRunner({
      execFile: exec.execFile,
      fileExists: p => p === path.join(custom, PLAYWRIGHT_REPORT_FILE),
      readFile: p => {
        readPaths.push(p);
        return PASSING_REPORT;
      },
      resolvePlaywrightPath: () => "npx-playwright",
      rootDir: ROOT,
    });

    const result = await runner.run({ testDir: "tests/playwright", outputDir: custom });
    assert.equal(result.success, true);
    assert.deepEqual(readPaths, [path.join(custom, PLAYWRIGHT_REPORT_FILE)]);
    assert.equal(exec.calls[0].args.includes(custom), true);
  });

  it("never throws when the spawn itself throws", async () => {
    const { runner } = buildRunner({ spawnError: new Error("spawn failed") });
    const result = await runner.run({ testDir: "tests/playwright" });
    assert.equal(result.success, false);
    assert.match(result.summary, /could not be started/);
    assert.match(result.stderr, /exit code 1/, "a silent spawn failure still explains itself");
  });
});
