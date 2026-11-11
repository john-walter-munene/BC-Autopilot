/**
 * Orchestrator Domain Types
 * Agent pipeline stages and execution status
 */

export type PipelineStage = 
  | 'DOC_EXPLORATION'
  | 'REQUIREMENTS_PARSING'
  | 'AL_CODE_GENERATION'
  | 'PLAYWRIGHT_VERIFICATION'
  | 'NEXTJS_BRIDGE_GENERATION'
  | 'CRYPTOGRAPHIC_SEALING'
  | 'SETTLEMENT_AUDIT';

export interface PipelineExecutionProgress {
  sessionId: string;
  stage: PipelineStage;
  percent: number;
  message: string;
  timestamp: string;
}

export interface PipelineExecutionResult {
  sessionId: string;
  success: boolean;
  sha256Proof: string;
  settled: boolean;
  scorePercent: number;
  durationMs: number;
}
