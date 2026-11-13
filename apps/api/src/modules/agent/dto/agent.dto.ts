/**
 * Agent DTOs: request/response shapes for the Gemini-backed agent routes.
 */

export interface ExploreDocsRequest {
  query?: string;
  topicId?: string;
}

export interface ParseFrdRequest {
  frdText: string;
}

export interface GenerateAlCustomRequest {
  frd: unknown;
  fileType: string;
  objectName: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
}

export interface LearnFromDocRequest {
  docContent: string;
  sourceUrl?: string;
  title?: string;
}

export interface ReflectAndImproveRequest {
  problematicAlCode: string;
  diagnosticMessage?: string;
}