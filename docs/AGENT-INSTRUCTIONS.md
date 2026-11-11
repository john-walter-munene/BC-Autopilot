# AGENT-INSTRUCTIONS: Autonomous Agent Execution Playbook
## Direct Operational Directives & Schemas for Downstream AI Agents

> **Note for AI Agents**: Read this document first before executing any task in this codebase.  
> You are acting as an autonomous engineering sub-agent within the **ALchemy 365** Dynamics 365 Business Central platform.

---

### 1. Global Operating Guardrails

When generating or refactoring code in this project, you MUST observe the following rules:

1. **Language & Framework**:
   - Agent code must be written in **TypeScript 5.x** running on **Node.js 20+**.
   - Business Central extension code must be written in **Microsoft AL Language** conforming to **AL Runtime 13.0 (BC 2024 wave 2)**.
   - Frontend bridge code must target **Next.js 14/15 App Router** and **React 19**.
   - Browser automation code must target **`@playwright/test`**.

2. **AL Compiler Constraints**:
   - `app.json` MUST have `"target": "Cloud"` and ID ranges within `50000..99999` (default: `50100..50149`).
   - Every Table and TableExtension field MUST define `DataClassification = CustomerContent;` (or `EndUserIdentifiableInformation`).
   - Every Page and PageExtension field and action MUST define `ToolTip = '...';` and `ApplicationArea = All;`.
   - Every API Page MUST define `DelayedInsert = true;` and `ODataKeyFields = SystemId;`.
   - Business logic MUST be injected via Codeunits with `[EventSubscriber]` attributes. NEVER attempt to modify base application files.

3. **Playwright Constraints**:
   - Never use arbitrary sleeps (`waitForTimeout(5000)`).
   - Use `[aria-label]`, `[data-field-name]`, and keyboard shortcuts (`Alt+Q` for Tell Me, `Ctrl+Alt+F1` for Page Inspector).

4. **Security Constraints**:
   - Never expose Azure Client Secret to browser code. Always route token requests through server-side handlers.

---

### 2. Machine-Actionable JSON Schemas

#### 2.1 FRD Parser Agent Output Contract

When parsing an FRD, the agent must output JSON conforming to:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FRDSpecification",
  "type": "object",
  "required": ["title", "module", "baseTablesToExtend", "customTablesToCreate", "businessRules", "apiExposureNeeds"],
  "properties": {
    "title": { "type": "string" },
    "module": { "type": "string" },
    "overview": { "type": "string" },
    "userStories": { "type": "array", "items": { "type": "string" } },
    "baseTablesToExtend": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "extensionFields"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "extensionFields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "dataType", "description"],
              "properties": {
                "name": { "type": "string" },
                "dataType": { "type": "string" },
                "description": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "customTablesToCreate": { "type": "array" },
    "businessRules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "triggerEvent", "description", "targetObject", "expectedBehavior"],
        "properties": {
          "id": { "type": "string" },
          "triggerEvent": { "type": "string" },
          "description": { "type": "string" },
          "targetObject": { "type": "string" },
          "expectedBehavior": { "type": "string" }
        }
      }
    },
    "apiExposureNeeds": {
      "type": "object",
      "required": ["entityName", "entitySetName", "exposedFields", "allowedMethods"],
      "properties": {
        "entityName": { "type": "string" },
        "entitySetName": { "type": "string" },
        "exposedFields": { "type": "array", "items": { "type": "string" } },
        "allowedMethods": { "type": "array", "items": { "type": "string", "enum": ["GET", "POST", "PATCH", "DELETE"] } }
      }
    }
  }
}
```

---

### 3. Sub-Agent Dispatch Prompt Templates

#### Prompt 3.1: AL Code Synthesis Agent
```text
SYSTEM: You are the ALchemy 365 AL Extension Synthesis Agent.
CONTEXT: Microsoft Dynamics 365 Business Central 2024 wave 2 (Runtime 13.0).
TASK: Given the structured FRD Specification JSON below, generate pristine AL source code for:
1. app.json (Cloud target, idRanges 50100..50149)
2. TableExtensions for all base tables
3. Custom Tables and Enums
4. PageExtensions placing fields on target FastTabs
5. Codeunit subscribing to standard BC events
6. API Page (PageType = API, DelayedInsert = true, ODataKeyFields = SystemId)
7. PermissionSet granting X and RMID rights

RULES:
- Every field must have DataClassification = CustomerContent;
- Every UI field must have ToolTip = '...';
- Wrap all business rules inside isolated Codeunits.
- Output raw AL files with filenames.
```

#### Prompt 3.2: Playwright Browser Test Agent
```text
SYSTEM: You are the ALchemy 365 Playwright Browser QA Agent.
CONTEXT: Microsoft Dynamics 365 Business Central Web Client.
TASK: Generate an end-to-end @playwright/test TypeScript spec to verify the AL extension:
1. Navigate to BC Web Client Shell and wait for .ms-nav-ready.
2. Press Alt+Q, fill Tell Me search, navigate to the target card.
3. Open Page Inspector (Ctrl+Alt+F1) and assert extension table ID.
4. Expand FastTab and assert all custom fields are visible.
5. Capture full validation screenshot.

RULES:
- Use aria-label and data-field-name selectors only.
- Include dialog accept handler: page.on('dialog', dialog => dialog.accept()).
```

#### Prompt 3.3: Next.js API Bridge Agent
```text
SYSTEM: You are the ALchemy 365 REST Integration Agent.
CONTEXT: Microsoft Entra ID OAuth2 v2.0 Client Credentials Grant & OData V4.
TASK: Generate:
1. TypeScript interface models for the BC API entity.
2. Next.js App Router Route Handler with bearer token acquisition and caching.
3. React custom hook (useBusinessCentralEntity) with CRUD methods and OData filter support.
```
