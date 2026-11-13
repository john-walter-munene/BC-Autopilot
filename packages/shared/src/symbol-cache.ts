/**
 * Symbol Package Cache (`.alpackages`)
 * Phase 1: automated download, fingerprinting, and pruning of Microsoft symbol packages
 * (System Application, Base Application, Business Foundation) required by `alc.exe`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateSha256Fingerprint } from './crypto.ts';
import type {
  SymbolCacheManifest,
  SymbolCacheOptions,
  SymbolCacheSyncResult,
  SymbolPackage,
} from './al-cli-types.ts';

export const SYMBOL_CACHE_DIR_NAME = '.alpackages';
export const SYMBOL_CACHE_MANIFEST_NAME = 'symbol-cache.json';

/** `Publisher_Name_Version.app` — the standard AL symbol package naming convention */
const SYMBOL_PACKAGE_NAME = /^(?<publisher>[A-Za-z0-9]+)_(?<name>.+?)_(?<version>\d+\.\d+\.\d+\.\d+)\.app$/;

export interface SymbolPackageSource {
  fileName: string;
  /** Raw package bytes */
  content: Buffer | Uint8Array | string;
}

export interface SymbolCacheDeps {
  readDir?: (dir: string) => string[];
  readFile?: (filePath: string) => Buffer;
  writeFile?: (filePath: string, data: Buffer | string) => void;
  mkdir?: (dir: string) => void;
  removeFile?: (filePath: string) => void;
  fileExists?: (filePath: string) => boolean;
  now?: () => Date;
}

/**
 * Parse `Publisher_Name_Version.app` into its components.
 */
export function parseSymbolPackageName(fileName: string): Pick<SymbolPackage, 'publisher' | 'name' | 'version'> {
  const match = SYMBOL_PACKAGE_NAME.exec(fileName);
  if (!match?.groups) return {};
  return {
    publisher: match.groups.publisher,
    name: match.groups.name,
    version: match.groups.version,
  };
}

/**
 * Compute the SHA-256 fingerprint of package bytes.
 */
export function fingerprintPackage(content: Buffer | Uint8Array | string): string {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);
  return generateSha256Fingerprint(buffer.toString('base64'));
}

export class SymbolCacheService {
  private readonly deps: Required<SymbolCacheDeps>;

  constructor(deps: SymbolCacheDeps = {}) {
    this.deps = {
      readDir: deps.readDir ?? ((dir: string) => fs.readdirSync(dir)),
      readFile: deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath)),
      writeFile: deps.writeFile ?? ((filePath: string, data: Buffer | string) => fs.writeFileSync(filePath, data)),
      mkdir: deps.mkdir ?? ((dir: string) => fs.mkdirSync(dir, { recursive: true })),
      removeFile: deps.removeFile ?? ((filePath: string) => fs.rmSync(filePath, { force: true })),
      fileExists: deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath)),
      now: deps.now ?? (() => new Date()),
    };
  }

  /**
   * Ensure the `.alpackages` directory exists and return its absolute path.
   */
  ensureCacheDir(cachePath: string): string {
    const resolved = path.resolve(cachePath);
    this.deps.mkdir(resolved);
    return resolved;
  }

  /**
   * List the symbol packages currently present in the cache.
   */
  listPackages(cachePath: string): SymbolPackage[] {
    const resolved = path.resolve(cachePath);
    if (!this.deps.fileExists(resolved)) return [];

    return this.deps
      .readDir(resolved)
      .filter(fileName => fileName.toLowerCase().endsWith('.app'))
      .sort()
      .map(fileName => {
        const filePath = path.join(resolved, fileName);
        const content = this.deps.readFile(filePath);
        return {
          fileName,
          filePath,
          sizeBytes: content.byteLength,
          sha256: fingerprintPackage(content),
          ...parseSymbolPackageName(fileName),
        };
      });
  }

  /**
   * Write symbol packages into the cache. Existing packages with identical bytes are left untouched.
   */
  addPackages(cachePath: string, sources: SymbolPackageSource[]): SymbolCacheSyncResult {
    const resolved = this.ensureCacheDir(cachePath);
    const existing = new Map(this.listPackages(resolved).map(pkg => [pkg.fileName, pkg]));
    const added: SymbolPackage[] = [];
    const updated: SymbolPackage[] = [];
    const unchanged: SymbolPackage[] = [];

    for (const source of sources) {
      const buffer = typeof source.content === 'string' ? Buffer.from(source.content, 'utf8') : Buffer.from(source.content);
      const sha256 = fingerprintPackage(buffer);
      const filePath = path.join(resolved, source.fileName);
      const previous = existing.get(source.fileName);

      if (previous && previous.sha256 === sha256) {
        unchanged.push(previous);
        continue;
      }

      this.deps.writeFile(filePath, buffer);
      const pkg: SymbolPackage = {
        fileName: source.fileName,
        filePath,
        sizeBytes: buffer.byteLength,
        sha256,
        ...parseSymbolPackageName(source.fileName),
      };

      if (previous) {
        updated.push(pkg);
      } else {
        added.push(pkg);
      }
      existing.set(source.fileName, pkg);
    }

    const manifest = this.writeManifest(resolved, Array.from(existing.values()));

    return {
      cachePath: resolved,
      added,
      updated,
      unchanged,
      removed: [],
      manifest,
    };
  }

  /**
   * Prune packages that are not in the allow-list (used to keep the cache aligned with the target release wave).
   */
  prune(cachePath: string, keep: string[]): string[] {
    const resolved = path.resolve(cachePath);
    const keepSet = new Set(keep);
    const removed: string[] = [];

    for (const pkg of this.listPackages(resolved)) {
      if (!keepSet.has(pkg.fileName)) {
        this.deps.removeFile(pkg.filePath);
        removed.push(pkg.fileName);
      }
    }

    if (removed.length > 0) {
      this.writeManifest(resolved, this.listPackages(resolved));
    }

    return removed;
  }

  /**
   * Synchronise the cache: add/update the supplied packages, then optionally prune everything else.
   */
  sync(options: SymbolCacheOptions, sources: SymbolPackageSource[]): SymbolCacheSyncResult {
    const result = this.addPackages(options.cachePath, sources);
    if (options.keep && options.keep.length > 0) {
      result.removed = this.prune(options.cachePath, options.keep);
      result.manifest = this.writeManifest(path.resolve(options.cachePath), this.listPackages(options.cachePath));
    }
    return result;
  }

  /**
   * Read the cache manifest, or build one from the directory contents when absent.
   */
  readManifest(cachePath: string): SymbolCacheManifest {
    const resolved = path.resolve(cachePath);
    const manifestPath = path.join(resolved, SYMBOL_CACHE_MANIFEST_NAME);

    if (this.deps.fileExists(manifestPath)) {
      try {
        const parsed = JSON.parse(this.deps.readFile(manifestPath).toString('utf8')) as SymbolCacheManifest;
        if (parsed && Array.isArray(parsed.packages)) {
          return { ...parsed, cachePath: resolved };
        }
      } catch {
        // Fall through and rebuild the manifest from disk.
      }
    }

    return {
      cachePath: resolved,
      updatedAt: this.deps.now().toISOString(),
      packages: this.listPackages(resolved),
    };
  }

  private writeManifest(cachePath: string, packages: SymbolPackage[]): SymbolCacheManifest {
    const manifest: SymbolCacheManifest = {
      cachePath,
      updatedAt: this.deps.now().toISOString(),
      packages: [...packages].sort((a, b) => a.fileName.localeCompare(b.fileName)),
    };
    this.deps.writeFile(path.join(cachePath, SYMBOL_CACHE_MANIFEST_NAME), JSON.stringify(manifest, null, 2));
    return manifest;
  }
}

export const symbolCacheService = new SymbolCacheService();
