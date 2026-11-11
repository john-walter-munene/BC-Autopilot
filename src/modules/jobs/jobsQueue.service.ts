/**
 * Asynchronous Jobs Queue Service (BullMQ / Redis in-memory implementation)
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) background queue architecture
 */

import type { BackgroundJobPayload, JobType as BaseJobType } from './types.ts';

export type JobType = 'al_compilation' | 'playwright_browser_test' | 'doc_crawling_sweep' | 'settlement_audit' | BaseJobType;
export type JobStatus = 'queued' | 'active' | 'completed' | 'failed';

export interface BackgroundJob<T = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0 to 100
  data: T;
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  logs: string[];
}

export class JobsQueueService {
  private jobs: Map<string, BackgroundJob> = new Map();

  createJob<T>(type: JobType, data: T): BackgroundJob<T> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: BackgroundJob<T> = {
      id,
      type,
      status: 'queued',
      progress: 0,
      data,
      createdAt: new Date().toISOString(),
      logs: [`[Queue] Job ${id} created of type ${type}`]
    };
    this.jobs.set(id, job as BackgroundJob<unknown>);
    return job;
  }

  getJob(id: string): BackgroundJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async dequeueNextJob(): Promise<BackgroundJobPayload | null> {
    for (const job of this.jobs.values()) {
      if (job.status === 'queued') {
        job.status = 'active';
        job.startedAt = new Date().toISOString();
        return {
          id: job.id,
          type: (job.type.toUpperCase() as unknown) as BaseJobType,
          sessionId: (job.data as Record<string, unknown>)?.sessionId ? String((job.data as Record<string, unknown>).sessionId) : 'default-session',
          data: (job.data as Record<string, unknown>) || {},
          createdAt: new Date(job.createdAt).getTime()
        };
      }
    }
    return null;
  }

  async markJobCompleted(id: string, result: unknown): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toISOString()}] Job completed successfully.`);
  }

  async markJobFailed(id: string, error: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date().toISOString();
    job.logs.push(`[Error] ${error}`);
  }

  updateProgress(id: string, progress: number, logMessage?: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.progress = Math.min(100, Math.max(0, progress));
    job.status = job.progress === 100 ? 'completed' : 'active';
    if (!job.startedAt) job.startedAt = new Date().toISOString();
    if (job.status === 'completed') job.completedAt = new Date().toISOString();
    if (logMessage) job.logs.push(`[${new Date().toISOString()}] ${logMessage}`);
  }

  failJob(id: string, error: string): void {
    this.markJobFailed(id, error);
  }
}

export const jobsQueueService = new JobsQueueService();
export const globalJobsQueue = jobsQueueService;
