/**
 * Unit tests: Phase 1 pipeline (write -> compile -> optional publish -> seal).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Phase1Pipeline } from "./al-pipeline.ts";
import { AlProjectWriter } from "./al-project-writer.ts";
import { AlcRunner } from "./alc-runner.ts";
import { PublishService } from "./publish-bridge.ts";
import { generateSha256Fingerprint } from "./crypto.ts";
import type { AppJsonManifest, AlExtensionFile } from "./types.ts";
import { createFakeClock, createFakeExecFile } from "./test-helpers.ts";

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

const PROJECT_DIR = "C:\\proj\\al-src";
const CACHE = "C:\\proj\\.alpackages";
const OUT = path.join(path.resolve(PROJECT_DIR), ".output", "alc_BCCustomerScoring_1.0.0.0.app");

function buildPipeline(opts: {
  alcStdout?: string;
  alcError?: (Error & { code?: number | string; killed?: boolean }) | null;
  packageBytes?: Buffer | null;
  publishStdout?: string;
}) {
  const written = new Map<string, string>();
  const writer = new AlProjectWriter({
    mkdir: () => {},
    writeFile: (p: string, d: string) => { written.set(p, d); },
    readFile: (p: string) => written.get(p) ?? "",
    fileExists: (p: string) => written.has(p),
  });

  const clock = createFakeClock();
  const { execFile: alcExec } = createFakeExecFile(() => ({
    stdout: opts.alcStdout ?? "0 Error(s)\nSuccessfully created package 'x.app'\n",
    error: opts.alcError ?? null,
  }));
  const runner = new AlcRunner({
    execFile: alcExec,
    now: clock.now,
    resolveAlcPath: () => "alc.exe",
    fileExists: () => opts.packageBytes !== null,
    fileSize: () => opts.packageBytes?.length ?? 0,
  });

  const { execFile: psExec } = createFakeExecFile(() => ({
    stdout: opts.publishStdout ?? "App successfully published and installed.\nSynchronizing schema...\n",
  }));
  const publisher = new PublishService({
    execFile: psExec,
    fileExists: () => true,
    now: clock.now,
    resolvePowershellPath: () => "pwsh",
  });

  const pipeline = new Phase1Pipeline({
    writer,
    runner,
    publisher,
    fileExists: (p: string) => p === OUT && opts.packageBytes !== null,
    readFile: () => opts.packageBytes ?? Buffer.from(""),
  });

  return { pipeline, written };
}

describe("Phase1Pipeline.execute", () => {
  it("writes the project, compiles it, and reports success", async () => {
    const { pipeline, written } = buildPipeline({ packageBytes: Buffer.from("PKG") });

    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
    });

    assert.equal(result.success, true);
    assert.equal(result.compile.success, true);
    assert.equal(result.project.writtenFiles.length, 2);
    assert.ok(written.has(path.join(path.resolve(PROJECT_DIR), "app.json")));
    assert.equal(result.project.manifest.name, "BCCustomerScoring");
  });

  it("passes the symbol cache path to the compiler", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });

    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
    });

    assert.ok(result.compile.args.includes(`/packagecachepath:${path.resolve(CACHE)}`));
  });

  it("does not publish when no publish request is given", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });
    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
    });
    assert.equal(result.publish, undefined);
  });

  it("publishes after a successful compile when requested", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });
    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
      publish: { containerName: "bcserver", sync: true },
    });

    assert.equal(result.publish?.success, true);
    assert.equal(result.publish?.installed, true);
    assert.equal(result.success, true);
  });

  it("does not publish when the compile fails", async () => {
    const { pipeline } = buildPipeline({
      packageBytes: null,
      alcStdout: "C:\\A.al(1,1): error AL1022: Bad.\n1 Error(s)\n",
      alcError: Object.assign(new Error("exit 1"), { code: 1 }),
    });

    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
      publish: { containerName: "bcserver" },
    });

    assert.equal(result.success, false);
    assert.equal(result.publish, undefined);
    assert.equal(result.compile.parsed.errors.length, 1);
  });

  it("reports overall failure when the publish step fails", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });
    // Force publish failure by pointing at a non-existent container app via a failing publisher.
    const failingPublisher = new PublishService({
      execFile: createFakeExecFile(() => ({
        error: Object.assign(new Error("exit 1"), { code: 1 }),
        stderr: "publish failed",
      })).execFile,
      fileExists: () => true,
      now: createFakeClock().now,
      resolvePowershellPath: () => "pwsh",
    });

    const pipelineWithFailure = new Phase1Pipeline({
      writer: new AlProjectWriter({
        mkdir: () => {},
        writeFile: () => {},
        readFile: () => "",
        fileExists: () => true,
      }),
      runner: new AlcRunner({
        execFile: createFakeExecFile(() => ({ stdout: "0 Error(s)\nSuccessfully created package 'x.app'\n" })).execFile,
        now: createFakeClock().now,
        resolveAlcPath: () => "alc.exe",
        fileExists: () => true,
        fileSize: () => 3,
      }),
      publisher: failingPublisher,
      fileExists: () => true,
      readFile: () => Buffer.from("PKG"),
    });

    const result = await pipelineWithFailure.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
      publish: { containerName: "bcserver" },
    });

    assert.equal(result.compile.success, true);
    assert.equal(result.publish?.success, false);
    assert.equal(result.success, false);
    void pipeline;
  });

  it("seals the package bytes with a SHA-256 fingerprint", async () => {
    const pkg = Buffer.from("PKG-CONTENT");
    const { pipeline } = buildPipeline({ packageBytes: pkg });

    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
    });

    assert.equal(result.fingerprint, generateSha256Fingerprint(pkg.toString("base64")));
    assert.match(result.fingerprint, /^[0-9a-f]{64}$/);
  });

  it("falls back to a project fingerprint when no package exists", async () => {
    const { pipeline } = buildPipeline({
      packageBytes: null,
      alcStdout: "C:\\A.al(1,1): error AL1022: Bad.\n",
      alcError: Object.assign(new Error("exit 1"), { code: 1 }),
    });

    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
    });

    const expected = generateSha256Fingerprint(
      JSON.stringify(MANIFEST) + FILES.map(f => f.codeContent).join("\n")
    );
    assert.equal(result.fingerprint, expected);
  });

  it("is deterministic for identical inputs", async () => {
    const pkg = Buffer.from("SAME");
    const a = await buildPipeline({ packageBytes: pkg }).pipeline.execute({
      manifest: MANIFEST, files: FILES, projectDir: PROJECT_DIR, symbolCachePath: CACHE,
    });
    const b = await buildPipeline({ packageBytes: pkg }).pipeline.execute({
      manifest: MANIFEST, files: FILES, projectDir: PROJECT_DIR, symbolCachePath: CACHE,
    });
    assert.equal(a.fingerprint, b.fingerprint);
  });

  it("honours an explicit output path", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });
    const explicit = "C:\\dist\\my.app";
    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
      outputPath: explicit,
    });
    assert.equal(result.compile.outputPath, explicit);
    assert.ok(result.compile.args.includes(`/out:${explicit}`));
  });

  it("forwards extra compiler switches", async () => {
    const { pipeline } = buildPipeline({ packageBytes: Buffer.from("PKG") });
    const result = await pipeline.execute({
      manifest: MANIFEST,
      files: FILES,
      projectDir: PROJECT_DIR,
      symbolCachePath: CACHE,
      extraArgs: ["/warnaserror+"],
    });
    assert.ok(result.compile.args.includes("/warnaserror+"));
  });
});