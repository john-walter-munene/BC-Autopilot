/**
 * Settlement worker.
 * Overlay counterpart: apps/api/src/workers/settlement.service.ts
 *
 * Drains the settlement queue and hands each job to the settlement engine.
 */

import { computeBuildSettlement } from "../modules/settlements/settlements.service.ts";
import type {
  BuildSettlementInput,
  CompilerResultInput,
  SettlementRuleInput,
} from "../modules/settlements/dto/settlements.dto.ts";

export interface SettlementJob {
  id: string;
  build: BuildSettlementInput;
  rules: SettlementRuleInput[];
  compiler: CompilerResultInput;
}

export interface SettlementJobResult {
  jobId: string;
  status: "SETTLED" | "DISPUTED";
  scorePercent: number;
  fingerprint: string;
}

export class SettlementWorker {
  private pending: SettlementJob[] = [];

  enqueue(job: SettlementJob): void {
    this.pending.push(job);
  }

  pendingCount(): number {
    return this.pending.length;
  }

  /** Drain every queued job. Returns one result per job, in FIFO order. */
  drain(): SettlementJobResult[] {
    const jobs = this.pending;
    this.pending = [];
    return jobs.map(job => this.process(job));
  }

  process(job: SettlementJob): SettlementJobResult {
    const result = computeBuildSettlement(job.build, job.rules, job.compiler);
    return {
      jobId: job.id,
      status: result.status,
      scorePercent: result.scorePercent,
      fingerprint: result.verifiableCertificate.sha256Fingerprint,
    };
  }
}

export const settlementWorker = new SettlementWorker();