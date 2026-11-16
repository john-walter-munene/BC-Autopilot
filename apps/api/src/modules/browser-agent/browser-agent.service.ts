/**
 * Browser Agent Service
 * Orchestrates Playwright browser automation against the Dynamics 365 Business Central web client.
 *
 * Execution delegates to the shared PlaywrightEvidencePipeline, so a status is derived from a
 * real Playwright report. This module never simulates a result.
 */

import fs from 'node:fs';
import { generatePlaywrightTestSuite } from '../../common/generators/playwright-generator.ts';
import {
  DEFAULT_STORAGE_STATE_PATH,
  PlaywrightEvidencePipeline,
  PlaywrightRunner,
  StorageStateService,
  type BrowserRunRequest,
  type BrowserRunResult,
  type PlaywrightSuite,
} from '@bc-agent/shared';

export interface BrowserExecutionOptions {
  /** Directory containing the Playwright config */
  testDir: string;
  /** Managed Entra ID storage state; defaults to `auth/bc-storage-state.json` */
  authStatePath?: string;
  outputDir?: string;
  baseUrl?: string;
  spec?: string;
  grep?: string;
  retention?: BrowserRunRequest['retention'];
}

export interface BrowserAgentDeps {
  /** Executes a suite; injected so the transport can be tested without a browser */
  pipeline: (request: BrowserRunRequest) => Promise<BrowserRunResult>;
  defaultAuthStatePath?: string;
}

export class BrowserAgentService {
  private readonly deps: BrowserAgentDeps;

  constructor(deps: BrowserAgentDeps) {
    this.deps = deps;
  }

  generateSuite(customFields: string[], targetPage = 'Customer Card'): PlaywrightSuite {
    return generatePlaywrightTestSuite(customFields, targetPage);
  }

  /**
   * Run a suite against a managed session.
   * Errors thrown by the pipeline propagate — a crash must never look like a pass.
   */
  async executeSuite(options: BrowserExecutionOptions): Promise<BrowserRunResult> {
    return this.deps.pipeline({
      testDir: options.testDir,
      authStatePath: options.authStatePath ?? this.deps.defaultAuthStatePath ?? 'auth/bc-storage-state.json',
      outputDir: options.outputDir,
      baseUrl: options.baseUrl,
      spec: options.spec,
      grep: options.grep,
      retention: options.retention,
    });
  }
}

/**
 * Composition root for the API: the only place a real (non-simulated) browser pipeline
 * is constructed. Tests inject their own `pipeline` and never load this.
 */
export function createBrowserAgentService(options: { rootDir?: string } = {}): BrowserAgentService {
  const rootDir = options.rootDir ?? process.cwd();
  const outputDir = 'test-results';

  const pipeline = new PlaywrightEvidencePipeline({
    runner: new PlaywrightRunner({ rootDir }),
    storageState: new StorageStateService({ cwd: rootDir }),
    inspectStorageState: (statePath, inspectOptions) => new StorageStateService({ cwd: rootDir }).resolve(statePath, inspectOptions),
    evidence: {
      readDir: dir => fs.readdirSync(dir),
      readFile: filePath => fs.readFileSync(filePath),
      writeFile: (filePath, data) => fs.writeFileSync(filePath, data),
      mkdir: dir => fs.mkdirSync(dir, { recursive: true }),
      remove: target => fs.rmSync(target, { recursive: true, force: true }),
      exists: target => fs.existsSync(target),
      now: () => new Date(),
    },
    rootDir,
    outputDir,
  });

  return new BrowserAgentService({
    pipeline: request => pipeline.run(request),
    defaultAuthStatePath: DEFAULT_STORAGE_STATE_PATH,
  });
}
