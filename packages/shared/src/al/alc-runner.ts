/**
 * AL Compiler CLI Runner (`alc.exe`)
 * Phase 1: executes the official Microsoft AL Language compiler as a background child process,
 * captures stdout/stderr, and feeds structured diagnostics back into the agent reflection loop.
 */

import { execFile as nodeExecFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseAlcOutput } from './alc-output-parser.ts';
import type { AlcRunOptions, AlcRunResult, AlcRunnerDeps } from './al-cli-types.ts';

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

/**
 * Resolve the alc.exe executable.
 * Order: explicit path -> ALC_PATH env var -> PATH lookup -> null.
 */
export function resolveAlcPath(explicitPath?: string): string | null {
  const candidate = explicitPath ?? process.env.ALC_PATH;
  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }

  const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const executableNames = process.platform === 'win32' ? ['alc.exe', 'alc'] : ['alc', 'alc.exe'];

  for (const entry of pathEntries) {
    for (const name of executableNames) {
      const fullPath = path.join(entry, name);
      try {
        if (fs.existsSync(fullPath)) return fullPath;
      } catch {
        // Ignore unreadable PATH entries and keep searching.
      }
    }
  }

  return null;
}

/**
 * Derive the default output package path: `<project>/.output/<publisher>_<name>_<version>.app`.
 */
export function defaultOutputPath(projectPath: string, publisher: string, name: string, version: string): string {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9._-]/g, '');
  return path.join(projectPath, '.output', `${safe(publisher)}_${safe(name)}_${safe(version)}.app`);
}

/**
 * Build the alc.exe argument vector for a project.
 */
export function buildAlcArgs(options: Pick<AlcRunOptions, 'projectPath' | 'packageCachePath' | 'outputPath' | 'extraArgs'>): string[] {
  const args = [
    `/project:${options.projectPath}`,
    `/packagecachepath:${options.packageCachePath}`,
  ];
  if (options.outputPath) {
    args.push(`/out:${options.outputPath}`);
  }
  if (options.extraArgs && options.extraArgs.length > 0) {
    args.push(...options.extraArgs);
  }
  return args;
}

export class AlcRunner {
  private readonly deps: Required<Pick<AlcRunnerDeps, 'execFile' | 'fileExists' | 'fileSize' | 'now' | 'resolveAlcPath'>>;

  constructor(deps: AlcRunnerDeps = {}) {
    this.deps = {
      execFile: deps.execFile ?? (nodeExecFile as unknown as AlcRunnerDeps['execFile'] & object),
      fileExists: deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath)),
      fileSize: deps.fileSize ?? ((filePath: string) => fs.statSync(filePath).size),
      now: deps.now ?? (() => Date.now()),
      resolveAlcPath: deps.resolveAlcPath ?? resolveAlcPath,
    };
  }

  /**
   * Run `alc.exe` against an AL project folder.
   * Never throws for compiler failures — inspect `result.success` and `result.parsed`.
   */
  async run(options: AlcRunOptions): Promise<AlcRunResult> {
    const alcPath = this.deps.resolveAlcPath(options.alcPath);
    const args = buildAlcArgs(options);
    const outputPath = options.outputPath ?? '';
    const startedAt = this.deps.now();

    if (!alcPath) {
      return {
        success: false,
        exitCode: null,
        signal: null,
        command: 'alc',
        args,
        stdout: '',
        stderr: 'AL compiler executable (alc.exe) was not found. Set ALC_PATH or pass --alc <path>.',
        durationMs: this.deps.now() - startedAt,
        timedOut: false,
        parsed: parseAlcOutput('', 'error: AL compiler executable (alc.exe) was not found.'),
        outputPath,
        packageExists: false,
        packageSizeBytes: 0,
      };
    }

    const { stdout, stderr, exitCode, signal, timedOut } = await this.spawn(alcPath, args, options);
    const durationMs = this.deps.now() - startedAt;
    const parsed = parseAlcOutput(stdout, stderr);

    let packageExists = false;
    let packageSizeBytes = 0;
    if (outputPath) {
      try {
        packageExists = this.deps.fileExists(outputPath);
        if (packageExists) packageSizeBytes = this.deps.fileSize(outputPath);
      } catch {
        packageExists = false;
      }
    }

    const success = exitCode === 0 && !timedOut && parsed.success;

    return {
      success,
      exitCode,
      signal,
      command: alcPath,
      args,
      stdout,
      stderr,
      durationMs,
      timedOut,
      parsed,
      outputPath,
      packageExists,
      packageSizeBytes,
    };
  }

  private spawn(
    alcPath: string,
    args: string[],
    options: AlcRunOptions
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null; signal: NodeJS.Signals | null; timedOut: boolean }> {
    return new Promise(resolve => {
      let settled = false;
      const finish = (payload: { stdout: string; stderr: string; exitCode: number | null; signal: NodeJS.Signals | null; timedOut: boolean }) => {
        if (settled) return;
        settled = true;
        resolve(payload);
      };

      try {
        this.deps.execFile(
          alcPath,
          args,
          {
            cwd: options.cwd ?? options.projectPath,
            timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            env: { ...process.env, ...(options.env ?? {}) },
            maxBuffer: MAX_BUFFER_BYTES,
          },
          (error, stdout, stderr) => {
            const err = error as (Error & { code?: number | string; killed?: boolean; signal?: NodeJS.Signals }) | null;
            const numericCode = typeof err?.code === 'number' ? err.code : err ? 1 : 0;
            finish({
              stdout: stdout ?? '',
              stderr: stderr ?? '',
              exitCode: numericCode,
              signal: (err?.signal as NodeJS.Signals | undefined) ?? null,
              timedOut: Boolean(err?.killed),
            });
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        finish({ stdout: '', stderr: message, exitCode: 1, signal: null, timedOut: false });
      }
    });
  }
}

export const alcRunner = new AlcRunner();
