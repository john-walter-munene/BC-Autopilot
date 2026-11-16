/**
 * Playwright Runner (process boundary).
 * Phase 2: executes a real `playwright test` suite, reads the JSON report back, and
 * reports failure honestly — a non-zero exit code or a missing report is never a pass.
 */

import { execFile as nodeExecFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { PlaywrightRunDeps, PlaywrightRunOptions, PlaywrightRunResult } from '../al/al-cli-types.ts';
import {
  PLAYWRIGHT_REPORT_FILE,
  buildPlaywrightArgs,
  isPlaywrightReport,
  parsePlaywrightReport,
  summarisePlaywrightReport,
} from './playwright-report.ts';

const DEFAULT_TIMEOUT_MS = 600_000;
const MAX_BUFFER_BYTES = 32 * 1024 * 1024;
const DEFAULT_OUTPUT_DIR = 'test-results';

/**
 * Locate the Playwright CLI. The project installs `@playwright/test` locally, so
 * prefer the workspace binary; fall back to the global npx launcher.
 */
export function resolvePlaywrightPath(rootDir = process.cwd()): string | null {
  // Prefer the installed JS entry: executing it with this Node avoids a shell entirely.
  const entry = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  try {
    if (fs.existsSync(entry)) return entry;
  } catch {
    // fall through
  }

  const binary = process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const directory of pathEntries) {
    try {
      if (fs.existsSync(path.join(directory, binary))) return path.join(directory, binary);
    } catch {
      // keep searching unreadable PATH entries
    }
  }

  return null;
}

/**
 * Command + leading arguments for a resolved CLI.
 * `.cmd`/shell shims cannot be spawned by execFile (EINVAL on Windows), so JS entries
 * are run with the current Node binary.
 */
export function playwrightCommand(cliPath: string): { command: string; prefixArgs: string[] } {
  return cliPath.toLowerCase().endsWith('.js')
    ? { command: process.execPath, prefixArgs: [cliPath] }
    : { command: cliPath, prefixArgs: [] };
}

/**
 * Pull the JSON report out of captured stdout.
 * Playwright may prefix diagnostics before the report, so scan for the first `{` that
 * starts a document containing a `suites` array.
 */
export function extractJson(stdout: string): string | null {
  const trimmed = stdout.trim();

  const isReport = (value: unknown): boolean => {
    const candidate = value as { suites?: unknown; stats?: unknown } | null;
    return candidate !== null && typeof candidate === 'object' && Array.isArray(candidate.suites);
  };

  // Fast path: the whole output is the document.
  try {
    const whole: unknown = JSON.parse(trimmed);
    if (isReport(whole)) return trimmed;
  } catch {
    // diagnostics before or after the report
  }

  for (let index = trimmed.indexOf('{'); index !== -1; index = trimmed.indexOf('{', index + 1)) {
    const end = trimmed.lastIndexOf('}');
    if (end <= index) continue;
    const slice = trimmed.slice(index, end + 1);
    try {
      if (isReport(JSON.parse(slice))) return slice;
    } catch {
      // keep scanning
    }
  }

  return null;
}

export class PlaywrightRunner {
  private readonly deps: Required<Pick<PlaywrightRunDeps, 'execFile' | 'fileExists' | 'readFile' | 'now' | 'resolvePlaywrightPath' | 'rootDir'>>;

  constructor(deps: PlaywrightRunDeps = {}) {
    const rootDir = deps.rootDir ?? process.cwd();
    this.deps = {
      execFile: deps.execFile ?? (nodeExecFile as unknown as PlaywrightRunDeps['execFile'] & object),
      fileExists: deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath)),
      readFile: deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath, 'utf8')),
      now: deps.now ?? (() => Date.now()),
      resolvePlaywrightPath: deps.resolvePlaywrightPath ?? (() => resolvePlaywrightPath(rootDir)),
      rootDir,
    };
  }

  /**
   * Run a suite. Never throws for a failing suite — inspect `result.success`.
   */
  async run(options: PlaywrightRunOptions): Promise<PlaywrightRunResult> {
    const startedAt = this.deps.now();
    const outputDir = path.resolve(this.deps.rootDir, options.outputDir ?? DEFAULT_OUTPUT_DIR);
    const reportPath = path.join(outputDir, PLAYWRIGHT_REPORT_FILE);
    const args = buildPlaywrightArgs({ ...options, outputDir });

    const playwright = this.deps.resolvePlaywrightPath();
    const playwrightArgs = args;
    if (!playwright) {
      return this.result({
        startedAt,
        success: false,
        exitCode: null,
        command: 'playwright',
        args: playwrightArgs,
        stdout: '',
        stderr: 'Playwright was not found. Install it with `npm install` (it is a devDependency) and retry.',
        timedOut: false,
        report: null,
        reportPath,
        summary: 'Playwright was not found; no suite was executed.',
      });
    }

    const { command, prefixArgs } = playwrightCommand(playwright);
    const childArgs = [...prefixArgs, ...playwrightArgs];
    const { stdout, stderr, exitCode, timedOut, spawnFailed } = await this.spawn(command, childArgs, options);

    // A process that never started (EACCES, bad cwd) outranks any report left by an earlier run.
    if (spawnFailed) {
      const reason = stderr.trim() || `exit code ${exitCode}`;
      return this.result({
        startedAt,
        success: false,
        exitCode,
        command,
        args: childArgs,
        stdout,
        stderr: reason,
        timedOut,
        report: null,
        reportPath,
        summary: `Playwright could not be started: ${reason}`,
      });
    }

    // `--reporter json` writes to stdout. Prefer an on-disk report when a custom config emits one.
    const reportText = this.deps.fileExists(reportPath) ? this.deps.readFile(reportPath) : extractJson(stdout);

    if (reportText === null) {
      const why = timedOut
        ? `Playwright timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms and wrote no report.`
        : `Playwright exited with code ${exitCode} and produced no JSON report.`;
      return this.result({
        startedAt,
        success: false,
        exitCode,
        command,
        args: childArgs,
        stdout,
        stderr: stderr || why,
        timedOut,
        report: null,
        reportPath,
        summary: why,
      });
    }

    let parsed: ReturnType<typeof parsePlaywrightReport> | null = null;
    try {
      const raw: unknown = JSON.parse(reportText);
      if (!isPlaywrightReport(raw)) throw new Error('unexpected report shape');
      parsed = parsePlaywrightReport(raw);
    } catch (error) {
      const why = `Playwright report could not be parsed: ${error instanceof Error ? error.message : String(error)}`;
      return this.result({
        startedAt,
        success: false,
        exitCode,
        command,
        args: childArgs,
        stdout,
        stderr: stderr || why,
        timedOut,
        report: null,
        reportPath,
        summary: why,
      });
    }

    const success = exitCode === 0 && !timedOut && parsed.success;
    return this.result({
      startedAt,
      success,
      exitCode,
      command,
      args,
      stdout,
      stderr,
      timedOut,
      report: parsed,
      reportPath,
      summary: summarisePlaywrightReport(parsed),
    });
  }

  private result(input: {
    startedAt: number;
    success: boolean;
    exitCode: number | null;
    command: string;
    args: string[];
    stdout: string;
    stderr: string;
    timedOut: boolean;
    report: PlaywrightRunResult['report'];
    reportPath: string;
    summary: string;
  }): PlaywrightRunResult {
    const durationMs = this.deps.now() - input.startedAt;
    return {
      success: input.success,
      exitCode: input.exitCode,
      command: input.command,
      args: input.args,
      stdout: input.stdout,
      stderr: input.stderr,
      durationMs,
      timedOut: input.timedOut,
      report: input.report,
      reportPath: input.reportPath,
      summary: input.summary,
    };
  }

  private spawn(
    command: string,
    args: string[],
    options: PlaywrightRunOptions
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; spawnFailed: boolean }> {
    return new Promise(resolve => {
      let settled = false;
      const finish = (payload: {
        stdout: string;
        stderr: string;
        exitCode: number | null;
        timedOut: boolean;
        spawnFailed?: boolean;
      }) => {
        if (settled) return;
        settled = true;
        resolve({ spawnFailed: false, ...payload });
      };

      const env: NodeJS.ProcessEnv = { ...process.env, ...(options.env ?? {}) };
      if (options.baseUrl) env.BC_WEB_URL = options.baseUrl;
      if (options.storageStatePath) env.PLAYWRIGHT_STORAGE_STATE = options.storageStatePath;

      try {
        this.deps.execFile(
          command,
          args,
          { cwd: options.cwd ?? this.deps.rootDir, timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS, env, maxBuffer: MAX_BUFFER_BYTES },
          (error, stdout, stderr) => {
            const err = error as (Error & { code?: number | string; killed?: boolean }) | null;
            finish({
              stdout: stdout ?? '',
              stderr: stderr ?? '',
              exitCode: typeof err?.code === 'number' ? err.code : err ? 1 : 0,
              timedOut: Boolean(err?.killed),
              // Spawn failures surface as ENOENT/EACCES strings rather than exit codes.
              spawnFailed: typeof err?.code === 'string',
            });
          }
        );
      } catch (error) {
        finish({
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          timedOut: false,
          spawnFailed: true,
        });
      }
    });
  }
}

export const playwrightRunner = new PlaywrightRunner();
