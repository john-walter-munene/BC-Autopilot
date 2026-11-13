/**
 * Requirements Domain Service
 * Parses functional requirements, creates acceptance criteria, and prepares stories for settlement
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) requirements architecture
 */

import { AL_OBJECT_ID_RANGE } from '@bc-agent/shared';
import type { ExtractedEntities, UserStoryItem } from '@bc-agent/shared';
import type { ParseFrdRequest, ParseFrdResponse } from './dto/requirements.dto.ts';

export class RequirementsService {
  parseFrdLocally(req: ParseFrdRequest): ParseFrdResponse {
    const text = req.frdText;

    // Extract table names
    const tableMatches = text.match(/(?:table|tableextension|entity)\s+["']?([A-Za-z0-9\s]+)["']?/gi) || [];
    const tables = Array.from(new Set(tableMatches.map(m => m.replace(/(?:table|tableextension|entity)\s+["']?/i, '').replace(/["']$/, '').trim()))).filter(t => t.length > 2);

    // Extract field names
    const fieldMatches = text.match(/(?:field|attribute)\s+["']?([A-Za-z0-9\s_]+)["']?/gi) || [];
    const fields = Array.from(new Set(fieldMatches.map(m => m.replace(/(?:field|attribute)\s+["']?/i, '').replace(/["']$/, '').trim()))).filter(f => f.length > 2);

    const entities: ExtractedEntities = {
      targetTables: tables.length > 0 ? tables : ['Customer'],
      customFields: fields.length > 0 ? fields : ['VIP Tier', 'Credit Assessment Score', 'Last Risk Review Date'],
      actions: ['Calculate Score', 'Notify Account Manager'],
      apiExposures: ['customerAssessments'],
      pagesToExtend: ['Customer Card', 'Customer List']
    };

    const userStories: UserStoryItem[] = [
      {
        id: 'US-01',
        title: 'Add Custom Assessment Fields to Customer Table',
        description: 'Extend Customer table with VIP Tier and Credit Assessment Score fields in ID range 50100..50149',
        acceptanceCriteria: ['Table extension must compile with runtime 13.0', 'Fields must have DataClassification CustomerContent'],
        status: 'pending'
      },
      {
        id: 'US-02',
        title: 'Expose Fields and Triggers on Customer Card Page',
        description: 'Add fields to General FastTab with action button to recalculate score',
        acceptanceCriteria: ['Visible in Customer Card', 'Action button shows dialog banner upon completion'],
        status: 'pending'
      },
      {
        id: 'US-03',
        title: 'Publish Custom API Page for Next.js Bridge',
        description: 'Expose Customer Assessments via API page (PageType = API)',
        acceptanceCriteria: ['PageType = API with ODataKeyFields = "No."', 'Returns JSON response with 200 OK'],
        status: 'pending'
      }
    ];

    const suggestedObjectIds = [
      AL_OBJECT_ID_RANGE.CUSTOMER_RANGE_START,
      AL_OBJECT_ID_RANGE.CUSTOMER_RANGE_START + 1,
      AL_OBJECT_ID_RANGE.CUSTOMER_RANGE_START + 2
    ];

    return {
      entities,
      userStories,
      suggestedObjectIds
    };
  }
}

export const requirementsService = new RequirementsService();
