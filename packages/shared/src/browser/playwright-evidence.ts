/**
 * Browser run orchestration: storage state gate → Playwright run → evidence retention.
 * Phase 2: one callable path used by the CLI and the API so a "passed" status always
 * comes from a real report, never from a simulated result.
 */

import path from 'node:path';
import type {
  EvidenceDeps,
  PlaywrightRunOptions,
  PlaywrightRunResult,
  PruneEvidenceResult,
  RetentionPolicy,
  RunEvidenceResult,
} from '../al/al-cli-types.ts';
import { PlaywrightRunner } from './playwright-runner.ts';
import { StorageStateService } from './storage-state.ts';
import { collectEvidence, pruneEvidence, summariseEvidence } from './run-evidence.ts';

/** Artefact files a Playwright run leaves in its output directory, by kind. */
const DEFAULT_ARTEFACTS: ReadonlyArray<{ kind: 'trace' | 'video' | 'screenshot'; patterns: RegExp[] }> = [
  { kind: 'trace', patterns: [/trace\.zip$/i, /\.zip$/i] },
  { kind: 'video', patterns: [/\.webm$/i] },
  { kind: 'screenshot', patterns: [/bc-extension-verified\.png$/i, /\.png$/i] },
];

export interface BrowserRunRequest extends PlaywrightRunOptions {
  /** Managed storage state to replay. Required — there is no anonymous BC run. */
  authStatePath: string;
  /** Root that holds one folder per evidence run (default: `<outputDir>/evidence`) */
  evidenceDir?: string;
  /** Applied after the run is recorded */
  retention?: RetentionPolicy;
}

export interface BrowserRunResult {
  success: boolean;
  /** False when the run was refused before Playwright started */
  ran: boolean;
  runId: string;
  durationMs: number;
  summary: string;
  failureReason?: string;
  /** Parsed report — absent only when Playwright never produced one */
  report?: PlaywrightRunResult['report'];
  playwright?: PlaywrightRunResult;
  evidence?: RunEvidenceResult;
  prune?: PruneEvidenceResult;
}

export interface PlaywrightEvidenceDeps {
  runner: Pick<PlaywrightRunner, 'run'>;
  /** Optional richer inspection used to explain a refusal; defaults to the storage-state resolver */
  inspectStorageState?: (statePath: string, options: { cwd: string }) => { reasons: string[] };
  /** Relative directory Playwright writes into, when the request omits one (default: test-results) */
  outputDir?: string;
  storageState: Pick<StorageStateService, 'requireUsable'>;
  evidence: EvidenceDeps;
  /** Project root used to resolve relative paths */
  rootDir: string;
  now?: () => number;
  /** Deterministic run ids in tests */
  runIdFactory?: (now: Date) => string;
  /** Override artefact discovery */
  discoverArtefacts?: (outputDir: string) => Array<{ kind: 'trace' | 'video' | 'screenshot'; sourcePath: string }>;
}

function defaultRunId(now: Date): string {
  return `run-${now.toISOString().replace(/[:.]/g, '-')}`;
}

export class PlaywrightEvidencePipeline {
  private readonly deps: PlaywrightEvidenceDeps;
  private readonly clock: () => number;
  private readonly outputDir: string;

  constructor(deps: PlaywrightEvidenceDeps) {
    this.deps = deps;
    this.clock = deps.now ?? (() => Date.now());
    this.outputDir = deps.outputDir ?? 'test-results';
  }

  /** Human-readable reason the session was refused, when the dependency can explain itself. */
  private describeStorageState(statePath: string): string | undefined {
    if (!this.deps.inspectStorageState) return undefined;
    try {
      const reasons = this.deps.inspectStorageState(statePath, { cwd: this.deps.rootDir }).reasons;
      return reasons.length > 0 ? reasons.join('; ') : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Execute a suite against a managed session and retain the evidence.
   * Refuses to spawn Playwright when the storage state is missing or expired.
   */
  async run(request: BrowserRunRequest): Promise<BrowserRunResult> {
    const startedAt = this.clock();
    const runId = (this.deps.runIdFactory ?? defaultRunId)(new Date(this.clock()));

    let storageStatePath: string;
    try {
      storageStatePath = this.deps.storageState.requireUsable(request.authStatePath, { cwd: this.deps.rootDir });
    } catch (error) {
      const detail = this.describeStorageState(request.authStatePath);
      const reason = error instanceof Error ? error.message : String(error);
      const failureReason = detail ? `${reason} (${detail})` : reason;
      return {
        success: false,
        ran: false,
        runId,
        durationMs: 0,
        summary: `Refused to run: ${failureReason}`,
        failureReason,
      };
    }

    const outputDir = request.outputDir ?? this.outputDir;
    const absoluteOutputDir = path.resolve(this.deps.rootDir, outputDir);
    const evidenceDir = request.evidenceDir ?? path.join(outputDir, 'evidence');
    const playwright = await this.deps.runner.run({
      ...request,
      outputDir: absoluteOutputDir,
      storageStatePath,
      env: { ...(request.env ?? {}), BC_STORAGE_STATE: storageStatePath },
    });

    const status: 'passed' | 'failed' = playwright.success ? 'passed' : 'failed';
    const sources = (this.deps.discoverArtefacts ?? (dir => discoverArtefacts(dir, this.deps.evidence)))(absoluteOutputDir);
    const absoluteEvidenceDir = path.resolve(this.deps.rootDir, evidenceDir);

    const evidence = collectEvidence(
      {
        evidenceDir: absoluteEvidenceDir,
        runId,
        status,
        durationMs: this.clock() - startedAt,
        sources,
      },
      this.deps.evidence
    );

    // Retention is part of the same call so a caller cannot record a run and forget to prune.
    const prune = hasRetentionPolicy(request.retention)
      ? pruneEvidence({ evidenceDir: absoluteEvidenceDir, ...request.retention }, this.deps.evidence)
      : undefined;

    const result: BrowserRunResult = {
      success: playwright.success,
      ran: true,
      runId,
      durationMs: evidence.durationMs,
      summary: `[${runId}] ${playwright.summary} | ${summariseEvidence(evidence)}`,
      report: playwright.report ?? undefined,
      playwright,
      evidence,
    };
    if (prune) result.prune = prune;

    return result;
  }
}

function hasRetentionPolicy(policy: RetentionPolicy | undefined): policy is RetentionPolicy {
  return policy !== undefined && (policy.maxRuns !== undefined || policy.maxAgeDays !== undefined);
}

/**
 * Find the artefacts a run left on disk.
 * Traces and videos are written per test under `outputDir`; the spec's explicit
 * screenshot has a known name and is preferred over any incidental capture.
 */
export function discoverArtefacts(
  outputDir: string,
  deps: EvidenceDeps = {}
): Array<{ kind: 'trace' | 'video' | 'screenshot'; sourcePath: string }> {
  const exists = deps.exists ?? ((target: string) => false);
  const readDir = deps.readDir;
  if (!readDir || !exists(outputDir)) return [];

  const seen = new Set<string>();
  const found: Array<{ kind: 'trace' | 'video' | 'screenshot'; sourcePath: string }> = [];

  const visit = (dir: string, depth: number) => {
    if (depth > 4) return;
    let entries: string[];
    try {
      entries = readDir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (!exists(full)) continue;
      const kind = DEFAULT_ARTEFACTS.find(rule => rule.patterns.some(pattern => pattern.test(entry)))?.kind;
      if (kind && !seen.has(full) && !entry.endsWith('.json')) {
        seen.add(full);
        found.push({ kind, sourcePath: full });
        continue;
      }
      if (!path.extname(entry)) visit(full, depth + 1);
    }
  };

  visit(outputDir, 0);

  // Keep only the trace/video from the deepest run and the explicit verification screenshot.
  const explicit = found.filter(item => item.kind === 'screenshot' && /bc-extension-verified\.png$/i.test(item.sourcePath));
  const screenshots = explicit.length > 0 ? explicit : found.filter(item => item.kind === 'screenshot');
  return [
    ...found.filter(item => item.kind === 'trace').slice(-1),
    ...found.filter(item => item.kind === 'video').slice(-1),
    ...screenshots,
  ];
}
