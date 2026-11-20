/**
 * Entra ID client-credentials token provider.
 * Phase 3: one cached, retried, per-credential server token for every Business Central call.
 *
 * Boundaries are injected (`fetch`, clock, sleep) so cache scoping, retry policy and
 * redaction are unit-testable without a tenant.
 */

import { BC_CONSTANTS } from '../core/constants.ts';
import { EntraIdAuthError } from '../core/errors.ts';

/** Refresh this long before the token actually expires. */
export const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 15_000;
const BASE_BACKOFF_MS = 250;

export interface TokenRequest {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Override the default `https://api.businesscentral.dynamics.com/.default` scope */
  scope?: string;
}

export interface AccessToken {
  accessToken: string;
  /** Absolute epoch milliseconds */
  expiresAt: number;
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface TokenProviderDeps {
  /** Injected transport (defaults to global fetch) */
  fetch?: FetchLike;
  now?: () => number;
  /** Injected backoff wait */
  sleep?: (ms: number) => Promise<void>;
  /** Attempts per fetch, including the first (default 3) */
  maxAttempts?: number;
  /** Per-attempt timeout (default 15s) */
  timeoutMs?: number;
  /** Refresh skew before expiry (default 5 minutes) */
  refreshSkewMs?: number;
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** A transport failure we already decided not to retry (bad credentials, malformed response). */
class PermanentTokenError extends EntraIdAuthError {
  readonly retryable = false;
}

class RetryableTokenError extends EntraIdAuthError {
  readonly retryable = true;
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function retryAfterMs(header: string | null, attempt: number): number {
  const seconds = header === null ? Number.NaN : Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return BASE_BACKOFF_MS * 2 ** (attempt - 1);
}

/** Remove anything that looks like a credential before it reaches a log or an error. */
function redact(message: string, secrets: string[]): string {
  return secrets
    .filter(secret => secret.length > 0)
    .reduce((text, secret) => text.split(secret).join('[redacted]'), message);
}

interface CacheEntry {
  token: AccessToken;
  /** In-flight request, shared by concurrent callers */
  pending?: Promise<AccessToken>;
}

export class EntraIdTokenProvider {
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly refreshSkewMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(deps: TokenProviderDeps = {}) {
    this.fetchImpl = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.now = deps.now ?? (() => Date.now());
    this.sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.maxAttempts = Math.max(1, deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.refreshSkewMs = deps.refreshSkewMs ?? TOKEN_REFRESH_SKEW_MS;
  }

  /** Number of credential sets currently cached (for health reporting). */
  get cachedCount(): number {
    return this.cache.size;
  }

  /**
   * Return a valid access token, fetching one only when the cache is cold or inside the skew window.
   * Concurrent callers for the same credentials share a single request.
   */
  async getToken(request: TokenRequest): Promise<AccessToken> {
    this.assertComplete(request);
    const key = this.cacheKey(request);

    const cached = this.cache.get(key);
    if (cached?.pending) return cached.pending;
    if (cached && cached.token.expiresAt - this.refreshSkewMs > this.now()) return cached.token;

    const pending = this.fetchToken(request).then(
      token => {
        this.cache.set(key, { token });
        return token;
      },
      error => {
        this.cache.delete(key);
        throw error;
      }
    );

    this.cache.set(key, { token: cached?.token ?? { accessToken: '', expiresAt: 0 }, pending });
    return pending;
  }

  /** Drop every cached token (used after a 401 or on credential rotation). */
  clear(): void {
    this.cache.clear();
  }

  /**
   * The cache key must include the secret: a rotated secret has to produce a new token,
   * and two tenants must never share one. The value itself is hashed, never stored raw.
   */
  private cacheKey(request: TokenRequest): string {
    return `${request.tenantId}\u0000${request.clientId}\u0000${fingerprint(request.clientSecret)}`;
  }

  private assertComplete(request: TokenRequest): void {
    if (!request.tenantId?.trim()) throw new EntraIdAuthError('Entra ID tenant id is required');
    if (!request.clientId?.trim()) throw new EntraIdAuthError('Entra ID client id is required');
    if (!request.clientSecret) throw new EntraIdAuthError('Entra ID client secret is required');
  }

  private async fetchToken(request: TokenRequest): Promise<AccessToken> {
    // Read the clock once: a moving clock would make `expiresAt` drift per attempt.
    const issuedAt = this.now();
    const url = `https://login.microsoftonline.com/${encodeURIComponent(request.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: request.clientId,
      client_secret: request.clientSecret,
      scope: request.scope ?? BC_CONSTANTS.MICROSOFT_ENTRA_SCOPE,
    }).toString();

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Awaited<ReturnType<FetchLike>>;
      try {
        response = await this.request(url, body);
      } catch (error) {
        // Transport failures (DNS, reset, timeout) are retryable.
        lastError = new EntraIdAuthError(
          redact(error instanceof Error ? error.message : String(error), [request.clientSecret])
        );
        if (attempt >= this.maxAttempts) throw lastError;
        await this.sleep(retryAfterMs(null, attempt));
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        access_token?: unknown;
        expires_in?: unknown;
        error?: unknown;
        error_description?: unknown;
      };

      if (!response.ok) {
        const detail = typeof payload.error === 'string' ? payload.error : '';
        const description = typeof payload.error_description === 'string' ? payload.error_description : response.statusText;
        const message = redact(
          `Entra ID token request failed (${response.status})${detail ? `: ${detail}` : ''} ${description}`.trim(),
          [request.clientSecret]
        );

        if (!isRetryable(response.status)) throw new PermanentTokenError(message);

        lastError = new RetryableTokenError(message, response.status);
        if (attempt < this.maxAttempts) {
          await this.sleep(retryAfterMs(response.headers.get('retry-after'), attempt));
          continue;
        }
        throw lastError;
      }

      const accessToken = payload.access_token;
      const expiresIn = payload.expires_in;
      if (typeof accessToken !== 'string' || accessToken.length === 0) {
        throw new PermanentTokenError('Entra ID response did not contain an access_token');
      }
      if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new PermanentTokenError('Entra ID response contained an invalid expires_in');
      }

      return { accessToken, expiresAt: issuedAt + expiresIn * 1000 };
    }

    throw lastError ?? new EntraIdAuthError('Entra ID token request failed');
  }

  private request(url: string, body: string) {
    return this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}

/** Non-reversible 64-bit fingerprint, so the cache key never holds the secret. */
function fingerprint(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export const entraIdTokenProvider = new EntraIdTokenProvider();
