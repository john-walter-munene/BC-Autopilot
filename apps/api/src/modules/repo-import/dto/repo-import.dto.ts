/**
 * Repo Import & Context Engineering Domain Types
 * Ingests existing React / Next.js repositories to extract data models, routes, and schemas
 */

export interface ImportedWebEntity {
  name: string;
  sourceFile: string;
  sourceType: 'prisma_model' | 'typescript_interface' | 'zod_schema' | 'drizzle_table';
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    isPrimaryKey?: boolean;
    mappedBcType?: string;
  }>;
  suggestedBcMapping: {
    bcTargetTable: string; // e.g. "Customer", "Item", "Sales Header", "CustomTable 50100"
    isTableExtension: boolean;
    suggestedTableId: number;
    apiPageName: string;
  };
}

export interface ImportedApiRoute {
  routePath: string; // e.g. "/api/customers", "/api/orders"
  methods: ('GET' | 'POST' | 'PATCH' | 'DELETE')[];
  sourceFile: string;
  consumesEntities: string[];
}

export interface RepoImportResult {
  repoUrlOrPath: string;
  frameworkDetected: 'Next.js App Router' | 'Next.js Pages Router' | 'Vite React SPA';
  entitiesDiscovered: ImportedWebEntity[];
  routesDiscovered: ImportedApiRoute[];
  synthesizedAlPlan: {
    tableExtensionsCount: number;
    apiPagesCount: number;
    estimatedAlFiles: string[];
  };
  clientSdkCode: string;
}
