/**
 * Shared test helpers for the @bc-agent/shared suites.
 * Mirrors node-postgres `packages/pg/test/test-helper.js`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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