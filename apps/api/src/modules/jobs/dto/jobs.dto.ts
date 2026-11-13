/**
 * Types for Background Job Queue (BullMQ style)
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) jobs architecture
 */

export type JobType = 
  | 'SWEEP_MS_DOCS'
  | 'COMPILE_AL_PACKAGE'
  | 'RUN_PLAYWRIGHT_SUITE'
  | 'GENERATE_ODATA_BRIDGE'
  | 'COMPUTE_SETTLEMENT';

export interface BackgroundJobPayload<T = Record<string, unknown>> {
  id: string;
  type: JobType;
  sessionId: string;
  data: T;
  createdAt: number;
}

export interface JobExecutionResult {
  jobId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}
