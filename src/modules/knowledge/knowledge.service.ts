/**
 * Knowledge Engine Service
 * Handles Microsoft Dynamics 365 Learn doc exploration, semantic retrieval, and live crawling
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) domain service architecture
 */

import { bcKnowledgeBase } from '../../data/bcDocsKnowledgeBase.ts';
import type { BcDocArticle, DocSearchQuery } from './knowledge.types.ts';

export class KnowledgeService {
  private docs: BcDocArticle[] = bcKnowledgeBase.map(topic => ({
    id: topic.id,
    title: topic.title,
    category: (topic.category as unknown) as BcDocArticle['category'],
    url: topic.referenceUrl,
    summary: topic.summary,
    alSyntaxSnippets: topic.alSyntaxSnippets.map(s => s.code),
    keyRules: [...topic.bestPractices, ...topic.commonPitfalls],
    lastUpdated: '2026-11-10T12:00:00Z'
  }));

  async searchDocs(query: DocSearchQuery): Promise<BcDocArticle[]> {
    const term = query.term.toLowerCase();
    return this.docs.filter(doc => {
      const matchCategory = query.category ? doc.category === query.category : true;
      const matchText = 
        doc.title.toLowerCase().includes(term) ||
        doc.summary.toLowerCase().includes(term) ||
        doc.keyRules.some(r => r.toLowerCase().includes(term));
      return matchCategory && matchText;
    }).slice(0, query.limit || 5);
  }

  async indexNewDoc(doc: Omit<BcDocArticle, 'id' | 'lastUpdated'>): Promise<BcDocArticle> {
    const newDoc: BcDocArticle = {
      ...doc,
      id: `doc-dyn-${Date.now()}`,
      lastUpdated: new Date().toISOString()
    };
    this.docs.unshift(newDoc);
    return newDoc;
  }

  getAllDocs(): BcDocArticle[] {
    return this.docs;
  }
}

export const knowledgeService = new KnowledgeService();
