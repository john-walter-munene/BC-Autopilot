/**
 * Unit tests: AL compiler runner (`alc.exe`).
 * Uses dependency injection so no real compiler process is spawned.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AlcRunner, buildAlcArgs, defaultOutputPath } from "./alc-runner.ts";
import { createFakeClock, createFakeExecFile } from "./test-helpers.ts";

const PROJECT = "C:\\proj\\al-src";
const CACHE = "C:\\proj\\.alpackages";
const OUT = "C:\\proj\\.output\\alc_BCCustomerScoring_1.0.0.0.app";

describe("buildAlcArgs", () => {
  it("builds project, packagecache and out switches", () => {
    const args = buildAlcArgs({ projectPath: PROJECT, packageCachePath: CACHE, outputPath: OUT });
    assert.deepEqual(args, [`/project:${PROJECT}`, `/packagecachepath:${CACHE}`, `/out:${OUT}`]);
  });

  it("omits the out switch when no output path is given", () => {
    const args = buildAlcArgs({ projectPath: PROJECT, packageCachePath: CACHE });
    assert.equal(args.length, 2);
    assert.ok(!args.some(a => a.startsWith("/out:")));
  });

  it("appends extra compiler switches", () => {
    const args = buildAlcArgs({
      projectPath: PROJECT,
      packageCachePath: CACHE,
      outputPath: OUT,
      extraArgs: ["/warnaserror+", "/nowarn:AA0207"],
    });
    assert.deepEqual(args.slice(-2), ["/warnaserror+", "/nowarn:AA0207"]);
  });
});

describe("defaultOutputPath", () => {
  it("derives publisher_name_version.app under .output", () => {
    const result = defaultOutputPath(PROJECT, "alc", "BCCustomerScoring", "1.0.0.0");
    assert.equal(result, `C:\\proj\\al-src\\.output\\alc_BCCustomerScoring_1.0.0.0.app`);
  });

  it("sanitises unsafe characters in the package name", () => {
    const result = defaultOutputPath(PROJECT, "my publisher", "BC/Customer Scoring", "1.0.0.0");
    assert.ok(!result.includes(" "), "spaces must be stripped");
    assert.ok(!result.slice(result.lastIndexOf("\\")).includes("/"), "slashes must be stripped");
  });
});

describe("AlcRunner.run", () => {
  it("reports success and package metadata for a clean compile", async () => {
    const clock = createFakeClock();
    const { execFile } = createFakeExecFile(() => ({
      stdout: "0 Error(s)\nSuccessfully created package 'x.app'\n",
    }));

    const runner = new AlcRunner({
      execFile,
      now: clock.now,
      resolveAlcPath: () => "alc.exe",
      fileExists: () => true,
      fileSize: () => 4096,
    });

    const result = await runner.run({ projectPath: PROJECT, packageCachePath: CACHE, outputPath: OUT });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.timedOut, false);
    assert.equal(result.packageExists, true);
    assert.equal(result.packageSizeBytes, 4096);
    assert.equal(result.parsed.packagesEmitted, 1);
    assert.equal(result.command, "alc.exe");
    assert.deepEqual(result.args, [`/project:${PROJECT}`, `/packagecachepath:${CACHE}`, `/out:${OUT}`]);
  });

  it("reports failure and surfaces diagnostics when the compiler errors", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("exit 1"), { code: 1 }),
      stdout: "C:\\proj\\A.al(3,4): error AL1022: Bad name.\n1 Error(s)\n",
    }));

    const runner = new AlcRunner({
      execFile,
      now: createFakeClock().now,
      resolveAlcPath: () => "alc.exe",
      fileExists: () => false,
      fileSize: () => 0,
    });

    const result = await runner.run({ projectPath: PROJECT, packageCachePath: CACHE, outputPath: OUT });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
    assert.equal(result.packageExists, false);
    assert.equal(result.parsed.errors.length, 1);
    assert.equal(result.parsed.errors[0].code, "AL1022");
  });

  it("flags a timeout", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("killed"), { code: "ETIMEDOUT", killed: true }),
      stdout: "",
    }));

    const runner = new AlcRunner({
      execFile,
      now: createFakeClock().now,
      resolveAlcPath: () => "alc.exe",
      fileExists: () => false,
      fileSize: () => 0,
    });

    const result = await runner.run({
      projectPath: PROJECT,
      packageCachePath: CACHE,
      outputPath: OUT,
      timeoutMs: 5,
    });

    assert.equal(result.timedOut, true);
    assert.equal(result.success, false);
  });

  it("fails fast with a clear message when alc.exe cannot be found", async () => {
    const runner = new AlcRunner({
      execFile: () => { throw new Error("must not spawn"); },
      now: createFakeClock().now,
      resolveAlcPath: () => null,
    });

    const result = await runner.run({ projectPath: PROJECT, packageCachePath: CACHE });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, null);
    assert.match(result.stderr, /alc\.exe.*was not found/i);
  });

  it("passes the timeout, cwd and env through to the child process", async () => {
    const { execFile, calls } = createFakeExecFile(() => ({ stdout: "" }));

    const runner = new AlcRunner({
      execFile,
      now: createFakeClock().now,
      resolveAlcPath: () => "alc.exe",
      fileExists: () => false,
      fileSize: () => 0,
    });

    await runner.run({
      projectPath: PROJECT,
      packageCachePath: CACHE,
      timeoutMs: 1234,
      env: { ALC_EXTRA: "1" },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.timeout, 1234);
    assert.equal(calls[0].options.cwd, PROJECT);
    assert.equal(calls[0].options.env?.ALC_EXTRA, "1");
  });

  it("records a deterministic duration from the injected clock", async () => {
    const clock = createFakeClock(1000, 50);
    const { execFile } = createFakeExecFile(() => ({ stdout: "0 Error(s)\n" }));

    const runner = new AlcRunner({
      execFile,
      now: clock.now,
      resolveAlcPath: () => "alc.exe",
      fileExists: () => false,
      fileSize: () => 0,
    });

    const result = await runner.run({ projectPath: PROJECT, packageCachePath: CACHE });
    assert.equal(typeof result.durationMs, "number");
    assert.ok(result.durationMs >= 0);
  });
});