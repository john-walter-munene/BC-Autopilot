/**
 * Business Central Container Sandbox (BcContainerHelper)
 * Phase 1: provisions a local Business Central Docker container and derives the
 * Web Client / OData / Developer Service endpoints the agent targets.
 */

import { execFile as nodeExecFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePowershellPath } from './powershell.ts';
import type {
  ContainerSandboxDeps,
  ContainerSandboxRequest,
  ContainerSandboxResult,
} from './al-cli-types.ts';

const DEFAULT_TIMEOUT_MS = 1_800_000;
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

export const DEFAULT_WEB_CLIENT_PORT = 8080;
export const DEFAULT_ODATA_PORT = 7048;
export const DEFAULT_DEV_SERVICE_PORT = 7049;


/**
 * Derive the endpoints exposed by a provisioned container.
 */
export function deriveContainerEndpoints(request: Pick<ContainerSandboxRequest, 'webClientPort' | 'odataPort' | 'devServicePort'>): {
  webClientUrl: string;
  odataUrl: string;
  devServiceUrl: string;
} {
  const webClientPort = request.webClientPort ?? DEFAULT_WEB_CLIENT_PORT;
  const odataPort = request.odataPort ?? DEFAULT_ODATA_PORT;
  const devServicePort = request.devServicePort ?? DEFAULT_DEV_SERVICE_PORT;

  return {
    webClientUrl: `http://localhost:${webClientPort}/BC`,
    odataUrl: `http://localhost:${odataPort}/BC/ODataV4`,
    devServiceUrl: `http://localhost:${devServicePort}/BC/dev`,
  };
}

/**
 * Build the PowerShell argument vector for `New-BcContainer`.
 */
export function buildNewContainerArgs(request: ContainerSandboxRequest): string[] {
  const args = ['-NoProfile', '-NonInteractive', '-Command'];
  const parts: string[] = [];

  parts.push(`-containerName '${request.containerName.replace(/'/g, "''")}'`);
  if (request.artifactUrl) {
    parts.push(`-artifactUrl '${request.artifactUrl.replace(/'/g, "''")}'`);
  }
  if (request.auth) {
    parts.push(`-auth '${request.auth}'`);
  }
  if (request.credential) {
    const username = request.credential.username.replace(/'/g, "''");
    const password = request.credential.password.replace(/'/g, "''");
    parts.push(`-credential (New-Object PSCredential('${username}', (ConvertTo-SecureString '${password}' -AsPlainText -Force)))`);
  }
  if (request.acceptEula) {
    parts.push('-accept_eula');
  }
  parts.push(`-webClientPort ${request.webClientPort ?? DEFAULT_WEB_CLIENT_PORT}`);
  parts.push(`-odataPort ${request.odataPort ?? DEFAULT_ODATA_PORT}`);
  parts.push(`-devServicePort ${request.devServicePort ?? DEFAULT_DEV_SERVICE_PORT}`);
  if (request.extraParams && request.extraParams.length > 0) {
    parts.push(...request.extraParams);
  }

  args.push(`New-BcContainer ${parts.join(' ')}`);
  return args;
}

export class ContainerSandboxService {
  private readonly deps: Required<Pick<ContainerSandboxDeps, 'execFile' | 'now' | 'resolvePowershellPath'>>;

  constructor(deps: ContainerSandboxDeps = {}) {
    this.deps = {
      execFile: deps.execFile ?? (nodeExecFile as unknown as ContainerSandboxDeps['execFile'] & object),
      now: deps.now ?? (() => Date.now()),
      resolvePowershellPath: deps.resolvePowershellPath ?? resolvePowershellPath,
    };
  }

  /**
   * Provision a Business Central container via BcContainerHelper.
   * Never throws for provisioning failures — inspect `result.success`.
   */
  async provision(request: ContainerSandboxRequest): Promise<ContainerSandboxResult> {
    const startedAt = this.deps.now();
    const args = buildNewContainerArgs(request);
    const endpoints = deriveContainerEndpoints(request);
    const powershell = this.deps.resolvePowershellPath();

    if (!powershell) {
      return {
        success: false,
        containerName: request.containerName,
        exitCode: null,
        command: 'powershell',
        args,
        stdout: '',
        stderr: 'PowerShell was not found. Install PowerShell 7 (pwsh) and the BcContainerHelper module.',
        durationMs: this.deps.now() - startedAt,
        timedOut: false,
        ...endpoints,
      };
    }

    const { stdout, stderr, exitCode, timedOut } = await this.spawn(powershell, args, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    return {
      success: exitCode === 0 && !timedOut,
      containerName: request.containerName,
      exitCode,
      command: powershell,
      args,
      stdout,
      stderr,
      durationMs: this.deps.now() - startedAt,
      timedOut,
      ...endpoints,
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

export const containerSandboxService = new ContainerSandboxService();
