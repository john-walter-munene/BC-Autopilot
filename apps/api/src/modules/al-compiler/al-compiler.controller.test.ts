/**
 * Unit tests: AL compiler controller (transport boundary).
 * Verifies delegation to the shared pipeline without spawning processes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AlCompilerController } from "./al-compiler.controller.ts";
import { Phase1Pipeline } from "@bc-agent/shared";
import { AlProjectWriter } from "@bc-agent/shared";
import { AlcRunner } from "@bc-agent/shared";
import { PublishService } from "@bc-agent/shared";
import { SymbolCacheService } from "@bc-agent/shared";
import type { AppJsonManifest, AlExtensionFile } from "@bc-agent/shared";
import { createFakeClock, createFakeExecFile } from "../../../../../packages/shared/src/test-helpers.ts";

const MANIFEST: AppJsonManifest = {
  id: "b182d83e-7a91-4e4c-b519-75a89f928e12",
  name: "BCCustomerScoring",
  version: "1.0.0.0",
  runtime: "13.0",
  target: "Cloud",
  idRanges: [{ from: 50100, to: 50149 }],
};

const FILES: AlExtensionFile[] = [
  { fileName: "Customer.TableExt.al", objectType: "tableextension", objectId: 50100, codeContent: "tableextension 50100 \"Ext\" extends Customer { }" },
];

function buildController() {
  const clock = createFakeClock();
  const writer = new AlProjectWriter({
    mkdir: () => {},
    writeFile: () => {},
    readFile: () => "",
    fileExists: () => true,
  });
  const runner = new AlcRunner({
    execFile: createFakeExecFile(() => ({ stdout: "0 Error(s)\nSuccessfully created package 'x.app'\n" })).execFile,
    now: clock.now,
    resolveAlcPath: () => "alc.exe",
    fileExists: () => true,
    fileSize: () => 3,
  });
  const publisher = new PublishService({
    execFile: createFakeExecFile(() => ({ stdout: "App successfully published and installed.\n" })).execFile,
    fileExists: () => true,
    now: clock.now,
    resolvePowershellPath: () => "pwsh",
  });
  const pipeline = new Phase1Pipeline({
    writer,
    runner,
    publisher,
    fileExists: () => true,
    readFile: () => Buffer.from("PKG"),
  });
  const controller = new AlCompilerController({
    pipeline,
    publisher,
    symbols: new SymbolCacheService({
      readDir: () => [],
      readFile: () => Buffer.from(""),
      writeFile: () => {},
      mkdir: () => {},
      removeFile: () => {},
      fileExists: () => true,
      now: () => new Date("2026-01-01"),
    }),
  });
  return { controller };
}

describe("AlCompilerController.compile", () => {
  it("delegates to the pipeline and returns its result", async () => {
    const { controller } = buildController();
    const result = await controller.compile({
      manifest: MANIFEST,
      files: FILES,
      projectDir: "C:\\proj",
      symbolCachePath: "C:\\proj\\.alpackages",
    });

    assert.equal(result.compile.success, true);
    assert.match(result.fingerprint, /^[0-9a-f]{64}$/);
  });

  it("passes publish requests through", async () => {
    const { controller } = buildController();
    const result = await controller.compile({
      manifest: MANIFEST,
      files: FILES,
      projectDir: "C:\\proj",
      symbolCachePath: "C:\\proj\\.alpackages",
      publish: { containerName: "bcserver" },
    });
    assert.equal(result.publish?.success, true);
  });
});

describe("AlCompilerController.publish", () => {
  it("returns the publish result", async () => {
    const { controller } = buildController();
    const result = await controller.publish({ appPath: "C:\\dist\\app.app" });
    assert.equal(result.success, true);
  });
});

describe("AlCompilerController.syncSymbols", () => {
  it("reports added packages", () => {
    const { controller } = buildController();
    const result = controller.syncSymbols("C:\\cache", []);
    assert.equal(result.added.length, 0);
    assert.equal(result.removed.length, 0);
  });
});