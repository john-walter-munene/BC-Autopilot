/**
 * Session capture for headless runs.
 * Phase 2: turns an interactive Entra ID login into the storage state `browse` requires.
 *
 * The browser is injected, so the flow is testable without launching Chromium.
 */

import type { StorageStateInspection } from '../al/al-cli-types.ts';
import type { StorageStateService } from './storage-state.ts';

/** The minimal Playwright surface the capture needs. */
export interface BrowserLike {
  launch(options: { headless: boolean }): Promise<{
    newContext(init: { storageState?: string }): Promise<{
      newPage(): Promise<{ goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown> }>;
      storageState(): Promise<string>;
      close(): Promise<void>;
    }>;
    close(): Promise<void>;
  }>;
}

export interface SessionCaptureRequest {
  /** Business Central web client URL the operator signs in to */
  url: string;
  /** Where the captured state is written */
  outPath: string;
}

export interface SessionCaptureDeps {
  browser: BrowserLike;
  storageState: Pick<StorageStateService, 'capture'>;
  /** Resolves when the operator has finished signing in */
  waitForOperator: () => Promise<void>;
  /** Navigation timeout (default 60s) */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Open a headed browser, let the operator complete the Entra ID sign-in, then persist the
 * session. Refuses to write a state that holds no Business Central session cookie.
 */
export async function captureBusinessCentralSession(
  request: SessionCaptureRequest,
  deps: SessionCaptureDeps
): Promise<StorageStateInspection> {
  if (!/^https:\/\//i.test(request.url)) {
    throw new Error(`The sign-in URL must be https, got: ${request.url}`);
  }

  const browser = await deps.browser.launch({ headless: false });
  try {
    const context = await browser.newContext({});
    const page = await context.newPage();

    await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS });
    await deps.waitForOperator();

    const raw = await context.storageState();
    await context.close();

    // `capture` validates and refuses an empty session before touching the destination.
    return deps.storageState.capture(request.outPath, raw);
  } finally {
    await browser.close();
  }
}
