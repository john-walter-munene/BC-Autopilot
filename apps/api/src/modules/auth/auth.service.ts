/**
 * Entra ID auth service (API adapter).
 *
 * Token acquisition, caching, retry and redaction live in
 * `packages/shared/src/bc/token-provider.ts`. This class only adapts that provider to the
 * shape the API modules expect, so there is exactly one token implementation in the repo.
 */

import { entraIdTokenProvider, type EntraIdTokenProvider } from '@bc-agent/shared';

export interface EntraIdAuthDeps {
  provider: Pick<EntraIdTokenProvider, 'getToken' | 'clear'>;
}

export class EntraIdAuthService {
  private readonly provider: EntraIdAuthDeps['provider'];

  constructor(deps: EntraIdAuthDeps = { provider: entraIdTokenProvider }) {
    this.provider = deps.provider;
  }

  /** Return a bearer token for these exact credentials (cached per tenant/client/secret). */
  async getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
    const token = await this.provider.getToken({ tenantId, clientId, clientSecret });
    return token.accessToken;
  }

  /** Discard every cached token (e.g. after a 401 or on credential rotation). */
  clearCache(): void {
    this.provider.clear();
  }
}

export const entraIdAuthService = new EntraIdAuthService();
