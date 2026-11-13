/**
 * Agent controller: Gemini-backed reasoning routes.
 * Overlay counterpart: apps/api/src/modules/<name>/<name>.controller.ts
 *
 * Each handler returns a plain object; the transport layer (main.ts) serialises it.
 */

import { AgentService, agentService } from "./agent.service.ts";
import { knowledgeService } from "../knowledge/knowledge.service.ts";
import { requirementsService } from "../requirements/requirements.service.ts";
import { alCompilerService } from "../al-compiler/al-compiler.service.ts";
import type {
  ChatRequest,
  ExploreDocsRequest,
  GenerateAlCustomRequest,
  LearnFromDocRequest,
  ParseFrdRequest,
  ReflectAndImproveRequest,
} from "./dto/agent.dto.ts";

export class AgentController {
  private readonly agent: AgentService;

  constructor(agent: AgentService = agentService) {
    this.agent = agent;
  }

  /** Explore the Microsoft Learn knowledge base. */
  async exploreDocs(request: ExploreDocsRequest): Promise<unknown> {
    const docs = await knowledgeService.searchDocs({ term: request.query ?? "", limit: 5 });
    return { docs, configured: this.agent.isConfigured() };
  }

  /** Parse a Functional Requirement Document into structured entities. */
  async parseFrd(request: ParseFrdRequest): Promise<unknown> {
    return requirementsService.parseFrdLocally({ frdText: request.frdText });
  }

  /** Generate a single AL object of a requested type. */
  async generateAl(request: GenerateAlCustomRequest): Promise<unknown> {
    const suite = alCompilerService.generateAlSuite(request.objectName);
    return { files: suite.files, manifest: suite.manifest };
  }

  /** Free-form chat with the agent. */
  async chat(request: ChatRequest): Promise<{ reply: string }> {
    if (!this.agent.isConfigured()) {
      return { reply: "Agent is not configured. Set GEMINI_API_KEY to enable live reasoning." };
    }
    const reply = await this.agent.generate(request.message);
    return { reply };
  }

  /** Learn a new rule from a documentation excerpt. */
  async learnFromDoc(request: LearnFromDocRequest): Promise<unknown> {
    const doc = await knowledgeService.indexNewDoc({
      title: request.title ?? "Untitled",
      category: "al_language",
      url: request.sourceUrl ?? "",
      summary: request.docContent.slice(0, 500),
      alSyntaxSnippets: [],
      keyRules: [],
    });
    return { doc };
  }

  /** Reflect on a compiler diagnostic and propose a fix. */
  async reflectAndImprove(request: ReflectAndImproveRequest): Promise<unknown> {
    return {
      original: request.problematicAlCode,
      diagnostic: request.diagnosticMessage ?? null,
      configured: this.agent.isConfigured(),
    };
  }
}

export const agentController = new AgentController();