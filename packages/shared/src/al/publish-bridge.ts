/**
 * Publish Bridge (`Publish-BcContainerApp`)
 * Phase 1: deploys a compiled `.app` package into a Business Central container with schema synchronisation.
 */

import { execFile as nodeExecFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePowershellPath } from './powershell.ts';
import type { PublishDeps, PublishRequest, PublishResult } from './al-cli-types.ts';

const DEFAULT_TIMEOUT_MS = 600_000;
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

const INSTALLED_PATTERN = /(app (?:was )?(?:successfully )?(?:published|installed|upgraded)|successfully (?:published|installed|upgraded)|operation completed successfully)/i;
const SYNC_PATTERN = /(synchroni[sz]\w*|schema (?:was )?sync\w*)/i;

/**
 * Resolve the PowerShell executable: pwsh (PowerShell 7) first, then Windows PowerShell.
 */

/**
 * Build the PowerShell argument vector for `Publish-BcContainerApp`.
 */
export function buildPublishArgs(request: PublishRequest): string[] {
  const args = ['-NoProfile', '-NonInteractive', '-Command'];

  const parts: string[] = [];
  if (request.containerName) {
    parts.push(`-containerName '${request.containerName.replace(/'/g, "''")}'`);
  }
  parts.push(`-appFile '${request.appPath.replace(/'/g, "''")}'`);
  if (request.serverInstance) {
    parts.push(`-serverInstance '${request.serverInstance.replace(/'/g, "''")}'`);
  }
  if (request.sync) parts.push('-sync');
  if (request.skipVerification) parts.push('-skipVerification');
  if (request.install) parts.push('-install');
  if (request.force) parts.push('-force');

  args.push(`Publish-BcContainerApp ${parts.join(' ')}`);
  return args;
}

export class PublishService {
  private readonly deps: Required<Pick<PublishDeps, 'execFile' | 'fileExists' | 'now' | 'resolvePowershellPath'>>;

  constructor(deps: PublishDeps = {}) {
    this.deps = {
      execFile: deps.execFile ?? (nodeExecFile as unknown as PublishDeps['execFile'] & object),
      fileExists: deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath)),
      now: deps.now ?? (() => Date.now()),
      resolvePowershellPath: deps.resolvePowershellPath ?? resolvePowershellPath,
    };
  }

  /**
   * Publish a compiled `.app` package to a Business Central container.
   * Never throws for publish failures — inspect `result.success`.
   */
  async publish(request: PublishRequest): Promise<PublishResult> {
    const startedAt = this.deps.now();
    const args = buildPublishArgs(request);
    const powershell = this.deps.resolvePowershellPath();

    if (!this.deps.fileExists(request.appPath)) {
      return {
        success: false,
        exitCode: null,
        command: powershell ?? 'powershell',
        args,
        stdout: '',
        stderr: `App package not found: ${request.appPath}`,
        durationMs: this.deps.now() - startedAt,
        timedOut: false,
        installed: false,
        schemaSynced: false,
      };
    }

    if (!powershell) {
      return {
        success: false,
        exitCode: null,
        command: 'powershell',
        args,
        stdout: '',
        stderr: 'PowerShell was not found. Install PowerShell 7 (pwsh) or run on Windows with BcContainerHelper.',
        durationMs: this.deps.now() - startedAt,
        timedOut: false,
        installed: false,
        schemaSynced: false,
      };
    }

    const { stdout, stderr, exitCode, timedOut } = await this.spawn(powershell, args, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const combined = `${stdout}\n${stderr}`;

    return {
      success: exitCode === 0 && !timedOut,
      exitCode,
      command: powershell,
      args,
      stdout,
      stderr,
      durationMs: this.deps.now() - startedAt,
      timedOut,
      installed: INSTALLED_PATTERN.test(combined),
      schemaSynced: SYNC_PATTERN.test(combined),
    };
  }

  private spawn(
    command: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
    return new Promise(resolve => {
      let settled = false;
      const finish = (payload: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }) => {
        if (settled) return;
        settled = true;
        resolve(payload);
      };

      try {
        this.deps.execFile(
          command,
          args,
          { timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES, env: process.env },
          (error, stdout, stderr) => {
            const err = error as (Error & { code?: number | string; killed?: boolean }) | null;
            finish({
              stdout: stdout ?? '',
              stderr: stderr ?? '',
              exitCode: typeof err?.code === 'number' ? err.code : err ? 1 : 0,
              timedOut: Boolean(err?.killed),
            });
          }
        );
      } catch (error) {
        finish({ stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: 1, timedOut: false });
      }
    });
  }
}

export const publishService = new PublishService();
