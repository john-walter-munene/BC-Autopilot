/**
 * Business Central OData v4 client.
 * Phase 3: every call rides a cached Entra ID token, maps OData failures onto typed
 * domain errors, and recovers once from an expired token — without duplicating writes.
 */

import { BcODataError, type BcODataErrorKind } from './bc-odata-error.ts';
import type { AccessToken, FetchLike, TokenRequest } from './token-provider.ts';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PAGES = 50;

export type ODataQuery = Record<string, string | number | boolean | undefined>;

export interface ODataClientDeps {
  /** Tenant root, e.g. `https://api.businesscentral.dynamics.com/v2.0/<tenant>/<env>/api/v2.0` */
  baseUrl: string;
  /** Injected token source; the client never reads environment variables */
  tokenProvider: {
    getToken(request: TokenRequest): Promise<AccessToken>;
    clear(): void;
  };
  credentials: TokenRequest;
  fetch?: FetchLike;
  timeoutMs?: number;
}

export interface ODataPage<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

/** Build a URL from the base, entity set and OData query parameters. */
export function buildODataUrl(baseUrl: string, entitySet: string, query: ODataQuery = {}): string {
  const root = baseUrl.replace(/\/+$/, '');
  const path = entitySet.replace(/^\/+/, '');
  // @odata.nextLink is already absolute; never prefix it again.
  const base = /^[a-z][a-z0-9+.-]*:\/\//i.test(path) ? path : `${root}/${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return search.length > 0 ? `${base}?${search}` : base;
  return search.length > 0 ? `${base}${base.includes('?') ? '&' : '?'}${search}` : base;
}

function classify(status: number): { kind: BcODataErrorKind; retryable: boolean } {
  if (status === 401) return { kind: 'unauthorized', retryable: false };
  if (status === 403) return { kind: 'forbidden', retryable: false };
  if (status === 404) return { kind: 'not_found', retryable: false };
  if (status === 409) return { kind: 'conflict', retryable: false };
  if (status === 429) return { kind: 'rate_limited', retryable: true };
  if (status >= 500) return { kind: 'server', retryable: true };
  if (status >= 400) return { kind: 'validation', retryable: false };
  return { kind: 'server', retryable: false };
}

/** Pull `code`/`message` out of the OData error envelope, tolerating any shape. */
function describeODataError(payload: unknown, fallback: string): { message: string; code?: string } {
  if (payload === null || typeof payload !== 'object') return { message: fallback };
  const error = (payload as { error?: unknown }).error;
  if (error === null || typeof error !== 'object') return { message: fallback };

  const { code, message } = error as { code?: unknown; message?: unknown };
  const parts = [typeof code === 'string' ? code : undefined, typeof message === 'string' ? message : undefined].filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  );
  return { message: parts.length > 0 ? parts.join(' — ') : fallback, code: typeof code === 'string' ? code : undefined };
}

export class ODataClient {
  private readonly deps: ODataClientDeps;
  private readonly fetchImpl: FetchLike;

  constructor(deps: ODataClientDeps) {
    this.deps = deps;
    this.fetchImpl = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  }

  get<T>(entitySet: string, query: ODataQuery = {}): Promise<T> {
    return this.send<T>('GET', entitySet, query);
  }

  post<T>(entitySet: string, body: unknown): Promise<T> {
    return this.send<T>('POST', entitySet, {}, body);
  }

  patch<T>(entitySet: string, body: unknown): Promise<T> {
    return this.send<T>('PATCH', entitySet, {}, body);
  }

  delete(entitySet: string): Promise<void> {
    return this.send<void>('DELETE', entitySet, {});
  }

  /** Follow `@odata.nextLink`, bounded by `maxPages` so a bad link cannot loop forever. */
  async getAll<T>(entitySet: string, query: ODataQuery = {}, options: { maxPages?: number } = {}): Promise<T[]> {
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const records: T[] = [];
    let url: string | undefined = buildODataUrl(this.deps.baseUrl, entitySet, query);
    let page = 0;

    while (url && page < maxPages) {
      const result: ODataPage<T> | T[] = await this.send<ODataPage<T> | T[]>('GET', url, {});
      const envelope: ODataPage<T> = Array.isArray(result) ? { value: result } : result;
      records.push(...(envelope.value ?? []));
      url = envelope['@odata.nextLink'];
      page += 1;
    }

    return records;
  }

  private async send<T>(method: string, entitySet: string, query: ODataQuery, body?: unknown): Promise<T> {
    const verb = method;
    const url = buildODataUrl(this.deps.baseUrl, entitySet, query);

    let response = await this.request(verb, url, entitySet, body);

    // One recovery: a stale token is discarded and the idempotent request replayed.
    if (response.status === 401) {
      this.deps.tokenProvider.clear();
      if (verb !== 'GET') {
        await this.errorFor(response, verb, entitySet);
      }
      response = await this.request(verb, url, entitySet, body);
    }

    if (!response.ok) await this.errorFor(response, verb, entitySet);
    if (verb === 'DELETE' || response.status === 204) return undefined as T;

    return (await response.json().catch(() => ({}))) as T;
  }

  private async request(method: string, url: string, entitySet: string, body: unknown) {
    const token = await this.deps.tokenProvider.getToken(this.deps.credentials);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
      return await this.fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      throw this.transportError(error, method, entitySet);
    }
  }

  private async errorFor(
    response: Awaited<ReturnType<FetchLike>>,
    method: string,
    entitySet: string
  ): Promise<never> {
    const payload = await response.json().catch(() => undefined);
    throw this.buildError(response, payload, method, entitySet);
  }

  private buildError(
    response: Awaited<ReturnType<FetchLike>>,
    payload: unknown,
    method: string,
    entitySet: string
  ): BcODataError {
    const { kind, retryable } = classify(response.status);
    const { message, code } = describeODataError(payload, response.statusText || `${method} ${entitySet} failed`);

    return new BcODataError(`${method} ${entitySet} failed (${response.status}): ${message}`, {
      kind,
      status: response.status,
      odataCode: code,
      retryable,
      request: { method, entitySet },
    });
  }

  private transportError(error: unknown, method: string, entitySet: string): BcODataError {
    const name = error instanceof Error ? error.name : '';
    const detail = error instanceof Error ? error.message : String(error);
    const timeout = name === 'TimeoutError' || name === 'AbortError';
    const message = timeout
      ? `${method} ${entitySet} timed out`
      : `${method} ${entitySet} could not reach Business Central: ${detail}`;

    return new BcODataError(message, {
      kind: timeout ? 'timeout' : 'network',
      status: null,
      retryable: true,
      request: { method, entitySet },
    });
  }
}

export function createODataClient(deps: ODataClientDeps): ODataClient {
  return new ODataClient(deps);
}
