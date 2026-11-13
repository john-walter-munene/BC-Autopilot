import { BC_CONSTANTS } from '@bc-agent/shared';
import { EntraIdAuthError } from '@bc-agent/shared';

export interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

export class EntraIdAuthService {
  private cache: TokenCacheEntry | null = null;

  async getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now + 60000) {
      return this.cache.accessToken;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: BC_CONSTANTS.MICROSOFT_ENTRA_SCOPE,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new EntraIdAuthError(`Entra ID OAuth failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache = {
        accessToken: data.access_token,
        expiresAt: now + (data.expires_in * 1000),
      };
      return this.cache.accessToken;
    } catch (err: any) {
      throw new EntraIdAuthError(err.message);
    }
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const entraIdAuthService = new EntraIdAuthService();
