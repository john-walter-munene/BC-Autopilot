/**
 * Evidence retention for browser runs.
 * Phase 2: keep the artefacts that explain a failure (trace, video, screenshots)
 * and prune old runs so `test-results/` does not grow without bound.
 *
 * Retention rules are decisions, so they are pure functions over injected file I/O:
 *   - screenshots: always retained
 *   - trace / video: retained only when the run failed
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  CollectEvidenceRequest,
  EvidenceDeps,
  EvidenceKind,
  EvidenceManifest,
  EvidenceSource,
  PruneEvidenceResult,
  RetentionPolicy,
  RetainedRun,
  RunEvidenceResult,
} from '../al/al-cli-types.ts';

export const EVIDENCE_MANIFEST_NAME = 'evidence.json';

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function assertSafeRunId(runId: string): void {
  if (!RUN_ID_PATTERN.test(runId) || runId.includes('..')) {
    throw new Error(`Invalid evidence run id: "${runId}". Use letters, digits, dot, dash or underscore (max 80).`);
  }
}

function resolveDeps(deps: EvidenceDeps) {
  return {
    readDir: deps.readDir ?? ((dir: string) => fs.readdirSync(dir)),
    readFile: deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath)),
    writeFile: deps.writeFile ?? ((filePath: string, data: Buffer | string) => fs.writeFileSync(filePath, data)),
    mkdir: deps.mkdir ?? ((dir: string) => fs.mkdirSync(dir, { recursive: true })),
    remove: deps.remove ?? ((target: string) => fs.rmSync(target, { recursive: true, force: true })),
    exists: deps.exists ?? ((target: string) => fs.existsSync(target)),
    now: deps.now ?? (() => new Date()),
  };
}

type ResolvedDeps = ReturnType<typeof resolveDeps>;

/** Which artefacts a run status justifies keeping. */
export function shouldRetain(kind: EvidenceKind, status: 'passed' | 'failed'): boolean {
  if (kind === 'screenshot') return true;
  return status === 'failed';
}

function retentionReason(kind: EvidenceKind, status: 'passed' | 'failed'): string {
  return status === 'passed'
    ? `passing run does not retain ${kind}`
    : `${kind} is not produced by this run`;
}

/** Pick a destination file name that cannot collide inside the run directory. */
function uniqueFileName(source: EvidenceSource, used: Set<string>): string {
  const base = path.basename(source.sourcePath);
  const extension = path.extname(base);
  const stem = base.slice(0, base.length - extension.length) || 'artefact';

  let candidate = base;
  if (used.has(candidate)) candidate = `${source.kind}-${base}`;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${stem}-${counter}${extension}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Copy the artefacts a run should keep into `<evidenceDir>/<runId>/` and write a
 * redacted manifest. Never throws for a missing source artefact — it is recorded as dropped.
 */
export function collectEvidence(request: CollectEvidenceRequest, deps: EvidenceDeps = {}): RunEvidenceResult {
  assertSafeRunId(request.runId);
  const io = resolveDeps(deps);

  const runDir = path.join(request.evidenceDir, request.runId);
  io.mkdir(request.evidenceDir);
  const retained: RunEvidenceResult['retained'] = [];
  const removed: RunEvidenceResult['removed'] = [];
  const usedNames = new Set<string>([EVIDENCE_MANIFEST_NAME]);

  for (const source of request.sources) {
    const fileName = path.basename(source.sourcePath);

    if (!shouldRetain(source.kind, request.status)) {
      removed.push({ kind: source.kind, fileName, reason: retentionReason(source.kind, request.status) });
      continue;
    }

    let bytes: Buffer | string;
    try {
      if (!io.exists(source.sourcePath)) throw new Error('missing');
      bytes = io.readFile(source.sourcePath);
    } catch {
      removed.push({ kind: source.kind, fileName, reason: 'source artefact not found' });
      continue;
    }

    const destinationName = uniqueFileName(source, usedNames);
    const destinationPath = path.join(runDir, destinationName);
    io.mkdir(runDir);
    io.writeFile(destinationPath, bytes);

    retained.push({
      kind: source.kind,
      path: destinationPath,
      fileName: destinationName,
      sizeBytes: typeof bytes === 'string' ? Buffer.byteLength(bytes) : bytes.byteLength,
    });
  }

  const capturedAt = io.now().toISOString();
  const manifest: EvidenceManifest = {
    runId: request.runId,
    status: request.status,
    capturedAt,
    durationMs: request.durationMs,
    retained: retained.map(item => ({ kind: item.kind, fileName: item.fileName, sizeBytes: item.sizeBytes })),
    removed: removed.map(item => ({ kind: item.kind, fileName: item.fileName, reason: item.reason })),
  };

  // Every collected run is recorded, even one that retained nothing: the manifest is what
  // pruning and the UI count from. The directory must exist before the manifest is written.
  io.mkdir(runDir);
  io.writeFile(path.join(runDir, EVIDENCE_MANIFEST_NAME), JSON.stringify(manifest, null, 2));

  return {
    runId: request.runId,
    status: request.status,
    durationMs: request.durationMs,
    capturedAt,
    directory: runDir,
    retained,
    removed,
    totalBytes: retained.reduce((sum, item) => sum + item.sizeBytes, 0),
  };
}

/** Read every run manifest under the evidence directory. Directories without one are ignored. */
export function listRetainedRuns(evidenceDir: string, deps: EvidenceDeps = {}): RetainedRun[] {
  const io = resolveDeps(deps);
  if (!io.exists(evidenceDir)) return [];

  const runs: RetainedRun[] = [];
  for (const entry of io.readDir(evidenceDir)) {
    const runDir = path.join(evidenceDir, entry);
    const manifestPath = path.join(runDir, EVIDENCE_MANIFEST_NAME);
    if (!io.exists(manifestPath)) continue;

    let manifest: EvidenceManifest;
    try {
      const raw = io.readFile(manifestPath);
      manifest = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8')) as EvidenceManifest;
    } catch {
      continue;
    }

    const capturedAt = Date.parse(manifest.capturedAt);
    if (Number.isNaN(capturedAt)) continue;

    const artefacts = Array.isArray(manifest.retained) ? manifest.retained : [];
    runs.push({
      runId: typeof manifest.runId === 'string' ? manifest.runId : entry,
      capturedAt,
      status: manifest.status === 'failed' ? 'failed' : 'passed',
      path: runDir,
      totalBytes: artefacts.reduce((sum, item) => sum + (Number(item.sizeBytes) || 0), 0),
    });
  }

  return runs;
}

/**
 * Apply a retention policy: drop runs beyond `maxRuns` (newest first) and any run
 * older than `maxAgeDays`. Runs referenced by neither rule are kept.
 */
export function pruneEvidence(
  request: { evidenceDir: string; maxRuns?: number; maxAgeDays?: number },
  deps: EvidenceDeps = {}
): PruneEvidenceResult {
  const io = resolveDeps(deps);
  const runs = listRetainedRuns(request.evidenceDir, deps);
  if (runs.length === 0) return { kept: [], pruned: [], totalBytes: 0 };

  const newestFirst = [...runs].sort((a, b) => b.capturedAt - a.capturedAt);
  const nowMs = io.now().getTime();
  const cutoff = request.maxAgeDays === undefined ? undefined : nowMs - request.maxAgeDays * DAY_MS;

  const kept: RetainedRun[] = [];
  const pruned: string[] = [];

  newestFirst.forEach((run, index) => {
    const beyondCount = request.maxRuns !== undefined && index >= Math.max(0, request.maxRuns);
    const beyondAge = cutoff !== undefined && run.capturedAt < cutoff;

    if (beyondCount || beyondAge) {
      io.remove(run.path);
      pruned.push(run.runId);
    } else {
      kept.push(run);
    }
  });

  return {
    kept: kept.map(run => run.runId),
    pruned,
    totalBytes: kept.reduce((sum, run) => sum + run.totalBytes, 0),
  };
}

/** One-line, log-safe summary of a retained run. */
export function summariseEvidence(result: RunEvidenceResult): string {
  const count = result.retained.length;
  const kinds = result.retained.map(item => item.kind).join(', ');
  const detail = count === 0 ? 'no artefacts' : `${count} artefact${count === 1 ? '' : 's'} (${kinds})`;
  return `Evidence run ${result.runId}: ${result.status}, ${detail}, ${result.totalBytes} bytes → ${result.directory}`;
}

/** Convenience wrapper: collect, then prune with the caller's policy. */
export function runWithRetention(
  request: CollectEvidenceRequest,
  policy: RetentionPolicy = {},
  deps: EvidenceDeps = {}
): RunEvidenceResult & { prune?: PruneEvidenceResult } {
  const result = collectEvidence(request, deps);
  if (policy.maxRuns === undefined && policy.maxAgeDays === undefined) return result;
  const prune = pruneEvidence({ evidenceDir: request.evidenceDir, ...policy }, deps);
  return { ...result, prune };
}

export const evidenceKinds: readonly EvidenceKind[] = ['trace', 'video', 'screenshot'];
