/**
 * Managed Playwright storage state (Entra ID session reuse).
 * Phase 2: replay a captured Business Central web client session into headless runs
 * without ever surfacing cookie values or requiring an interactive login per run.
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  StorageStateDeps,
  StorageStateInspection,
  StorageStateResolveOptions,
} from '../al/al-cli-types.ts';

/** Folder (relative to the project root) that holds the captured session. */
export const DEFAULT_STORAGE_STATE_PATH = path.join('auth', 'bc-storage-state.json');

/**
 * Cookies the Business Central web client and its front door set once a user
 * has signed in through Entra ID. ARRAffinity is a session cookie (expires = -1).
 */
export const BC_AUTH_COOKIE_NAMES: readonly string[] = [
  'BC.AccessToken',
  'ARRAffinity',
  'ARRAffinitySameSite',
  'msal.account.keys',
  'msal.token.keys',
];

const BC_DOMAIN_PATTERN = /businesscentral\.dynamics\.com$/i;

interface RawCookie {
  name?: unknown;
  value?: unknown;
  domain?: unknown;
  path?: unknown;
  expires?: unknown;
}

interface ParsedState {
  cookies: RawCookie[];
  origins: unknown[];
}

function isCookieArray(value: unknown): value is RawCookie[] {
  return Array.isArray(value) && value.every(item => item !== null && typeof item === 'object');
}

/** Parse a state file defensively. Returns `null` plus a reason rather than throwing. */
function parseState(raw: string): { state: ParsedState } | { reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: 'storage state could not be parsed as JSON' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { reason: 'file is not a Playwright storage state' };
  }

  const candidate = parsed as { cookies?: unknown; origins?: unknown; capturedAt?: unknown };
  if (!isCookieArray(candidate.cookies)) {
    return { reason: 'file is not a Playwright storage state (cookies must be an array)' };
  }
  const origins = Array.isArray(candidate.origins) ? candidate.origins : [];

  return { state: { cookies: candidate.cookies, origins } };
}

/**
 * A cookie qualifies when it belongs to the Business Central tenant host. The known
 * cookie names are listed for documentation, but the domain is the authority: BC
 * rotates cookie names between platform builds and drops the affinity cookie on
 * session-only captures.
 */
function isBcSessionCookie(cookie: RawCookie): boolean {
  if (typeof cookie.name !== 'string' || cookie.name.length === 0) return false;
  const domain = typeof cookie.domain === 'string' ? cookie.domain.replace(/^\./, '') : '';
  return BC_DOMAIN_PATTERN.test(domain);
}

function expiryMs(cookie: RawCookie): number | undefined {
  if (typeof cookie.expires !== 'number' || !Number.isFinite(cookie.expires) || cookie.expires <= 0) return undefined;
  return cookie.expires * 1000;
}

/**
 * Inspect a serialised storage state without touching the disk.
 * Never returns cookie values — callers may log the result verbatim.
 */
export function inspectStorageState(raw: string, nowMs: number, filePath = ''): StorageStateInspection {
  const empty: StorageStateInspection = {
    present: true,
    valid: false,
    path: filePath,
    cookieCount: 0,
    originCount: 0,
    sessionCookiePresent: false,
    reasons: [],
  };

  const parsed = parseState(raw);
  if ('reason' in parsed) return { ...empty, reasons: [parsed.reason] };

  const { cookies, origins } = parsed.state;
  const sessionCookies = cookies.filter(isBcSessionCookie);
  const reasons: string[] = [];

  if (cookies.length === 0 && origins.length === 0) {
    reasons.push('storage state is empty');
  }
  if (sessionCookies.length === 0) {
    reasons.push('no Business Central session cookie present');
  }

  const expiries = sessionCookies
    .map(expiryMs)
    .filter((value): value is number => value !== undefined);
  const expiresAt = expiries.length > 0 ? Math.min(...expiries) : undefined;

  if (expiresAt !== undefined && expiresAt <= nowMs) {
    reasons.push(`Business Central session expired at ${new Date(expiresAt).toISOString()}`);
  }

  return {
    present: true,
    valid: reasons.length === 0,
    path: filePath,
    cookieCount: cookies.length,
    originCount: origins.length,
    sessionCookiePresent: sessionCookies.length > 0,
    expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt).toISOString(),
    reasons,
  };
}

/** One-line, secret-free description of an inspection result. */
export function summariseStorageState(state: StorageStateInspection): string {
  if (!state.present) return `Storage state ${state.path || '<unset>'}: not found`;
  const scope = `${state.cookieCount} cookie${state.cookieCount === 1 ? '' : 's'}, ${state.originCount} origin${state.originCount === 1 ? '' : 's'}`;
  if (state.valid) {
    const expiry = state.expiresAt ? `, expires ${state.expiresAt}` : ', session cookies only';
    return `Storage state ${state.path}: valid (${scope}${expiry})`;
  }
  return `Storage state ${state.path}: unusable (${scope}) — ${state.reasons.join('; ')}`;
}

export class StorageStateService {
  private readonly deps: Required<Pick<StorageStateDeps, 'readFile' | 'writeFile' | 'mkdir' | 'fileExists' | 'now'>>;
  private readonly cwd: string;

  constructor(deps: StorageStateDeps = {}) {
    this.deps = {
      readFile: deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath, 'utf8')),
      writeFile: deps.writeFile ?? ((filePath: string, data: string) => fs.writeFileSync(filePath, data, 'utf8')),
      mkdir: deps.mkdir ?? ((dir: string) => fs.mkdirSync(dir, { recursive: true })),
      fileExists: deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath)),
      now: deps.now ?? (() => new Date()),
    };
    this.cwd = deps.cwd ?? process.cwd();
  }

  /** Resolve a state path the way Playwright does: absolute stays, relative joins the project root. */
  resolvePath(statePath: string, options: StorageStateResolveOptions = {}): string {
    const base = options.cwd ?? this.cwd;
    return path.isAbsolute(statePath) ? path.normalize(statePath) : path.resolve(base, statePath);
  }

  /** Read and validate a state file. Missing files are reported, never thrown. */
  resolve(statePath: string, options: StorageStateResolveOptions = {}): StorageStateInspection {
    const resolved = this.resolvePath(statePath, options);
    if (!this.deps.fileExists(resolved)) {
      return {
        present: false,
        valid: false,
        path: resolved,
        cookieCount: 0,
        originCount: 0,
        sessionCookiePresent: false,
        reasons: [`storage state file not found at ${resolved}`],
      };
    }

    let raw: string;
    try {
      raw = this.deps.readFile(resolved);
    } catch (error) {
      return {
        present: true,
        valid: false,
        path: resolved,
        cookieCount: 0,
        originCount: 0,
        sessionCookiePresent: false,
        reasons: [`storage state could not be read: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    return inspectStorageState(raw, this.deps.now().getTime(), resolved);
  }

  /**
   * Persist a captured state (as produced by Playwright's `storageState()`).
   * Refuses to write a state that holds no BC session so a broken capture never masks the next run.
   */
  capture(statePath: string, rawState: string): StorageStateInspection {
    const resolved = this.resolvePath(statePath);
    const inspection = inspectStorageState(rawState, this.deps.now().getTime(), resolved);

    const parsed = parseState(rawState);
    if ('reason' in parsed) throw new Error(`Cannot capture storage state: ${parsed.reason}`);
    if (!inspection.sessionCookiePresent) {
      throw new Error(
        'Cannot capture storage state: no Business Central session cookie present. Sign in to the web client first.'
      );
    }

    const payload = {
      cookies: parsed.state.cookies,
      origins: parsed.state.origins,
      capturedAt: this.deps.now().toISOString(),
    };

    this.deps.mkdir(path.dirname(resolved));
    this.deps.writeFile(resolved, JSON.stringify(payload, null, 2));
    return inspectStorageState(JSON.stringify(payload), this.deps.now().getTime(), resolved);
  }

  /** Return the state path, or throw with an actionable message. Use before spawning a run. */
  requireUsable(statePath: string, options: StorageStateResolveOptions = {}): string {
    const inspection = this.resolve(statePath, options);
    if (inspection.valid) return inspection.path;

    const hint = inspection.present
      ? `Run the CLI login command to capture a fresh session: ${inspection.reasons.join('; ')}`
      : `Run the CLI login command to capture a session at ${inspection.path}, or pass --auth-state <path>.`;
    throw new Error(`Storage state is not usable. ${hint}`);
  }
}

export const storageStateService = new StorageStateService();
