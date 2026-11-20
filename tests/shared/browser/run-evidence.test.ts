/**
 * Unit tests: evidence retention for browser runs.
 * Uses an in-memory filesystem so no real disk is touched.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  collectEvidence,
  pruneEvidence,
  summariseEvidence,
  EVIDENCE_MANIFEST_NAME,
  type EvidenceSource,
  type RetainedRun,
} from "../../../packages/shared/src/browser/run-evidence.ts";
import { at } from "../../support/test-helpers.ts";

const NOW = Date.parse("2026-11-16T12:00:00.000Z");
const EVIDENCE_DIR = path.resolve("C:\\proj\\test-results\\evidence");

function buildFs() {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const removed: string[] = [];
  const written: string[] = [];
  return {
    files,
    dirs,
    removed,
    written,
    deps: {
      // Directory listing: direct child files first, then child directories.
      readDir: (dir: string) => {
        const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
        const children = new Set<string>();
        for (const key of [...files.keys(), ...dirs]) {
          if (!key.startsWith(prefix)) continue;
          const rest = key.slice(prefix.length);
          if (rest.length === 0) continue;
          children.add(rest.split(path.sep)[0]);
        }
        return [...children].sort();
      },
      readFile: (p: string) => {
        if (files.has(p)) return Buffer.from(files.get(p)!, "utf8");
        if (dirs.has(p)) throw new Error(`EISDIR: ${p}`);
        throw new Error(`ENOENT: ${p}`);
      },
      writeFile: (p: string, data: string | Buffer) => {
        written.push(p);
        files.set(p, String(data));
      },
      mkdir: (dir: string) => {
        dirs.add(dir);
      },
      remove: (p: string) => {
        removed.push(p);
        for (const key of [...files.keys()]) if (key === p || key.startsWith(p + path.sep)) files.delete(key);
        for (const key of [...dirs]) if (key === p || key.startsWith(p + path.sep)) dirs.delete(key);
      },
      exists: (p: string) => files.has(p) || dirs.has(p),
      now: () => new Date(NOW),
    },
  };
}

const TRACE = at("C:\\proj\\test-results\\trace.zip");
const VIDEO = at("C:\\proj\\test-results\\video.webm");
const SHOT = at("C:\\proj\\test-results\\bc-ok.png");

/** Build artefact sources and seed the fake FS with their bytes. */
function sources(
  fake: ReturnType<typeof buildFs>,
  opts: { traces?: string[]; screenshots?: string[]; videos?: string[] } = {}
): EvidenceSource[] {
  const list: EvidenceSource[] = [
    ...(opts.traces ?? []).map(sourcePath => ({ kind: "trace" as const, sourcePath })),
    ...(opts.videos ?? []).map(sourcePath => ({ kind: "video" as const, sourcePath })),
    ...(opts.screenshots ?? []).map(sourcePath => ({ kind: "screenshot" as const, sourcePath })),
  ];
  for (const source of list) fake.files.set(source.sourcePath, `bytes:${path.basename(source.sourcePath)}`);
  return list;
}

describe("collectEvidence", () => {
  it("always retains screenshots", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-1",
        status: "passed",
        durationMs: 1234,
        sources: sources(fake, { screenshots: [SHOT] }),
      },
      fake.deps
    );

    assert.equal(run.runId, "run-1");
    assert.equal(run.status, "passed");
    assert.equal(run.durationMs, 1234);
    assert.equal(run.retained.length, 1);
    assert.equal(run.retained[0].kind, "screenshot");
    assert.equal(run.removed.length, 0);

    const copied = path.join(EVIDENCE_DIR, "run-1", "bc-ok.png");
    assert.equal(fake.files.get(copied), "bytes:bc-ok.png", "the source bytes are copied, not the path text");
    assert.equal(run.retained[0].path, copied);
    assert.equal(run.retained[0].sizeBytes, "bytes:bc-ok.png".length);
  });

  it("retains the trace on a failed run", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-2",
        status: "failed",
        durationMs: 900,
        sources: sources(fake, { traces: [TRACE] }),
      },
      fake.deps
    );
    assert.equal(run.retained.length, 1);
    assert.equal(run.retained[0].kind, "trace");
  });

  it("drops the trace and video on a passing run but records why", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-3",
        status: "passed",
        durationMs: 900,
        sources: sources(fake, { traces: [TRACE], videos: [VIDEO] }),
      },
      fake.deps
    );
    assert.deepEqual(run.retained, []);
    assert.deepEqual(
      run.removed.map(r => r.reason).sort(),
      ["passing run does not retain trace", "passing run does not retain video"]
    );
  });

  it("retains trace and video on failure", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-4",
        status: "failed",
        durationMs: 900,
        sources: sources(fake, { traces: [TRACE], videos: [VIDEO] }),
      },
      fake.deps
    );
    assert.deepEqual(run.retained.map(r => r.kind).sort(), ["trace", "video"]);
  });

  it("skips sources that do not exist and records them as removed", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-5",
        status: "failed",
        durationMs: 10,
        sources: [{ kind: "trace", sourcePath: at("C:\\proj\\test-results\\missing.zip") }],
      },
      fake.deps
    );
    assert.deepEqual(run.retained, []);
    assert.equal(run.removed[0].reason, "source artefact not found");
    assert.deepEqual(fake.written.some(p => p.includes("missing")), false);
  });

  it("names colliding artefacts uniquely when two sources share a file name", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-6",
        status: "failed",
        durationMs: 1,
        sources: sources(fake, {
          traces: [at("C:\\proj\\chrome\\trace.zip")],
          videos: [at("C:\\proj\\chromium\\trace.zip")],
        }),
      },
      fake.deps
    );
    const paths = run.retained.map(r => r.path);
    assert.equal(new Set(paths).size, 2, "second artefact must not overwrite the first");
    assert.deepEqual(run.retained.map(r => r.fileName).sort(), ["trace.zip", "video-trace.zip"]);
  });

  it("rejects an unsafe run id instead of escaping the evidence directory", () => {
    const fake = buildFs();
    assert.throws(
      () =>
        collectEvidence(
          { evidenceDir: EVIDENCE_DIR, runId: "../../etc", status: "failed", durationMs: 1, sources: [] },
          fake.deps
        ),
      /run id/i
    );
  });

  it("writes a redacted manifest with no absolute source paths", () => {
    const fake = buildFs();
    collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-7",
        status: "failed",
        durationMs: 5,
        sources: sources(fake, { screenshots: [at("C:\\proj\\test-results\\shot.png")] }),
      },
      fake.deps
    );
    const manifestPath = path.join(EVIDENCE_DIR, "run-7", EVIDENCE_MANIFEST_NAME);
    const manifest = JSON.parse(fake.files.get(manifestPath)!);
    assert.equal(manifest.runId, "run-7");
    assert.equal(manifest.status, "failed");
    assert.equal(manifest.capturedAt, new Date(NOW).toISOString());
    assert.equal(JSON.stringify(manifest).includes("C:\\proj"), false);
    assert.equal(manifest.retained[0].fileName, "shot.png");
  });
});

function retainedRun(runId: string, capturedAt: number, sizeBytes = 100): RetainedRun {
  return { runId, capturedAt, status: "passed", path: path.join(EVIDENCE_DIR, runId), totalBytes: sizeBytes };
}

/** Lay a run on disk the way collectEvidence would have left it. */
function seedRun(fixture: ReturnType<typeof buildFs>, run: RetainedRun, status: 'passed' | 'failed' = "passed"): void {
  fixture.deps.mkdir(EVIDENCE_DIR);
  fixture.deps.mkdir(run.path);
  fixture.deps.writeFile(
    path.join(run.path, EVIDENCE_MANIFEST_NAME),
    JSON.stringify({
      runId: run.runId,
      status,
      capturedAt: new Date(run.capturedAt).toISOString(),
      durationMs: 0,
      retained: [{ kind: "screenshot", fileName: "shot.png", sizeBytes: run.totalBytes }],
      removed: [],
    })
  );
  fixture.deps.writeFile(path.join(run.path, "shot.png"), "x");
}

describe("pruneEvidence", () => {
  it("keeps the newest runs up to maxRuns and deletes the rest", () => {
    const fake = buildFs();
    const runs = [
      retainedRun("run-a", NOW - 3000),
      retainedRun("run-b", NOW - 2000),
      retainedRun("run-c", NOW - 1000),
    ];
    for (const run of runs) seedRun(fake, run);

    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxRuns: 2 }, fake.deps);

    assert.deepEqual(result.kept, ["run-c", "run-b"]);
    assert.deepEqual(result.pruned, ["run-a"]);
    assert.deepEqual(fake.removed, [runs[0].path]);
  });

  it("keeps the run with the newest capturedAt even when it is not first alphabetically", () => {
    const fake = buildFs();
    const old = retainedRun("run-z", NOW - 5000);
    const fresh = retainedRun("run-a", NOW - 500);
    seedRun(fake, old);
    seedRun(fake, fresh);


    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxRuns: 1 }, fake.deps);
    assert.deepEqual(result.kept, ["run-a"]);
    assert.deepEqual(result.pruned, ["run-z"]);
  });

  it("prunes anything older than maxAgeDays", () => {
    const fake = buildFs();
    const oldRun = retainedRun("run-old", NOW - 10 * 24 * 3_600_000);
    const newRun = retainedRun("run-new", NOW - 3_600_000);
    seedRun(fake, oldRun);
    seedRun(fake, newRun);

    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxAgeDays: 7 }, fake.deps);
    assert.deepEqual(result.pruned, ["run-old"]);
  });

  it("reports a total byte count for retained runs", () => {
    const fake = buildFs();
    for (const run of [retainedRun("run-1", NOW - 10, 50), retainedRun("run-2", NOW - 5, 70)]) seedRun(fake, run);
    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxRuns: 5 }, fake.deps);
    assert.equal(result.totalBytes, 120);
  });

  it("does nothing when the evidence directory does not exist", () => {
    const fake = buildFs();
    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxRuns: 1 }, fake.deps);
    assert.deepEqual(result, { kept: [], pruned: [], totalBytes: 0 });
    assert.deepEqual(fake.removed, []);
  });

  it("skips run directories without a manifest instead of guessing", () => {
    const fake = buildFs();
    fake.dirs.add(EVIDENCE_DIR);
    fake.dirs.add(path.join(EVIDENCE_DIR, "not-a-run"));
    const result = pruneEvidence({ evidenceDir: EVIDENCE_DIR, maxRuns: 1 }, fake.deps);
    assert.deepEqual(result.kept, []);
    assert.deepEqual(result.pruned, []);
  });
});

describe("summariseEvidence", () => {
  it("prints run id, status, count and total bytes", () => {
    const fake = buildFs();
    const run = collectEvidence(
      {
        evidenceDir: EVIDENCE_DIR,
        runId: "run-8",
        status: "failed",
        durationMs: 42,
        sources: sources(fake, { traces: [TRACE] }),
      },
      fake.deps
    );
    const summary = summariseEvidence(run);
    assert.match(summary, /run-8/);
    assert.match(summary, /failed/);
    assert.match(summary, /1 artefact/);
  });
});
