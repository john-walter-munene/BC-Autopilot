/**
 * Core Common Domain Types
 * Shared across services and modules in Alchemy365
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) common domain types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type EntityId = string;

export interface VerificationProof {
  sha256Hash: string;
  signature: string;
  timestamp: string;
  verified: boolean;
}
