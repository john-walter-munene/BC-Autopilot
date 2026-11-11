/**
 * Knowledge Module Types
 * Real-time Microsoft Learn doc indexing and RAG retrieval
 */

export interface BcDocArticle {
  id: string;
  title: string;
  category: 'al_language' | 'page_customization' | 'odata_apis' | 'business_logic' | 'cloud_deployment';
  url: string;
  summary: string;
  alSyntaxSnippets: string[];
  keyRules: string[];
  lastUpdated: string;
}

export interface DocSearchQuery {
  term: string;
  category?: string;
  limit?: number;
}
