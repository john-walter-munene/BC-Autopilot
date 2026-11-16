/**
 * Unit tests: Playwright JSON reporter parsing.
 * The metric definitions are asserted literally against Playwright's reporter contract:
 * `duration` is wall-clock (includes retries), `durationProject` is summed across all attempts.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsePlaywrightReport,
  summarisePlaywrightReport,
  reportToStepResults,
  buildPlaywrightArgs,
  isPlaywrightReport,
  PLAYWRIGHT_REPORT_FILE,
} from "./playwright-report.ts";

function reportFixture(overrides: Record<string, unknown> = {}) {
  return {
    config: { rootDir: "C:\\proj" },
    stats: { startTime: "2026-11-16T10:00:00.000Z", duration: 61_000, expected: 2, skipped: 1, unexpected: 1, flaky: 1 },
    errors: [],
    suites: [
      {
        title: "bc-customization.spec.ts",
        file: "tests/bc-customization.spec.ts",
        specs: [
          {
            title: "verifies loyalty fields",
            tests: [
              {
                projectName: "chromium",
                results: [{ status: "passed", duration: 1_500 }],
                status: "expected",
              },
            ],
          },
          {
            title: "verifies page inspector",
            tests: [
              {
                projectName: "chromium",
                results: [
                  { status: "failed", duration: 2_000, error: { message: "expect(locator).toBeVisible failed" } },
                  { status: "passed", duration: 1_200 },
                ],
                // Playwright reports a recovered retry as `unexpected` (exit code 1);
                // `flaky` only appears when --fail-on-flaky-tests is off *and* the run is summarised.
                status: "unexpected",
              },
            ],
          },
          {
            title: "verifies hazmat fasttab",
            tests: [
              {
                projectName: "chromium",
                results: [{ status: "failed", duration: 4_000, error: { message: "Timeout 15000ms exceeded" } }],
                status: "unexpected",
              },
            ],
          },
          {
            title: "api smoke (opted out)",
            tests: [
              {
                projectName: "chromium",
                results: [{ status: "skipped", duration: 0 }],
                status: "skipped",
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("isPlaywrightReport", () => {
  it("accepts a report shape", () => {
    assert.equal(isPlaywrightReport(reportFixture()), true);
  });
  it("rejects an array", () => {
    assert.equal(isPlaywrightReport([]), false);
  });
  it("rejects a report with no suites array", () => {
    assert.equal(isPlaywrightReport({ stats: {} }), false);
  });
  it("rejects null and primitives", () => {
    assert.equal(isPlaywrightReport(null), false);
    assert.equal(isPlaywrightReport("report"), false);
  });
});

describe("parsePlaywrightReport", () => {
  it("flattens every spec into a test entry with its final status", () => {
    const report = parsePlaywrightReport(reportFixture());
    assert.equal(report.tests.length, 4);
    assert.deepEqual(
      report.tests.map(t => [t.title, t.status]),
      [
        ["verifies loyalty fields", "passed"],
        ["verifies page inspector", "failed"],
        ["verifies hazmat fasttab", "failed"],
        ["api smoke (opted out)", "skipped"],
      ],
      "a flaky recovery is still a failure in a run that would exit 1"
    );
  });

  it("counts a recovered retry as flaky but still failed, matching the exit code", () => {
    const report = parsePlaywrightReport(reportFixture());
    assert.equal(report.counts.passed, 1);
    assert.equal(report.counts.flaky, 1);
    assert.equal(report.counts.failed, 2, "the flaky test plus the genuine failure");
    assert.equal(report.counts.skipped, 1);
  });

  it("marks the run failed when any test is unexpected", () => {
    assert.equal(parsePlaywrightReport(reportFixture()).success, false);
  });

  it("treats a flaky-only run as failed unless allowFlaky is set", () => {
    const flakyOnly = {
      suites: [
        {
          specs: [
            {
              title: "flaky",
              tests: [{ results: [{ status: "failed", duration: 1 }, { status: "passed", duration: 1 }], status: "unexpected" }],
            },
          ],
        },
      ],
    };
    assert.equal(parsePlaywrightReport(flakyOnly).success, false);
    assert.equal(parsePlaywrightReport(flakyOnly, { allowFlaky: true }).success, true);

    const mixed = reportFixture();
    assert.equal(parsePlaywrightReport(mixed, { allowFlaky: true }).success, false, "a genuine failure is never forgiven");
  });

  it("reports success when every test passes or is skipped", () => {
    const report = parsePlaywrightReport(
      reportFixture({
        suites: [
          {
            specs: [
              { title: "a", tests: [{ results: [{ status: "passed", duration: 5 }], status: "expected" }] },
              { title: "b", tests: [{ results: [{ status: "skipped" }], status: "skipped" }] },
            ],
          },
        ],
      })
    );
    assert.equal(report.success, true);
  });

  it("records wall-clock duration from stats and per-test durations from the final attempt", () => {
    const report = parsePlaywrightReport(reportFixture());
    assert.equal(report.durationMs, 61_000);
    const flaky = report.tests.find(t => t.title === "verifies page inspector")!;
    assert.equal(flaky.durationMs, 1_200);
    assert.equal(flaky.attempts, 2, "two attempts means flaky, and flaky is counted");
  });

  it("captures the failure message of the last attempt only", () => {
    const report = parsePlaywrightReport(reportFixture());
    assert.match(report.tests[2].error!, /Timeout 15000ms exceeded/);
    assert.equal(report.tests[0].error, undefined, "a clean pass has no error");

    const alwaysFailsThenFails = parsePlaywrightReport({
      suites: [
        {
          specs: [
            {
              title: "always fails",
              tests: [
                {
                  results: [
                    { status: "failed", duration: 1, error: { message: "first attempt" } },
                    { status: "failed", duration: 1, error: { message: "second attempt" } },
                  ],
                  status: "unexpected",
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(alwaysFailsThenFails.tests[0].error, "first attempt", "the first recorded failure is the one to read first");
  });

  it("reads title paths from nested describe blocks", () => {
    const report = parsePlaywrightReport({
      suites: [
        {
          title: "outer.spec.ts",
          suites: [
            { title: "D365 Business Central", suites: [{ title: "Customer Card", specs: [{ title: "field visible", tests: [{ results: [{ status: "passed" }], status: "expected" }] }] }] },
          ],
        },
      ],
    });
    assert.equal(report.tests[0].titlePath.join(" > "), "outer.spec.ts > D365 Business Central > Customer Card > field visible");
    assert.equal(report.tests[0].title, "field visible");
  });

  it("defaults missing stats without inventing a duration", () => {
    const report = parsePlaywrightReport({ suites: [] });
    assert.equal(report.durationMs, 0);
    assert.equal(report.tests.length, 0);
    assert.equal(report.success, true);
  });

  it("never claims success from an empty report when allowEmpty is false", () => {
    const empty = { suites: [] };
    assert.equal(parsePlaywrightReport(empty).success, true);
    assert.equal(parsePlaywrightReport(empty, { allowEmpty: false }).success, false);
  });

  it("surfaces global errors even when no test failed", () => {
    const report = parsePlaywrightReport({ suites: [], errors: [{ message: "Cannot find module '@playwright/test'" }] });
    assert.equal(report.success, false);
    assert.match(report.errors[0], /Cannot find module/);
  });

  it("records the spec file for trace correlation", () => {
    const report = parsePlaywrightReport(reportFixture());
    assert.equal(report.tests[0].file, "tests/bc-customization.spec.ts");
  });

  it("does not throw on a partially shaped tree", () => {
    const report = parsePlaywrightReport({ suites: [{ specs: [{ title: "x" }] }, { specs: "bad" }] });
    assert.equal(report.tests.length, 1);
    assert.equal(report.tests[0].status, "unknown");
  });
});

describe("summarisePlaywrightReport", () => {
  it("renders one stable line with counts and duration", () => {
    const summary = summarisePlaywrightReport(parsePlaywrightReport(reportFixture()));
    assert.match(summary, /^Playwright: 4 tests, 1 passed, 2 failed, 1 flaky, 1 skipped in 61\.0s — FAILED/);
  });

  it("renders PASSED for a clean run", () => {
    const report = parsePlaywrightReport({
      stats: { duration: 1_000 },
      suites: [{ specs: [{ title: "a", tests: [{ results: [{ status: "passed" }], status: "expected" }] }] }],
    });
    assert.match(summarisePlaywrightReport(report), /— PASSED$/);
  });

  it("names the first failure in report order so the operator does not have to open the HTML report", () => {
    const summary = summarisePlaywrightReport(parsePlaywrightReport(reportFixture()));
    assert.match(summary, /first failure: verifies page inspector/);
  });
});

describe("reportToStepResults", () => {
  it("maps tests onto the shared PlaywrightStepResult shape", () => {
    const steps = reportToStepResults(parsePlaywrightReport(reportFixture()));
    assert.equal(steps.length, 4);
    assert.deepEqual(
      steps.map(s => s.status),
      ["passed", "failed", "failed", "pending"]
    );
    assert.equal(steps[0].stepNumber, 1);
    assert.equal(steps[0].action, "assert_dom");
    assert.equal(steps[0].expectedOutcome, "verifies loyalty fields");
  });

  it("carries each failure message into the console trace", () => {
    const steps = reportToStepResults(parsePlaywrightReport(reportFixture()));
    assert.match(steps[2].consoleTrace ?? "", /Timeout 15000ms exceeded/);
    assert.match(steps[1].consoleTrace ?? "", /expect\(locator\)\.toBeVisible failed/);
  });
});

describe("buildPlaywrightArgs", () => {
  it("builds a non-interactive run with the json reporter and output folder", () => {
    const args = buildPlaywrightArgs({ testDir: "tests/playwright", outputDir: "test-results" });
    assert.deepEqual(args, ["test", "--config", "tests/playwright", "--reporter", "json", "--output", "test-results"]);
  });

  it("adds a single spec, grep and workers when supplied", () => {
    const args = buildPlaywrightArgs({
      testDir: "tests/playwright",
      config: "tests/playwright/playwright.config.ts",
      spec: "bc-customization.spec.ts",
      grep: "Customer Card",
      workers: 1,
      retries: 1,
    });
    assert.deepEqual(args, [
      "test",
      "--config",
      "tests/playwright/playwright.config.ts",
      "--reporter",
      "json",
      "--grep",
      "Customer Card",
      "--workers",
      "1",
      "--retries",
      "1",
      "--output",
      "test-results",
      "--",
      "bc-customization.spec.ts",
    ]);
  });

  it("omits optional switches by default", () => {
    const args = buildPlaywrightArgs({ testDir: "tests" });
    assert.equal(args.includes("--grep"), false);
    assert.equal(args.includes("--retries"), false);
    assert.equal(args.at(-1), "test-results");
  });
});

describe("PLAYWRIGHT_REPORT_FILE", () => {
  it("names the report file the runner reads back", () => {
    assert.equal(PLAYWRIGHT_REPORT_FILE, "playwright-report.json");
  });
});
