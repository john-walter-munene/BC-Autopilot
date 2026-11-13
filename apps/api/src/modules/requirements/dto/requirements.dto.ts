/**
 * Requirements Domain Types
 * Functional Requirement Document (FRD) parsing and story extraction
 */

import type { FunctionalRequirementDoc, ExtractedEntities, UserStoryItem } from '@bc-agent/shared';

export type { FunctionalRequirementDoc, ExtractedEntities, UserStoryItem };

export interface ParseFrdRequest {
  frdText: string;
  sourceDocName?: string;
}

export interface ParseFrdResponse {
  entities: ExtractedEntities;
  userStories: UserStoryItem[];
  suggestedObjectIds: number[];
}
