/**
 * Unit tests: browser agent service (transport boundary).
 * Verifies the service delegates to the real pipeline and never invents a pass.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BrowserAgentService } from "../../apps/api/src/modules/browser-agent/browser-agent.service.ts";
import type { BrowserRunRequest, BrowserRunResult } from "@bc-agent/shared";

function buildService(run: (request: BrowserRunRequest) => Promise<BrowserRunResult>) {
  const calls: BrowserRunRequest[] = [];
  const service = new BrowserAgentService({
    pipeline: async request => {
      calls.push(request);
      return run(request);
    },
    defaultAuthStatePath: "auth/bc-storage-state.json",
  });
  return { service, calls };
}

function result(overrides: Partial<BrowserRunResult> = {}): BrowserRunResult {
  return {
    success: true,
    ran: true,
    runId: "run-1",
    durationMs: 1200,
    summary: "Playwright: 1 test, 1 passed, 0 failed, 0 flaky, 0 skipped in 2.0s — PASSED",
    report: {
      tests: [{ title: "customer card", titlePath: ["customer card"], status: "passed", attempts: 1, durationMs: 1200 }],
      counts: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
      success: true,
      durationMs: 2000,
      errors: [],
    },
    ...overrides,
  };
}

describe("BrowserAgentService.executeSuite", () => {
  it("delegates to the pipeline with the requested suite", async () => {
    const { service, calls } = buildService(async () => result());
    const outcome = await service.executeSuite({ testDir: "tests/playwright" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].testDir, "tests/playwright");
    assert.equal(calls[0].authStatePath, "auth/bc-storage-state.json");
    assert.equal(outcome.success, true);
    assert.equal(outcome.ran, true);
  });

  it("honours an explicit auth state path", async () => {
    const { service, calls } = buildService(async () => result());
    await service.executeSuite({ testDir: "tests/playwright", authStatePath: "C:\\secure\\state.json" });
    assert.equal(calls[0].authStatePath, "C:\\secure\\state.json");
  });

  it("reports a failed run as failed, with the parsed tests", async () => {
    const { service } = buildService(async () =>
      result({
        success: false,
        summary: "Playwright: 1 test, 0 passed, 1 failed — FAILED; first failure: customer card",
        report: {
          tests: [
            { title: "customer card", titlePath: ["customer card"], status: "failed", attempts: 1, durationMs: 10, error: "locator not found" },
          ],
          counts: { passed: 0, failed: 1, skipped: 0, flaky: 0 },
          success: false,
          durationMs: 10,
          errors: [],
        },
      })
    );

    const outcome = await service.executeSuite({ testDir: "tests/playwright" });
    assert.equal(outcome.success, false);
    assert.equal(outcome.report?.counts.failed, 1);
    assert.match(outcome.summary, /FAILED/);
  });

  it("never reports a pass for a run that was refused before starting", async () => {
    const { service } = buildService(async () =>
      result({
        success: false,
        ran: false,
        report: undefined,
        failureReason: "storage state file not found",
        summary: "Refused to run: storage state file not found",
      })
    );

    const outcome = await service.executeSuite({ testDir: "tests/playwright" });
    assert.equal(outcome.success, false);
    assert.equal(outcome.ran, false);
    assert.match(outcome.summary, /Refused|not found/i);
  });

  it("propagates a thrown pipeline error instead of swallowing it into a pass", async () => {
    const { service } = buildService(async () => {
      throw new Error("playwright crashed");
    });
    await assert.rejects(() => service.executeSuite({ testDir: "tests/playwright" }), /playwright crashed/);
  });
});

describe("BrowserAgentService.generateSuite", () => {
  it("still returns a spec for the requested page", () => {
    const { service } = buildService(async () => result());
    const suite = service.generateSuite(["ALC Loyalty Tier"], "Customer Card");
    assert.match(suite.filename, /\.spec\.ts$/);
    assert.ok(suite.testCode.length > 0);
  });
});
