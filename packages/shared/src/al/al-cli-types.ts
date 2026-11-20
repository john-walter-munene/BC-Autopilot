/**
 * AL Compiler CLI (`alc.exe`) Domain Types
 * Phase 1: physical compiler integration, symbol package caching, and publish bridge
 */

import type { AppJsonManifest, AlExtensionFile } from '../core/types.ts';

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

/**
 * Phase 2: live browser automation types
 * Playwright execution, managed Entra ID storage state, and evidence retention.
 */

/** Where a Playwright storage state file is read from / written to. */
export interface StorageStateDeps {
  readFile?: (filePath: string) => string;
  writeFile?: (filePath: string, data: string) => void;
  mkdir?: (dir: string) => void;
  fileExists?: (filePath: string) => boolean;
  now?: () => Date;
  /** Resolve a relative state path the way Playwright does (against the project root) */
  cwd?: string;
}

/** Redacted report of a storage state closure — cookie values are never retained. */
export interface StorageStateInspection {
  /** True when a state file exists on disk */
  present: boolean;
  /** True when the state exists, parses, and holds an unexpired BC session cookie */
  valid: boolean;
  /** Absolute path that was inspected */
  path: string;
  cookieCount: number;
  originCount: number;
  /** True when a Business Central session cookie is present */
  sessionCookiePresent: boolean;
  /** Earliest expiry among the BC session cookies (ISO 8601). Absent for session-only cookies. */
  expiresAt?: string;
  /** Why the state is unusable. Empty when `valid` is true. */
  reasons: string[];
}

export interface StorageStateResolveOptions {
  /** Directory that relative state paths resolve against */
  cwd?: string;
}

export type EvidenceKind = 'trace' | 'video' | 'screenshot';

export interface EvidenceSource {
  kind: EvidenceKind;
  /** Path produced by the Playwright run */
  sourcePath: string;
}

export interface RetainedArtefact {
  kind: EvidenceKind;
  /** Path inside the evidence run directory */
  path: string;
  /** File name only — safe to log and store in a manifest */
  fileName: string;
  sizeBytes: number;
}

export interface DroppedArtefact {
  kind: EvidenceKind;
  fileName: string;
  reason: string;
}

/** One retained run, derived from the on-disk manifest. */
export interface RetainedRun {
  runId: string;
  capturedAt: number;
  status: 'passed' | 'failed';
  path: string;
  totalBytes: number;
}

export interface RunEvidenceResult {
  runId: string;
  status: 'passed' | 'failed';
  durationMs: number;
  capturedAt: string;
  directory: string;
  retained: RetainedArtefact[];
  removed: DroppedArtefact[];
  totalBytes: number;
}

export interface RetainedArtefactManifestEntry {
  kind: EvidenceKind;
  fileName: string;
  sizeBytes: number;
}

/** What is written to `evidence.json` — relative names only, never absolute paths or secrets. */
export interface EvidenceManifest {
  runId: string;
  status: 'passed' | 'failed';
  capturedAt: string;
  durationMs: number;
  retained: RetainedArtefactManifestEntry[];
  removed: Array<{ kind: EvidenceKind; fileName: string; reason: string }>;
}

export interface EvidenceDeps {
  readDir?: (dir: string) => string[];
  readFile?: (filePath: string) => Buffer | string;
  writeFile?: (filePath: string, data: Buffer | string) => void;
  mkdir?: (dir: string) => void;
  remove?: (target: string) => void;
  exists?: (target: string) => boolean;
  now?: () => Date;
}

export interface CollectEvidenceRequest {
  /** Root directory that holds one folder per run */
  evidenceDir: string;
  runId: string;
  status: 'passed' | 'failed';
  durationMs: number;
  sources: EvidenceSource[];
}

export interface RetentionPolicy {
  /** Keep at most this many runs (newest first) */
  maxRuns?: number;
  /** Drop runs captured more than this many days ago */
  maxAgeDays?: number;
}

export interface PruneEvidenceResult {
  kept: string[];
  pruned: string[];
  totalBytes: number;
}

export interface PlaywrightTestEntry {
  title: string;
  /** Full path of describe blocks, ending with the test title */
  titlePath: string[];
  status: 'passed' | 'failed' | 'skipped' | 'unknown';
  /** Number of attempts (results) Playwright recorded */
  attempts: number;
  /** Duration of the final attempt in ms */
  durationMs: number;
  file?: string;
  /** Failure message of the final attempt, when the test failed */
  error?: string;
}

export interface PlaywrightReportSummary {
  tests: PlaywrightTestEntry[];
  counts: { passed: number; failed: number; skipped: number; flaky: number };
  /** True when no test failed unexpectedly and there were no global errors */
  success: boolean;
  /** Wall-clock duration from `stats.duration` */
  durationMs: number;
  errors: string[];
}

export interface PlaywrightReportOptions {
  /** Treat a flaky pass as acceptable (default false) */
  allowFlaky?: boolean;
  /** An empty report proves nothing; treat it as a failure (default true) */
  allowEmpty?: boolean;
}

export interface PlaywrightRunOptions {
  /** Directory containing the Playwright config (passed to --config) */
  testDir: string;
  /** Directory that receives the JSON report, traces and videos (default: test-results) */
  outputDir?: string;
  /** Base URL exported as BC_WEB_URL */
  baseUrl?: string;
  /** Managed storage state exported to Playwright */
  storageStatePath?: string;
  /** Extra environment variables for the child process */
  env?: Record<string, string>;
  /** Single spec file to run */
  spec?: string;
  grep?: string;
  workers?: number;
  retries?: number;
  timeoutMs?: number;
  cwd?: string;
  /** Directory names under the output folder that may hold artefacts */
  artefactDirs?: string[];
}

export interface PlaywrightRunDeps {
  execFile?: AlcRunnerDeps['execFile'];
  fileExists?: (filePath: string) => boolean;
  /** Reads the JSON reporter output as text */
  readFile?: (filePath: string) => string;
  now?: () => number;
  /** Resolve the Playwright CLI (npx playwright) — null when it is not installed */
  resolvePlaywrightPath?: () => string | null;
  /** Absolute project root used to read artefacts back */
  rootDir?: string;
}

export interface PlaywrightRunResult {
  success: boolean;
  exitCode: number | null;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  report: PlaywrightReportSummary | null;
  /** Absolute path of the JSON report Playwright was asked to write */
  reportPath: string;
  /** Single-line, log-safe summary */
  summary: string;
}
