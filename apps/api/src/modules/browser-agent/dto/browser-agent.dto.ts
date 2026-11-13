/**
 * Browser Agent Domain Types
 * Playwright automation test cases, execution telemetry, and page actions
 */

import type { PlaywrightSuite, PlaywrightTestCase } from '@bc-agent/shared';

export type { PlaywrightSuite, PlaywrightTestCase };

export interface BrowserExecutionSession {
  suiteId: string;
  targetUrl: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  tests: PlaywrightTestCase[];
  executedAt?: string;
  totalDurationMs?: number;
}
