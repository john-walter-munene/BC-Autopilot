export interface VerifiableBuildRecord {
  buildId: string;
  frdId: string;
  projectName: string;
  timestamp: string;
  commitHash: string;
  packageChecksumSha256: string;
  settlementStatus: 'settled' | 'disputed' | 'in_progress';
  settlementSummary: {
    totalRequirements: number;
    passedRequirements: number;
    alCompilerScore: number; // 0-100%
    playwrightPassRate: number; // 0-100%
    apiComplianceScore: number; // 0-100%
  };
  proofPayload: {
    alFileCount: number;
    objectIdsAllocated: number[];
    appJsonId: string;
    targetRuntime: string;
    verifiedPlaywrightSteps: number;
    entraIdAuthVerified: boolean;
  };
  auditTrail: {
    step: string;
    status: 'passed' | 'failed';
    evidence: string;
    verifiedAt: string;
  }[];
}
