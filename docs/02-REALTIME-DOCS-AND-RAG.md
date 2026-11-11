# 02: Real-Time Docs Ingestion & Continuous RAG Knowledge Engine
## How the Agent Learns in Real Time and Progressively Improves

---

### 1. The Challenge of BC Documentation Dynamics

Microsoft Dynamics 365 Business Central evolves across two major release waves per year (e.g., *2024 Release Wave 2*, *2025 Release Wave 1*) alongside continuous monthly platform updates. Static prompts quickly become obsolete as:
- Compiler analyzer rules become stricter (e.g. `AL0666` for `DataClassification`, `AL0604` for deprecated promoted action syntax).
- Standard integration events in Codeunits shift signatures (e.g. `Sales-Post`, `Release Sales Document`).
- API Page performance guidelines mandate `DelayedInsert = true;` and `ODataKeyFields = SystemId;`.

To solve this, ALchemy 365 employs an **Active Continuous Learning & Reflexion Loop**.

---

### 2. Architecture of the Real-Time Ingestion Pipeline

```
[Microsoft Learn URL / Markdown] 
               │
               ▼ (Document Chunking & Normalization)
{ Clean Markdown Chunks + Release Wave Metadata }
               │
               ▼ (Gemini Extraction via /api/agent/learn-from-doc)
{
  ruleCode: "AL_RULE_ACTIONREF",
  condition: "Any action declared on Page or PageExtension in BC 24+",
  remedy: "Use area(Promoted) with actionref syntax instead of Promoted = true;",
  exampleCorrection: { before: "...", after: "..." },
  confidenceScore: 0.98
}
               │
               ▼ (Persistent Episodic Memory Bank)
[LearnedRulesStore: Prioritized Rules Injected into Code Synthesis Prompts]
```

---

### 3. Rule Structure Schema (`LearnedRule`)

Downstream agents must format all ingested rules using this TypeScript interface:

```typescript
export interface LearnedRule {
  id: string;
  ruleCode: string; // e.g. "AL0666_DATA_CLASSIFICATION", "API_ODATA_KEY_SYSID"
  title: string;
  category: 'al_compiler' | 'api_performance' | 'playwright_dom' | 'cloud_architecture' | 'event_subscribers';
  condition: string; // Exact trigger condition for the rule
  remedy: string; // Prescribed AL syntax or architectural pattern
  sourceDoc: string; // Microsoft Learn citation URL
  learnedAt: string; // ISO timestamp
  timesApplied: number; // Counter tracking how often the rule resolved a problem
  confidenceScore: number; // 0.0 to 1.0 weight
  exampleCorrection: {
    before: string; // Problematic or obsolete code snippet
    after: string; // 100% verified compliant code snippet
    explanation: string;
  };
}
```

---

### 4. The Self-Correction & Reflexion Loop

When an agent synthesizes AL code or executes a Playwright script that produces diagnostics or assertions failures, it triggers the **3-Step Reflexion Loop**:

1. **Step 1: Criticism**
   - The agent reads compiler diagnostics (e.g. `AL0666`, `AA0207`) or Playwright timeout stack traces.
   - It performs root-cause analysis: why did this failure occur?

2. **Step 2: Real-Time Documentation Query**
   - The agent queries the Microsoft Learn documentation index or analyzer reference for the specific rule code.

3. **Step 3: Heuristic Rule Formulation & Memory Injection**
   - A new `LearnedRule` is created and stored in the persistent `LearnedRulesStore`.
   - The rule's `timesApplied` is incremented.

4. **Step 4: Self-Corrected Code Synthesis**
   - The agent regenerates the target code applying the newly synthesized rule.
   - The linter validates that 0 errors remain.

---

### 5. API Endpoints for Continuous Learning

#### Ingest Real-Time Document
- **Endpoint**: `POST /api/agent/learn-from-doc`
- **Payload**:
  ```json
  {
    "title": "Business Central 2024 Wave 2 Promoted Actions",
    "sourceUrl": "https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-promoted-actions",
    "docContent": "In modern Business Central AL, the legacy PromotedActionCategories and Promoted = true properties are officially deprecated. Developers must define promoted actions in area(Promoted) with actionref."
  }
  ```
- **Response**: Returns structured `DocIngestionResult` with extracted rules ready to be merged into memory.

#### Run Self-Reflection & Error Remediation
- **Endpoint**: `POST /api/agent/reflect-and-improve`
- **Payload**:
  ```json
  {
    "problematicAlCode": "field(50100; \"Loyalty Tier\"; Code[20]) { Caption = 'Loyalty Tier'; }",
    "diagnosticMessage": "AL Rule AL0666: Missing DataClassification = CustomerContent."
  }
  ```
- **Response**: Returns criticism, reflection thought, official doc consulted, clean corrected AL code, and the new `ruleLearned` object.
