/**
 * Unit tests: symbol package cache (`.alpackages`).
 * Uses an in-memory filesystem so no real disk is touched.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  fingerprintPackage,
  parseSymbolPackageName,
  SymbolCacheService,
  SYMBOL_CACHE_MANIFEST_NAME,
} from "./symbol-cache.ts";

/** Minimal in-memory filesystem for the cache service. */
function createMemoryFs() {
  const files = new Map<string, Buffer>();
  const dirs = new Set<string>();
  return {
    files,
    dirs,
    deps: {
      readDir: (dir: string) => {
        const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
        return [...files.keys()]
          .filter(f => f.startsWith(prefix))
          .map(f => f.slice(prefix.length))
          .filter(rest => rest.length > 0 && !rest.includes(path.sep));
      },
      readFile: (p: string) => {
        const value = files.get(p);
        if (!value) throw new Error(`ENOENT: ${p}`);
        return value;
      },
      writeFile: (p: string, data: Buffer | string) => {
        files.set(p, typeof data === "string" ? Buffer.from(data, "utf8") : data);
      },
      mkdir: (dir: string) => { dirs.add(dir); },
      removeFile: (p: string) => { files.delete(p); },
      fileExists: (p: string) => files.has(p) || dirs.has(p),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    },
  };
}

describe("parseSymbolPackageName", () => {
  it("parses publisher, name and version from the standard file name", () => {
    assert.deepEqual(parseSymbolPackageName("Microsoft_System Application_24.0.0.0.app"), {
      publisher: "Microsoft",
      name: "System Application",
      version: "24.0.0.0",
    });
  });

  it("parses multi-word application names", () => {
    const parsed = parseSymbolPackageName("Microsoft_Base Application_24.1.12345.0.app");
    assert.equal(parsed.name, "Base Application");
    assert.equal(parsed.version, "24.1.12345.0");
  });

  it("returns an empty object for non-conforming names", () => {
    assert.deepEqual(parseSymbolPackageName("random.app"), {});
    assert.deepEqual(parseSymbolPackageName("Microsoft_Thing.app"), {});
  });
});

describe("fingerprintPackage", () => {
  it("is deterministic for identical bytes", () => {
    assert.equal(fingerprintPackage(Buffer.from("abc")), fingerprintPackage(Buffer.from("abc")));
  });

  it("differs for different bytes", () => {
    assert.notEqual(fingerprintPackage(Buffer.from("abc")), fingerprintPackage(Buffer.from("abd")));
  });

  it("produces a 64-character hex fingerprint", () => {
    assert.match(fingerprintPackage(Buffer.from("abc")), /^[0-9a-f]{64}$/);
  });

  it("accepts string input", () => {
    assert.equal(fingerprintPackage("abc"), fingerprintPackage(Buffer.from("abc")));
  });
});

describe("SymbolCacheService", () => {
  it("creates missing packages and writes the manifest", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");

    const result = service.addPackages(cachePath, [
      { fileName: "Microsoft_System Application_24.0.0.0.app", content: "sys" },
    ]);

    assert.equal(result.added.length, 1);
    assert.equal(result.updated.length, 0);
    assert.equal(result.unchanged.length, 0);
    assert.equal(result.added[0].name, "System Application");
    assert.ok(fs.files.has(path.join(cachePath, SYMBOL_CACHE_MANIFEST_NAME)));
  });

  it("leaves identical packages unchanged on re-sync", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");
    const source = { fileName: "Microsoft_System Application_24.0.0.0.app", content: "sys" };

    service.addPackages(cachePath, [source]);
    const second = service.addPackages(cachePath, [source]);

    assert.equal(second.added.length, 0);
    assert.equal(second.updated.length, 0);
    assert.equal(second.unchanged.length, 1);
  });

  it("updates a package when its bytes change", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");

    service.addPackages(cachePath, [{ fileName: "Microsoft_System Application_24.0.0.0.app", content: "v1" }]);
    const second = service.addPackages(cachePath, [
      { fileName: "Microsoft_System Application_24.0.0.0.app", content: "v2" },
    ]);

    assert.equal(second.updated.length, 1);
    assert.equal(second.added.length, 0);
  });

  it("lists packages with size and fingerprint metadata", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");
    service.addPackages(cachePath, [{ fileName: "Microsoft_Base Application_24.0.0.0.app", content: "base" }]);

    const packages = service.listPackages(cachePath);
    assert.equal(packages.length, 1);
    assert.equal(packages[0].sizeBytes, 4);
    assert.match(packages[0].sha256, /^[0-9a-f]{64}$/);
  });

  it("prunes packages that are not in the keep list", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");
    service.addPackages(cachePath, [
      { fileName: "Microsoft_System Application_24.0.0.0.app", content: "sys" },
      { fileName: "Microsoft_Base Application_24.0.0.0.app", content: "base" },
    ]);

    const removed = service.prune(cachePath, ["Microsoft_System Application_24.0.0.0.app"]);
    assert.deepEqual(removed, ["Microsoft_Base Application_24.0.0.0.app"]);
    assert.equal(service.listPackages(cachePath).length, 1);
  });

  it("sync adds packages and prunes non-kept ones", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");
    service.addPackages(cachePath, [{ fileName: "Microsoft_Old Application_23.0.0.0.app", content: "old" }]);

    const result = service.sync(
      { cachePath, keep: ["Microsoft_System Application_24.0.0.0.app"] },
      [
        { fileName: "Microsoft_System Application_24.0.0.0.app", content: "sys" },
        { fileName: "Microsoft_Old Application_23.0.0.0.app", content: "old" },
      ]
    );

    assert.equal(result.added.length, 1);
    assert.deepEqual(result.removed, ["Microsoft_Old Application_23.0.0.0.app"]);
    assert.equal(result.manifest.packages.length, 1);
  });

  it("returns an empty list when the cache directory is absent", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    assert.deepEqual(service.listPackages(path.resolve("/missing")), []);
  });

  it("rebuilds the manifest when it is corrupt", () => {
    const fs = createMemoryFs();
    const service = new SymbolCacheService(fs.deps);
    const cachePath = path.resolve("/cache/.alpackages");
    fs.dirs.add(cachePath);
    fs.files.set(path.join(cachePath, SYMBOL_CACHE_MANIFEST_NAME), Buffer.from("{not json"));
    fs.files.set(path.join(cachePath, "Microsoft_System Application_24.0.0.0.app"), Buffer.from("sys"));

    const manifest = service.readManifest(cachePath);
    assert.equal(manifest.packages.length, 1);
  });
});