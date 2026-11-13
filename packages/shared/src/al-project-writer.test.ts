/**
 * Unit tests: AL project writer (app.json + .al materialisation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  AlProjectWriter,
  buildAppJson,
  sanitiseFileName,
} from "./al-project-writer.ts";
import type { AppJsonManifest, AlExtensionFile } from "./types.ts";

const MANIFEST: AppJsonManifest = {
  id: "b182d83e-7a91-4e4c-b519-75a89f928e12",
  name: "BCCustomerScoring",
  version: "1.0.0.0",
  runtime: "13.0",
  target: "Cloud",
  idRanges: [{ from: 50100, to: 50149 }],
};

const FILES: AlExtensionFile[] = [
  {
    fileName: "Customer.TableExt.al",
    objectType: "tableextension",
    objectId: 50100,
    codeContent: 'tableextension 50100 "Ext" extends Customer { }',
  },
  {
    fileName: "CustomerCard.PageExt.al",
    objectType: "pageextension",
    objectId: 50100,
    codeContent: 'pageextension 50100 "Ext" extends "Customer Card" { }',
  },
];

function createMemoryWriter() {
  const written = new Map<string, string>();
  const writer = new AlProjectWriter({
    mkdir: () => {},
    writeFile: (p: string, data: string) => { written.set(p, data); },
    readFile: (p: string) => {
      const v = written.get(p);
      if (!v) throw new Error(`ENOENT ${p}`);
      return v;
    },
    fileExists: (p: string) => written.has(p),
  });
  return { writer, written };
}

describe("buildAppJson", () => {
  it("carries id, name, version, runtime, target and idRanges from the manifest", () => {
    const app = buildAppJson(MANIFEST);
    assert.equal(app.id, MANIFEST.id);
    assert.equal(app.name, MANIFEST.name);
    assert.equal(app.version, MANIFEST.version);
    assert.equal(app.runtime, "13.0");
    assert.equal(app.target, "Cloud");
    assert.deepEqual(app.idRanges, [{ from: 50100, to: 50149 }]);
  });

  it("applies the default publisher when none is supplied", () => {
    assert.equal(buildAppJson(MANIFEST).publisher, "alc");
  });

  it("honours publisher, application and platform overrides", () => {
    const app = buildAppJson(MANIFEST, { publisher: "Contoso", application: "25.0.0.0", platform: "2.0.0.0" });
    assert.equal(app.publisher, "Contoso");
    assert.equal(app.application, "25.0.0.0");
    assert.equal(app.platform, "2.0.0.0");
  });

  it("includes the AppSource-required resourceExposurePolicy", () => {
    const policy = buildAppJson(MANIFEST).resourceExposurePolicy as Record<string, boolean>;
    assert.equal(policy.allowDownloadingSource, false);
    assert.equal(policy.includeSourceInSymbolFile, true);
  });
});

describe("sanitiseFileName", () => {
  it("leaves a clean name untouched", () => {
    assert.equal(sanitiseFileName("Customer.TableExt.al"), "Customer.TableExt.al");
  });

  it("strips directory traversal and separators", () => {
    assert.equal(sanitiseFileName("../../etc/passwd.al"), "passwd.al");
    assert.equal(sanitiseFileName("a\\b\\c.al"), "c.al");
  });

  it("replaces Windows-reserved characters", () => {
    assert.equal(sanitiseFileName('bad<>:"|?*.al'), "bad_______.al");
  });

  it("falls back to object.al for an empty name", () => {
    assert.equal(sanitiseFileName(""), "object.al");
  });
});

describe("AlProjectWriter.writeProject", () => {
  it("writes app.json and every AL file", () => {
    const { writer, written } = createMemoryWriter();
    const result = writer.writeProject({ manifest: MANIFEST, files: FILES, outDir: "/proj" });

    assert.equal(result.projectPath, path.resolve("/proj"));
    assert.equal(result.writtenFiles.length, 3);
    assert.ok(written.has(result.appJsonPath));
    assert.ok(written.has(path.join(path.resolve("/proj"), "Customer.TableExt.al")));
  });

  it("serialises app.json as valid, pretty-printed JSON", () => {
    const { writer, written } = createMemoryWriter();
    const result = writer.writeProject({ manifest: MANIFEST, files: FILES, outDir: "/proj" });
    const parsed = JSON.parse(written.get(result.appJsonPath)!);
    assert.equal(parsed.name, "BCCustomerScoring");
    assert.ok(written.get(result.appJsonPath)!.includes("\n  "));
  });

  it("writes file content verbatim", () => {
    const { writer, written } = createMemoryWriter();
    const result = writer.writeProject({ manifest: MANIFEST, files: FILES, outDir: "/proj" });
    assert.equal(written.get(path.join(result.projectPath, "Customer.TableExt.al")), FILES[0].codeContent);
  });

  it("deduplicates file names that collide case-insensitively", () => {
    const { writer } = createMemoryWriter();
    const dupes: AlExtensionFile[] = [
      { fileName: "A.al", objectType: "codeunit", codeContent: "one" },
      { fileName: "a.AL", objectType: "codeunit", codeContent: "two" },
    ];
    const result = writer.writeProject({ manifest: MANIFEST, files: dupes, outDir: "/proj" });
    assert.equal(result.writtenFiles.length, 2);
  });

  it("accepts a publisher override at write time", () => {
    const { writer, written } = createMemoryWriter();
    const result = writer.writeProject({
      manifest: MANIFEST,
      files: FILES,
      outDir: "/proj",
      publisher: "Contoso",
    });
    assert.equal(JSON.parse(written.get(result.appJsonPath)!).publisher, "Contoso");
  });

  it("reports the manifest it wrote", () => {
    const { writer } = createMemoryWriter();
    const result = writer.writeProject({ manifest: MANIFEST, files: FILES, outDir: "/proj" });
    assert.equal(result.manifest.name, MANIFEST.name);
  });
});