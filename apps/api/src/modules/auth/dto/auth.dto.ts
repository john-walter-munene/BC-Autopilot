/**
 * Authentication Module Types
 * Microsoft Entra ID (Azure AD) OAuth2 token credentials
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) auth types
 */

export interface EntraIdTokenResponse {
  token_type: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
}

export interface CachedToken {
  accessToken: string;
  expiresAt: number;
  tenantId: string;
}

export interface EntraIdCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}
