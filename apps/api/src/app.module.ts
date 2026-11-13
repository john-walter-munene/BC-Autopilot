/**
 * Root application module.
 * Overlay counterpart: apps/api/src/app.module.ts
 *
 * Composes every domain module so the transport layer has one import surface.
 */

export * as alCompiler from "./modules/al-compiler/al-compiler.module.ts";
export * as auth from "./modules/auth/auth.service.ts";
export * as knowledge from "./modules/knowledge/knowledge.service.ts";
export * as requirements from "./modules/requirements/requirements.service.ts";
export * as browserAgent from "./modules/browser-agent/browser-agent.service.ts";
export * as apiGateway from "./modules/api-gateway/api-gateway.service.ts";
export * as repoImport from "./modules/repo-import/repo-import.service.ts";
export * as orchestrator from "./modules/orchestrator/orchestrator.service.ts";
export * as settlements from "./modules/settlements/settlements.service.ts";
export * as verification from "./modules/verification/verification.service.ts";
export * as settlementAnalytics from "./modules/settlement-analytics/settlement-analytics.service.ts";
export * as jobs from "./modules/jobs/jobs-queue.service.ts";
export * as businessCentral from "./integrations/business-central/index.ts";
export * as settlementWorker from "./workers/settlement.service.ts";