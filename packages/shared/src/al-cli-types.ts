/**
 * AL Compiler CLI (`alc.exe`) Domain Types
 * Phase 1: physical compiler integration, symbol package caching, and publish bridge
 */

import type { AppJsonManifest, AlExtensionFile } from './types.ts';

export type AlcDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface AlcDiagnostic {
  /** Compiler diagnostic code, e.g. AL0666, AA0207, AL1022 */
  code: string;
  severity: AlcDiagnosticSeverity;
  message: string;
  /** Absolute or project-relative path reported by the compiler */
  file?: string;
  line?: number;
  column?: number;
  /** Raw compiler line that produced this diagnostic */
  raw: string;
}

export interface AlcParseResult {
  diagnostics: AlcDiagnostic[];
  errors: AlcDiagnostic[];
  warnings: AlcDiagnostic[];
  infos: AlcDiagnostic[];
  /** True when the compiler reported no error-severity diagnostics */
  success: boolean;
  /** Number of `.app` packages the compiler reported as emitted */
  packagesEmitted: number;
  /** Unrecognised output lines, preserved for the reflection loop */
  unparsedLines: string[];
}

export interface AlcRunOptions {
  /** Path to the AL project folder (the folder containing app.json) */
  projectPath: string;
  /** Path to the symbol package cache (`.alpackages`) */
  packageCachePath: string;
  /** Output `.app` path. Defaults to `<projectPath>/.output/<publisher>_<name>_<version>.app` */
  outputPath?: string;
  /** Path to alc.exe. Defaults to ALC_PATH env var, then PATH lookup */
  alcPath?: string;
  /** Additional raw compiler switches, e.g. ['/warnaserror+'] */
  extraArgs?: string[];
  /** Working directory for the child process */
  cwd?: string;
  /** Hard timeout in milliseconds (default 120000) */
  timeoutMs?: number;
  /** Environment overrides for the child process */
  env?: Record<string, string>;
}

export interface AlcRunResult {
  success: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  parsed: AlcParseResult;
  outputPath: string;
  /** True when the output `.app` file exists on disk after the run */
  packageExists: boolean;
  packageSizeBytes: number;
}

export interface AlcRunnerDeps {
  /** Injectable process spawner (defaults to node:child_process.execFile) */
  execFile?: (
    file: string,
    args: string[],
    options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv; maxBuffer?: number },
    callback: (error: (Error & { code?: number | string; killed?: boolean }) | null, stdout: string, stderr: string) => void
  ) => unknown;
  /** Injectable filesystem probe (defaults to node:fs) */
  fileExists?: (filePath: string) => boolean;
  fileSize?: (filePath: string) => number;
  /** Injectable clock for deterministic duration assertions */
  now?: () => number;
  /** Injectable PATH resolver for alc.exe discovery */
  resolveAlcPath?: (explicitPath?: string) => string | null;
}

export interface SymbolPackage {
  /** File name of the `.app` symbol package */
  fileName: string;
  /** Absolute path on disk */
  filePath: string;
  /** Size in bytes */
  sizeBytes: number;
  /** SHA-256 fingerprint of the package bytes */
  sha256: string;
  /** Publisher parsed from the package file name, when available */
  publisher?: string;
  /** Application name parsed from the package file name, when available */
  name?: string;
  /** Version parsed from the package file name, when available */
  version?: string;
}

export interface SymbolCacheManifest {
  cachePath: string;
  updatedAt: string;
  packages: SymbolPackage[];
}

export interface SymbolCacheOptions {
  /** Directory that holds the `.alpackages` folder */
  cachePath: string;
  /** Optional allow-list of file names to keep (others are pruned) */
  keep?: string[];
}

export interface SymbolCacheSyncResult {
  cachePath: string;
  added: SymbolPackage[];
  updated: SymbolPackage[];
  unchanged: SymbolPackage[];
  removed: string[];
  manifest: SymbolCacheManifest;
}

export interface AlProjectWriteRequest {
  manifest: AppJsonManifest;
  files: AlExtensionFile[];
  /** Target directory for the AL project */
  outDir: string;
  /** Optional publisher override written into app.json */
  publisher?: string;
  /** Optional application version override written into app.json */
  application?: string;
  /** Optional platform version override written into app.json */
  platform?: string;
}

export interface AlProjectWriteResult {
  projectPath: string;
  appJsonPath: string;
  writtenFiles: string[];
  manifest: AppJsonManifest;
}

export interface PublishRequest {
  /** Path to the compiled `.app` package */
  appPath: string;
  /** Business Central container name (BcContainerHelper) */
  containerName?: string;
  /** Business Central server instance name (default: BC) */
  serverInstance?: string;
  /** Synchronise the schema after publishing */
  sync?: boolean;
  /** Skip verification during publish */
  skipVerification?: boolean;
  /** Install the app after publishing */
  install?: boolean;
  /** Force upgrade of an already installed app */
  force?: boolean;
  /** Path to the PowerShell executable (default: pwsh, then powershell) */
  powershellPath?: string;
  /** Hard timeout in milliseconds (default 600000) */
  timeoutMs?: number;
}

export interface PublishResult {
  success: boolean;
  exitCode: number | null;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  /** True when the publish output indicates the app was installed/upgraded */
  installed: boolean;
  /** True when the publish output indicates the schema was synchronised */
  schemaSynced: boolean;
}

export interface PublishDeps {
  execFile?: AlcRunnerDeps['execFile'];
  fileExists?: (filePath: string) => boolean;
  now?: () => number;
  resolvePowershellPath?: () => string | null;
}

export interface ContainerSandboxRequest {
  containerName: string;
  /** BC artifact URL or version tag, e.g. "24.0.0.0" or "bcartifacts/sandbox" */
  artifactUrl?: string;
  /** Authentication mode passed to New-BcContainer */
  auth?: 'UserPassword' | 'Windows' | 'NavUserPassword' | 'AAD';
  /** Credential object passed to New-BcContainer */
  credential?: { username: string; password: string };
  /** Accept the EULA (required for unattended provisioning) */
  acceptEula?: boolean;
  /** Expose the web client on this host port (default 8080) */
  webClientPort?: number;
  /** Expose the OData port on this host port (default 7048) */
  odataPort?: number;
  /** Expose the developer service port on this host port (default 7049) */
  devServicePort?: number;
  /** Additional raw PowerShell parameters, e.g. ['-useSSL'] */
  extraParams?: string[];
  /** Path to the PowerShell executable (default: pwsh, then powershell) */
  powershellPath?: string;
  /** Hard timeout in milliseconds (default 1800000) */
  timeoutMs?: number;
}

export interface ContainerSandboxResult {
  success: boolean;
  containerName: string;
  exitCode: number | null;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  /** Web client URL derived from the exposed port */
  webClientUrl: string;
  /** OData v4 base URL derived from the exposed port */
  odataUrl: string;
  /** Developer service URL derived from the exposed port */
  devServiceUrl: string;
}

export interface ContainerSandboxDeps {
  execFile?: AlcRunnerDeps['execFile'];
  now?: () => number;
  resolvePowershellPath?: () => string | null;
}

export interface Phase1PipelineRequest {
  manifest: AppJsonManifest;
  files: AlExtensionFile[];
  /** Directory that will hold the generated AL project */
  projectDir: string;
  /** Directory that holds the `.alpackages` symbol cache */
  symbolCachePath: string;
  /** Optional explicit alc.exe path */
  alcPath?: string;
  /** Optional explicit output `.app` path */
  outputPath?: string;
  /** Optional publish step after a successful compile */
  publish?: Omit<PublishRequest, 'appPath'>;
  /** Optional extra compiler switches */
  extraArgs?: string[];
}

export interface Phase1PipelineResult {
  project: AlProjectWriteResult;
  compile: AlcRunResult;
  publish?: PublishResult;
  /** True when the compile succeeded and (if requested) the publish succeeded */
  success: boolean;
  /** Deterministic SHA-256 fingerprint of the compiled package (or project payload) */
  fingerprint: string;
}
