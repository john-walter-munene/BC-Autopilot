export type AgentPhase = 
  | 'idle'
  | 'exploring_docs'
  | 'parsing_frd'
  | 'synthesizing_al'
  | 'validating_al'
  | 'generating_playwright'
  | 'executing_browser'
  | 'crafting_endpoints'
  | 'completed'
  | 'error';

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  phase: AgentPhase;
  level: 'info' | 'success' | 'warning' | 'error' | 'thought';
  title: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface BcDocTopic {
  id: string;
  title: string;
  category: 'al_language' | 'bc_architecture' | 'api_pages' | 'event_subscribers' | 'web_client_dom' | 'playwright_automation';
  summary: string;
  referenceUrl: string;
  alSyntaxSnippets: {
    label: string;
    code: string;
    language: 'al' | 'typescript' | 'json';
  }[];
  bestPractices: string[];
  commonPitfalls: string[];
}

export interface FrdEntityField {
  name: string;
  dataType: string; // e.g. "Code[20]", "Text[100]", "Decimal", "Boolean", "Enum"
  description: string;
  isCustom: boolean;
  baseTableId?: number;
  baseTableName?: string;
  customTableId?: number;
  customTableName?: string;
  validationRules?: string[];
}

export interface FrdBusinessRule {
  id: string;
  triggerEvent: string; // e.g. "OnAfterPostSalesInvoice", "OnValidateCreditLimit"
  description: string;
  targetObject: string;
  expectedBehavior: string;
}

export interface FunctionalRequirementDoc {
  id: string;
  title: string;
  version: string;
  module: string; // e.g. "Sales & Receivables", "Inventory", "Customer Management"
  overview: string;
  userStories: string[];
  baseTablesToExtend: {
    id: number;
    name: string;
    extensionFields: FrdEntityField[];
  }[];
  customTablesToCreate: {
    id: number;
    name: string;
    fields: FrdEntityField[];
    primaryKeys: string[];
  }[];
  businessRules: FrdBusinessRule[];
  apiExposureNeeds: {
    entityName: string;
    entitySetName: string;
    exposedFields: string[];
    allowedMethods: ('GET' | 'POST' | 'PATCH' | 'DELETE')[];
  };
  uiCustomizations: {
    targetPageId: number;
    targetPageName: string;
    placement: string;
    elementsToAdd: string[];
  }[];
}

export interface AlFile {
  filename: string;
  objectType: 'Table' | 'TableExtension' | 'Page' | 'PageExtension' | 'Codeunit' | 'PermissionSet' | 'AppJson' | 'Enum';
  objectId?: number;
  objectName: string;
  content: string;
  description: string;
  isValid: boolean;
  diagnostics: {
    severity: 'info' | 'warning' | 'error';
    line: number;
    message: string;
  }[];
}

export interface PlaywrightStepResult {
  stepNumber: number;
  title: string;
  action: 'navigate' | 'fill' | 'click' | 'wait_for_selector' | 'assert_dom' | 'open_tell_me' | 'activate_designer' | 'inspect_page';
  selector?: string;
  expectedOutcome: string;
  status: 'passed' | 'running' | 'failed' | 'pending';
  durationMs: number;
  screenshotUrl?: string;
  consoleTrace?: string;
}

export interface PlaywrightSuite {
  filename: string;
  targetUrl: string;
  testCode: string;
  steps: PlaywrightStepResult[];
  lastRunStatus: 'idle' | 'running' | 'passed' | 'failed';
  totalDurationMs: number;
}

export interface EndpointArtifact {
  entityName: string;
  odataUrl: string;
  restRoute: string;
  typeScriptTypes: string;
  nextjsRouteCode: string;
  reactHookCode: string;
  liveClientComponentCode: string;
  sampleRecord: Record<string, any>;
}

export interface AutonomousAgentPlan {
  id: string;
  currentStepIndex: number;
  steps: {
    id: string;
    name: string;
    phase: AgentPhase;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    description: string;
    summary?: string;
  }[];
}

export interface LearnedRule {
  id: string;
  ruleCode: string;
  title: string;
  category: 'al_compiler' | 'api_performance' | 'playwright_dom' | 'cloud_architecture' | 'event_subscribers';
  condition: string;
  remedy: string;
  sourceDoc: string;
  learnedAt: string;
  timesApplied: number;
  confidenceScore: number;
  exampleCorrection: {
    before: string;
    after: string;
    explanation: string;
  };
}

export interface DocIngestionResult {
  docTitle: string;
  sourceUrl?: string;
  extractedRulesCount: number;
  keyTakeaways: string[];
  rulesExtracted: LearnedRule[];
}

export interface SelfReflectionIteration {
  iterationNumber: number;
  phase: string;
  codeSnippet: string;
  diagnosticsCount: number;
  criticism: string;
  reflectionThought: string;
  docConsulted: string;
  ruleLearned?: LearnedRule;
  resolved: boolean;
}

