/**
 * Shared test helpers for the @bc-agent/shared suites.
 * Mirrors node-postgres `packages/pg/test/test-helper.js`.
 *
 * Suites live next to the module they cover (`al/*.test.ts`, `browser/*.test.ts`).
 * Anything reusable across domains — fakes, temp dirs, env scoping — belongs here.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

export interface FakeExecFileCall {
  file: string;
  args: string[];
  options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv; maxBuffer?: number };
}

export interface FakeExecFileResponse {
  error?: (Error & { code?: number | string; killed?: boolean; signal?: NodeJS.Signals }) | null;
  stdout?: string;
  stderr?: string;
}

export type FakeExecFileHandler = (call: FakeExecFileCall) => FakeExecFileResponse;

/** Build a deterministic execFile stub that records every invocation. */
export function createFakeExecFile(handler: FakeExecFileHandler) {
  const calls: FakeExecFileCall[] = [];
  const execFile = (
    file: string,
    args: string[],
    options: FakeExecFileCall["options"],
    callback: (error: FakeExecFileResponse["error"], stdout: string, stderr: string) => void
  ) => {
    const call: FakeExecFileCall = { file, args, options };
    calls.push(call);
    const response = handler(call);
    callback(response.error ?? null, response.stdout ?? "", response.stderr ?? "");
  };
  return { execFile, calls };
}

/** Build a deterministic clock that advances by a fixed step on every read. */
export function createFakeClock(start = 1_700_000_000_000, stepMs = 25) {
  let current = start;
  const now = () => {
    const value = current;
    current += stepMs;
    return value;
  };
  return { now, advance: (ms: number) => { current += ms; }, current: () => current };
}

/** Create a unique temporary directory. */
export function createTempDir(prefix = "bc-agent-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Run a callback with a temporary directory that is always removed afterwards. */
export async function withTempDir<T>(callback: (dir: string) => Promise<T> | T, prefix?: string): Promise<T> {
  const dir = createTempDir(prefix);
  try {
    return await callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Run a callback with scoped environment overrides, restoring previous values afterwards. */
export async function withEnv<T>(overrides: Record<string, string | undefined>, callback: () => Promise<T> | T): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(overrides)) {
    previous.set(key, process.env[key]);
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/**
 * The file-system path a fixture *string literal* refers to.
 * Lets tests express paths readably and still assert on real filesystem semantics:
 * `at("C:\\proj\\trace.zip")` is `"C:\\proj\\trace.zip"`, never a relative path.
 */
export function at(filePath: string): string {
  return filePath;
}

/** Write a file, creating parent directories as needed. */
export function writeFile(filePath: string, content: string | Buffer): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

/** List files in a directory (sorted), returning an empty array when missing. */
export function listDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort();
}
/**
 * node:test's built-in equivalents of pg's `helper.Suite`.
 *
 * `describe` + `it` are the only nesting primitives used across the repo, so new
 * domains inherit the same vocabulary instead of inventing their own runner.
 */
export const suites = { describe, it };

/**
 * Build an in-memory filesystem for services that take their file I/O by injection.
 *
 * Keys are absolute paths; both `/` and `\` separators are accepted. Every mutation is
 * recorded so a test can assert *what* was touched, not just the final state.
 */
export function createMemoryFileSystem(options: { dirs?: string[] } = {}) {
  const files = new Map<string, Buffer>();
  const dirs = new Set<string>(options.dirs ?? []);
  const writes: string[] = [];
  const removals: string[] = [];

  const normalise = (target: string) => path.normalize(target);

  return {
    files,
    dirs,
    writes,
    removals,
    deps: {
      readDir: (dir: string) => {
        const prefix = path.join(normalise(dir), path.sep);
        return [...files.keys()]
          .filter(file => file.startsWith(prefix))
          .map(file => file.slice(prefix.length))
          .filter(rest => rest.length > 0 && !rest.includes(path.sep))
          .sort();
      },
      readFile: (filePath: string) => {
        const value = files.get(normalise(filePath));
        if (!value) throw new Error(`ENOENT: ${filePath}`);
        return value;
      },
      readText: (filePath: string) => {
        const value = files.get(normalise(filePath));
        if (!value) throw new Error(`ENOENT: ${filePath}`);
        return value.toString("utf8");
      },
      writeFile: (filePath: string, data: string | Buffer) => {
        writes.push(normalise(filePath));
        files.set(normalise(filePath), typeof data === "string" ? Buffer.from(data, "utf8") : data);
      },
      mkdir: (dir: string) => {
        dirs.add(normalise(dir));
      },
      remove: (target: string) => {
        const resolved = normalise(target);
        removals.push(resolved);
        for (const key of [...files.keys()]) {
          if (key === resolved || key.startsWith(resolved + path.sep)) files.delete(key);
        }
        for (const key of [...dirs]) {
          if (key === resolved || key.startsWith(resolved + path.sep)) dirs.delete(key);
        }
      },
      exists: (target: string) => files.has(normalise(target)) || dirs.has(normalise(target)),
    },
  };
}
