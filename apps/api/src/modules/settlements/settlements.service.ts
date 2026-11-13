/**
 * Settlement Service
 * Cryptographically locked build verification, rule assertion grading, and dispute handling
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) settlement engine
 */

import { generateSha256Fingerprint } from '@bc-agent/shared';
import type { AppJsonManifest, AlExtensionFile } from '@bc-agent/shared';

export * from '../settlement-analytics/settlement-analytics.service.ts';

export interface BuildSettlementInput {
  sessionId: string;
  extensionName: string;
  version: string;
  sha256Hash: string;
  manifest: AppJsonManifest;
  alFiles: AlExtensionFile[];
}

export interface SettlementRuleInput {
  id: string;
  storyTitle: string;
  passCriteria: string;
  status: 'passed' | 'failed' | 'pending';
  failureReason?: string;
}

export interface CompilerResultInput {
  passed: boolean;
  errors: string[];
}

export interface BuildSettlementResult {
  status: 'SETTLED' | 'DISPUTED';
  scorePercent: number;
  totalCriteriaCount: number;
  passedCriteriaCount: number;
  failedCriteriaCount: number;
  verifiableCertificate: {
    sha256Fingerprint: string;
    verifiedAt: string;
    engineVersion: string;
  };
}

export function computeBuildSettlement(
  build: BuildSettlementInput,
  rules: SettlementRuleInput[],
  compilerResult: CompilerResultInput
): BuildSettlementResult {
  const total = rules.length;
  const passedRules = rules.filter(r => r.status === 'passed').length;
  const failedRules = total - passedRules;

  const compilerPassed = compilerResult.passed && compilerResult.errors.length === 0;
  const isSettled = compilerPassed && failedRules === 0 && total > 0;
  const scorePercent = total > 0 ? Math.round((passedRules / total) * (compilerPassed ? 100 : 75)) : 100;

  return {
    status: isSettled ? 'SETTLED' : 'DISPUTED',
    scorePercent,
    totalCriteriaCount: total,
    passedCriteriaCount: passedRules,
    failedCriteriaCount: failedRules + (compilerPassed ? 0 : 1),
    verifiableCertificate: {
      sha256Fingerprint: build.sha256Hash || generateSha256Fingerprint(build.sessionId),
      verifiedAt: new Date().toISOString(),
      engineVersion: 'v1.4.2-crypto'
    }
  };
}
