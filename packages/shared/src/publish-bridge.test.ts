/**
 * Unit tests: publish bridge (Publish-BcContainerApp).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublishService, buildPublishArgs } from "./publish-bridge.ts";
import { createFakeClock, createFakeExecFile } from "./test-helpers.ts";

const APP = "C:\\dist\\alc_BCCustomerScoring_1.0.0.0.app";

describe("buildPublishArgs", () => {
  it("builds a non-interactive PowerShell command", () => {
    const args = buildPublishArgs({ appPath: APP });
    assert.deepEqual(args.slice(0, 3), ["-NoProfile", "-NonInteractive", "-Command"]);
    assert.match(args[3], /^Publish-BcContainerApp /);
  });

  it("includes the app file", () => {
    assert.ok(buildPublishArgs({ appPath: APP })[3].includes(`-appFile '${APP}'`));
  });

  it("includes the container name when supplied", () => {
    assert.ok(buildPublishArgs({ appPath: APP, containerName: "bcserver" })[3].includes("-containerName 'bcserver'"));
  });

  it("adds -sync, -skipVerification, -install and -force switches", () => {
    const cmd = buildPublishArgs({
      appPath: APP,
      sync: true,
      skipVerification: true,
      install: true,
      force: true,
    })[3];
    assert.ok(cmd.includes("-sync"));
    assert.ok(cmd.includes("-skipVerification"));
    assert.ok(cmd.includes("-install"));
    assert.ok(cmd.includes("-force"));
  });

  it("omits optional switches by default", () => {
    const cmd = buildPublishArgs({ appPath: APP })[3];
    assert.ok(!cmd.includes("-sync"));
    assert.ok(!cmd.includes("-install"));
  });

  it("escapes single quotes in paths", () => {
    const cmd = buildPublishArgs({ appPath: "C:\\it's\\app.app" })[3];
    assert.ok(cmd.includes("it''s"));
  });
});

describe("PublishService.publish", () => {
  it("succeeds and detects install + schema sync", async () => {
    const { execFile } = createFakeExecFile(() => ({
      stdout: "Synchronizing schema...\nApp successfully published and installed.\n",
    }));
    const service = new PublishService({
      execFile,
      fileExists: () => true,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.publish({ appPath: APP });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.installed, true);
    assert.equal(result.schemaSynced, true);
  });

  it("fails when the package does not exist and does not spawn", async () => {
    const { execFile, calls } = createFakeExecFile(() => ({ stdout: "" }));
    const service = new PublishService({
      execFile,
      fileExists: () => false,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.publish({ appPath: APP });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, null);
    assert.match(result.stderr, /not found/i);
    assert.equal(calls.length, 0);
  });

  it("fails clearly when PowerShell is unavailable", async () => {
    const { execFile, calls } = createFakeExecFile(() => ({ stdout: "" }));
    const service = new PublishService({
      execFile,
      fileExists: () => true,
      now: createFakeClock().now,
      resolvePowershellPath: () => null,
    });

    const result = await service.publish({ appPath: APP });

    assert.equal(result.success, false);
    assert.match(result.stderr, /PowerShell was not found/i);
    assert.equal(calls.length, 0);
  });

  it("reports failure on a non-zero exit", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("exit 1"), { code: 1 }),
      stderr: "Dependency validation failed.",
    }));
    const service = new PublishService({
      execFile,
      fileExists: () => true,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.publish({ appPath: APP });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
    assert.equal(result.installed, false);
  });

  it("flags a timeout", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("killed"), { code: "ETIMEDOUT", killed: true }),
    }));
    const service = new PublishService({
      execFile,
      fileExists: () => true,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.publish({ appPath: APP, timeoutMs: 1 });

    assert.equal(result.timedOut, true);
    assert.equal(result.success, false);
  });
});