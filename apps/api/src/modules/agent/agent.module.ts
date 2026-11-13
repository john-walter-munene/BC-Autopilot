/**
 * Agent module.
 * Overlay counterpart: apps/api/src/modules/<name>/<name>.module.ts
 */

export { AgentController, agentController } from "./agent.controller.ts";
export { AgentService, agentService, BC_AGENT_SYSTEM_PROMPT } from "./agent.service.ts";
export type * from "./dto/agent.dto.ts";