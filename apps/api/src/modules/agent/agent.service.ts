/**
 * Agent service: Gemini-backed reasoning with deterministic local fallbacks.
 * Overlay counterpart: apps/api/src/modules/<name>/<name>.service.ts
 */

import { GoogleGenAI } from "@google/genai";
import { BC_AGENT_SYSTEM_PROMPT } from "./system-prompt.ts";

export { BC_AGENT_SYSTEM_PROMPT };

export interface AgentServiceOptions {
  apiKey?: string;
  client?: GoogleGenAI | null;
}

export class AgentService {
  private readonly client: GoogleGenAI | null;

  constructor(options: AgentServiceOptions = {}) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.client = options.client !== undefined ? options.client : apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generate(prompt: string, json = false): Promise<string> {
    if (!this.client) throw new Error("AgentService is not configured");
    const response = await this.client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: BC_AGENT_SYSTEM_PROMPT,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return response.text ?? "";
  }
}

export const agentService = new AgentService();