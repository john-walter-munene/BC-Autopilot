/**
 * Playwright JSON reporter parsing.
 * Phase 2: turn `--reporter json` output into the shape the agent plans against.
 *
 * Metric contract (asserted literally in playwright-report.test.ts):
 *   - `stats.duration` is wall-clock and includes retries and setup/teardown.
 *   - a test's `duration` is the final attempt only; `durationProject` sums every attempt.
 */

import type {
  PlaywrightReportOptions,
  PlaywrightReportSummary,
  PlaywrightTestEntry,
} from '../al/al-cli-types.ts';
import type { PlaywrightStepResult } from '../core/types.ts';

export const PLAYWRIGHT_REPORT_FILE = 'playwright-report.json';

interface RawResult {
  status?: unknown;
  duration?: unknown;
  error?: { message?: unknown } | unknown;
}

interface RawTest {
  projectName?: unknown;
  status?: unknown;
  results?: unknown;
}

interface RawSpec {
  title?: unknown;
  file?: unknown;
  tests?: unknown;
}

interface RawSuite {
  title?: unknown;
  file?: unknown;
  specs?: unknown;
  suites?: unknown;
}

export interface RawPlaywrightReport {
  suites?: unknown;
  errors?: unknown;
  stats?: { duration?: unknown } | unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Structural check used before parsing anything the reporter wrote. */
export function isPlaywrightReport(value: unknown): value is RawPlaywrightReport {
  return isObject(value) && Array.isArray((value as RawPlaywrightReport).suites);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function finalResult(results: RawResult[]): RawResult | undefined {
  return results.length === 0 ? undefined : results[results.length - 1];
}

/** Any failed attempt's message, so a retry-recovered test still explains itself. */
function firstFailureMessage(results: RawResult[]): string | undefined {
  for (const result of results) {
    if (result.status !== 'passed') {
      const message = errorMessage(result);
      if (message) return message;
    }
  }
  return undefined;
}

function errorMessage(result: RawResult | undefined): string | undefined {
  const error = result?.error;
  if (!isObject(error) || typeof error.message !== 'string' || error.message.length === 0) return undefined;
  return error.message.trim();
}

/**
 * Playwright's own status rules: a test that failed and then passed on retry is `unexpected`
 * (exit code 1) unless the run passes `--fail-on-flaky-tests`. `flaky` is therefore counted
 * separately but does not turn a recovered test into a pass.
 */
function testStatus(test: RawTest, result: RawResult | undefined, results: RawResult[]): PlaywrightTestEntry['status'] {
  if (results.length === 0) return 'unknown';
  if (test.status === 'skipped') return 'skipped';

  const final = result?.status;
  if (final === 'passed') {
    // The reporter's own verdict wins; Playwright already accounts for retries.
    if (test.status === 'unexpected') return 'failed';
    return 'passed';
  }
  if (final === 'failed' || final === 'timedOut' || final === 'interrupted') return 'failed';
  if (final === 'skipped') return 'skipped';
  return 'unknown';
}

function collectSpecs(suite: RawSuite, titlePath: string[], file: string | undefined, into: PlaywrightTestEntry[]): void {
  const suiteTitle = typeof suite.title === 'string' && suite.title.length > 0 ? suite.title : undefined;
  const nextPath = suiteTitle ? [...titlePath, suiteTitle] : titlePath;
  const nextFile = typeof suite.file === 'string' && suite.file.length > 0 ? suite.file : file;

  for (const spec of asArray<RawSpec>(suite.specs)) {
    const title = typeof spec.title === 'string' ? spec.title : '<untitled>';
    const specFile = typeof spec.file === 'string' && spec.file.length > 0 ? spec.file : nextFile;
    const tests = asArray<RawTest>(spec.tests);

    if (tests.length === 0) {
      into.push({ title, titlePath: [...nextPath, title], status: 'unknown', attempts: 0, durationMs: 0, file: specFile });
      continue;
    }

    for (const test of tests) {
      const results = asArray<RawResult>(test.results);
      const result = finalResult(results);
      const duration = typeof result?.duration === 'number' && Number.isFinite(result.duration) ? result.duration : 0;
      const status = testStatus(test, result, results);

      into.push({
        title,
        titlePath: [...nextPath, title],
        status,
        attempts: results.length,
        durationMs: duration,
        file: specFile,
        error: status === 'failed' || status === 'passed' ? firstFailureMessage(results) : undefined,
      });
    }
  }

  for (const child of asArray<RawSuite>(suite.suites)) {
    if (isObject(child)) collectSpecs(child, nextPath, nextFile, into);
  }
}

/**
 * Parse a JSON report into a summary.
 * Never throws on a partially shaped tree; malformed tests become `unknown`.
 */
export function parsePlaywrightReport(
  report: RawPlaywrightReport,
  options: PlaywrightReportOptions = {}
): PlaywrightReportSummary {
  const allowFlaky = options.allowFlaky ?? false;
  const allowEmpty = options.allowEmpty ?? true;

  const tests: PlaywrightTestEntry[] = [];
  for (const suite of asArray<RawSuite>(report.suites)) {
    if (isObject(suite)) collectSpecs(suite, [], undefined, tests);
  }

  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  for (const test of tests) {
    const flaky = test.attempts > 1;
    if (flaky) counts.flaky += 1;
    if (test.status === 'passed') counts.passed += 1;
    else if (test.status === 'failed') counts.failed += 1;
    else if (test.status === 'skipped') counts.skipped += 1;
  }

  const errors = asArray<{ message?: unknown }>(report.errors)
    .map(error => (isObject(error) && typeof error.message === 'string' ? error.message.trim() : ''))
    .filter(Boolean);

  const stats = isObject(report.stats) ? (report.stats as { duration?: unknown }) : undefined;
  const durationMs = typeof stats?.duration === 'number' && Number.isFinite(stats.duration) ? stats.duration : 0;

  // `allowFlaky` mirrors `--fail-on-flaky-tests=off`: a retry-recovered test is forgiven,
  // but a genuinely failing test or a reporter error never is.
  const failedCleanly =
    errors.length === 0 && (counts.failed === 0 || (allowFlaky && counts.failed === counts.flaky));
  const hasEvidence = tests.length > 0 || allowEmpty;
  const allKnown = tests.every(test => test.status !== 'unknown');

  return {
    tests,
    counts,
    success: failedCleanly && hasEvidence && allKnown,
    durationMs,
    errors,
  };
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** One stable line for CI logs and the CLI. */
export function summarisePlaywrightReport(report: PlaywrightReportSummary): string {
  const { counts } = report;
  const total = report.tests.length;
  const headline =
    `Playwright: ${total} test${total === 1 ? '' : 's'}, ` +
    `${counts.passed} passed, ${counts.failed} failed, ${counts.flaky} flaky, ${counts.skipped} skipped ` +
    `in ${formatSeconds(report.durationMs)} — ${report.success ? 'PASSED' : 'FAILED'}`;

  if (report.success) return headline;

  const firstFailure = report.tests.find(test => test.status === 'failed');
  if (firstFailure) return `${headline}; first failure: ${firstFailure.title}`;
  if (report.errors.length > 0) return `${headline}; ${report.errors[0]}`;
  if (total === 0) return `${headline}; the report contained no tests`;
  return headline;
}

/** Map test entries onto the shared step shape the UI and agent plan consume. */
export function reportToStepResults(report: PlaywrightReportSummary): PlaywrightStepResult[] {
  return report.tests.map((test, index) => ({
    stepNumber: index + 1,
    title: test.title,
    action: 'assert_dom',
    selector: undefined,
    expectedOutcome: test.title,
    status: test.status === 'passed' ? 'passed' : test.status === 'failed' ? 'failed' : test.status === 'skipped' ? 'pending' : 'pending',
    durationMs: test.durationMs,
    consoleTrace: test.error,
  }));
}

/**
 * Build the CLI argument vector for a non-interactive run.
 * `--` separates Playwright options from spec filters.
 */
export function buildPlaywrightArgs(options: {
  testDir: string;
  config?: string;
  outputDir?: string;
  spec?: string;
  grep?: string;
  workers?: number;
  retries?: number;
}): string[] {
  const args = ['test', '--config', options.config ?? options.testDir, '--reporter', 'json'];
  if (options.grep) args.push('--grep', options.grep);
  if (options.workers !== undefined) args.push('--workers', String(options.workers));
  if (options.retries !== undefined) args.push('--retries', String(options.retries));
  // Last, so callers can assert on a stable tail regardless of optional switches.
  args.push('--output', options.outputDir ?? 'test-results');
  if (options.spec) args.push('--', options.spec);
  return args;
}
