/**
 * Unit tests: Business Central container sandbox (BcContainerHelper).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ContainerSandboxService,
  buildNewContainerArgs,
  deriveContainerEndpoints,
  DEFAULT_DEV_SERVICE_PORT,
  DEFAULT_ODATA_PORT,
  DEFAULT_WEB_CLIENT_PORT,
} from "./container-sandbox.ts";
import { createFakeClock, createFakeExecFile } from "./test-helpers.ts";

describe("deriveContainerEndpoints", () => {
  it("derives web client, OData and dev service URLs from default ports", () => {
    const endpoints = deriveContainerEndpoints({});
    assert.equal(endpoints.webClientUrl, `http://localhost:${DEFAULT_WEB_CLIENT_PORT}/BC`);
    assert.equal(endpoints.odataUrl, `http://localhost:${DEFAULT_ODATA_PORT}/BC/ODataV4`);
    assert.equal(endpoints.devServiceUrl, `http://localhost:${DEFAULT_DEV_SERVICE_PORT}/BC/dev`);
  });

  it("respects custom ports", () => {
    const endpoints = deriveContainerEndpoints({ webClientPort: 9090, odataPort: 7047, devServicePort: 7046 });
    assert.equal(endpoints.webClientUrl, "http://localhost:9090/BC");
    assert.equal(endpoints.odataUrl, "http://localhost:7047/BC/ODataV4");
    assert.equal(endpoints.devServiceUrl, "http://localhost:7046/BC/dev");
  });
});

describe("buildNewContainerArgs", () => {
  it("builds a non-interactive PowerShell command", () => {
    const args = buildNewContainerArgs({ containerName: "bcserver" });
    assert.deepEqual(args.slice(0, 3), ["-NoProfile", "-NonInteractive", "-Command"]);
    assert.match(args[3], /^New-BcContainer /);
  });

  it("includes the container name", () => {
    assert.ok(buildNewContainerArgs({ containerName: "bcserver" })[3].includes("-containerName 'bcserver'"));
  });

  it("includes the artifact URL when supplied", () => {
    const cmd = buildNewContainerArgs({ containerName: "c", artifactUrl: "mcr.microsoft.com/businesscentral/sandbox:latest" })[3];
    assert.ok(cmd.includes("-artifactUrl 'mcr.microsoft.com/businesscentral/sandbox:latest'"));
  });

  it("includes the auth mode", () => {
    assert.ok(buildNewContainerArgs({ containerName: "c", auth: "UserPassword" })[3].includes("-auth 'UserPassword'"));
  });

  it("adds -accept_eula when requested", () => {
    assert.ok(buildNewContainerArgs({ containerName: "c", acceptEula: true })[3].includes("-accept_eula"));
    assert.ok(!buildNewContainerArgs({ containerName: "c" })[3].includes("-accept_eula"));
  });

  it("passes the port mappings", () => {
    const cmd = buildNewContainerArgs({ containerName: "c", webClientPort: 9090, odataPort: 7047, devServicePort: 7046 })[3];
    assert.ok(cmd.includes("-webClientPort 9090"));
    assert.ok(cmd.includes("-odataPort 7047"));
    assert.ok(cmd.includes("-devServicePort 7046"));
  });

  it("builds a credential object from username/password", () => {
    const cmd = buildNewContainerArgs({
      containerName: "c",
      credential: { username: "admin", password: "P@ss" },
    })[3];
    assert.ok(cmd.includes("New-Object PSCredential('admin'"));
    assert.ok(cmd.includes("ConvertTo-SecureString 'P@ss'"));
  });

  it("appends extra raw parameters", () => {
    const cmd = buildNewContainerArgs({ containerName: "c", extraParams: ["-useSSL", "-shortcuts None"] })[3];
    assert.ok(cmd.includes("-useSSL"));
    assert.ok(cmd.includes("-shortcuts None"));
  });
});

describe("ContainerSandboxService.provision", () => {
  it("succeeds and reports derived endpoints", async () => {
    const { execFile } = createFakeExecFile(() => ({ stdout: "Container bcserver successfully created.\n" }));
    const service = new ContainerSandboxService({
      execFile,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.provision({ containerName: "bcserver" });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.containerName, "bcserver");
    assert.equal(result.webClientUrl, `http://localhost:${DEFAULT_WEB_CLIENT_PORT}/BC`);
  });

  it("fails clearly when PowerShell is unavailable", async () => {
    const { execFile, calls } = createFakeExecFile(() => ({ stdout: "" }));
    const service = new ContainerSandboxService({
      execFile,
      now: createFakeClock().now,
      resolvePowershellPath: () => null,
    });

    const result = await service.provision({ containerName: "bcserver" });

    assert.equal(result.success, false);
    assert.match(result.stderr, /PowerShell was not found/i);
    assert.equal(calls.length, 0);
  });

  it("reports failure on a non-zero exit", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("exit 1"), { code: 1 }),
      stderr: "Docker image could not be pulled.",
    }));
    const service = new ContainerSandboxService({
      execFile,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.provision({ containerName: "bcserver" });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
  });

  it("flags a timeout", async () => {
    const { execFile } = createFakeExecFile(() => ({
      error: Object.assign(new Error("killed"), { code: "ETIMEDOUT", killed: true }),
    }));
    const service = new ContainerSandboxService({
      execFile,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const result = await service.provision({ containerName: "bcserver", timeoutMs: 1 });

    assert.equal(result.timedOut, true);
    assert.equal(result.success, false);
  });
});