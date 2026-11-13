/**
 * Verification & Quality Audit Domain Types
 * Validates AL compiler diagnostics, Playwright test assertions, and generates release audit certificates
 */

import type { AlFile, FunctionalRequirementDoc, PlaywrightSuite } from '@bc-agent/shared';

export interface VerificationAuditSummary {
  totalRequirements: number;
  passedRequirements: number;
  alCompilerScore: number;
  playwrightPassRate: number;
  apiComplianceScore: number;
}

export interface VerificationAuditRecord {
  buildId: string;
  frdId: string;
  projectName: string;
  timestamp: string;
  commitHash: string;
  packageChecksumSha256: string;
  status: 'verified' | 'failed' | 'in_progress';
  summary: VerificationAuditSummary;
  proofPayload: {
    alFileCount: number;
    objectIdsAllocated: number[];
    appJsonId: string;
    targetRuntime: string;
    verifiedPlaywrightSteps: number;
    entraIdAuthVerified: boolean;
  };
  auditTrail: Array<{
    step: string;
    status: 'passed' | 'failed';
    evidence: string;
    verifiedAt: string;
  }>;
}

export interface VerificationAnalyticsSummary {
  totalBuildsVerified: number;
  verifiedCount: number;
  failedCount: number;
  verificationPassRate: number;
  averageQualityScore: number;
  cryptographicIntegrityPercent: number;
  auditDurationMs: number;
}
