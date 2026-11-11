# 01: System Architecture & Vision
## Autonomous Engineering for Microsoft Dynamics 365 Business Central

---

### 1. Vision & Core Objectives

Enterprise ERP customizations on Microsoft Dynamics 365 Business Central typically demand multi-disciplinary engineering effort:
1. Understanding deep, ever-evolving Microsoft AL compiler specifications and release wave changes.
2. Translating business specifications (FRDs) into schema extensions and isolated event subscribers without breaking base application code.
3. Verifying customizations inside the Business Central Web Client using In-Client Designer and Page Inspector.
4. Exposing modern API Pages for external consumer applications (e.g. Next.js, mobile apps, 3PL portals).

**ALchemy 365** automates this entire lifecycle autonomously using a TypeScript agent system that enforces Microsoft's strict engineering and architectural rules.

---

### 2. Architectural Principles

To ensure production-grade outputs, all downstream agents must adhere to the following principles:

1. **Zero Base Code Modification**:
   - Modern AL strictly prohibits modifying Microsoft Base Application code.
   - All customizations MUST use `tableextension`, `pageextension`, and isolated `codeunit` objects with `[EventSubscriber]` attributes.

2. **Cloud-First Compliance (`target: Cloud`)**:
   - Extensions must set `"target": "Cloud"` in `app.json`.
   - Never use on-premises legacy constructs (`DotNet` interop, file system access).
   - Use Cloud-safe alternatives: `HttpClient`, `IsolatedStorage`, Azure Blob Storage, or custom API Pages.

3. **Explicit ID Range Allocation**:
   - Customer extension ID ranges are strictly confined to `50000..99999` (our standard allocation: `50100..50149`).
   - Never allocate IDs in Microsoft base ranges (`1..49999`) or standard ISV ranges.

4. **Mandatory Privacy & Accessibility Compliance**:
   - Every field in a Table or TableExtension must define `DataClassification` (`CustomerContent`, `EndUserIdentifiableInformation`, etc.) to pass compiler rule `AL0666`.
   - Every UI field and action button must define `ToolTip` to pass accessibility rule `AA0207`.

5. **API Performance Discipline**:
   - Custom API Pages (`PageType = API`) must specify `DelayedInsert = true;` and `ODataKeyFields = SystemId;`.
   - CamelCase naming for all exposed JSON fields.

---

### 3. Multi-Agent Orchestration Topology

The autonomous architecture is organized as a collaborative multi-agent swarm coordinated by the **Central Orchestrator**:

```
                       ┌───────────────────────────────┐
                       │  Central Orchestrator Agent   │
                       └──────────────┬────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│  Doc & RAG   │              │ AL Synthesis │              │  Playwright  │
│  Specialist  │              │  & Compiler  │              │Browser Agent │
└──────┬───────┘              └──────┬───────┘              └──────┬───────┘
       │                             │                             │
       │ (Docs Knowledge Chunks)     │ (AL Source Files)           │ (DOM Assertions)
       │                             │                             │
       └─────────────────────────────┼─────────────────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    REST API & Next.js Agent  │
                      └──────────────────────────────┘
```

#### Agent Roles & Responsibilities

1. **Central Orchestrator Agent**:
   - Manages execution DAG, stage transitions, thought streams, and state persistence.
   - Evaluates stage completion criteria before advancing the pipeline.

2. **Doc & RAG Specialist Agent**:
   - Continuously monitors and indexes Microsoft Learn documentation feeds.
   - Extracts AL language compiler rules, breaking changes, and DOM locator strategies into episodic memory.

3. **AL Synthesis & Compiler Agent**:
   - Ingests structured FRD requirements.
   - Generates fully qualified AL code: `app.json`, `TableExtension`, `PageExtension`, `Codeunit`, `PageType = API`, `PermissionSet`.
   - Executes AST linting and the self-reflection loop if errors are detected.

4. **Playwright Browser Agent**:
   - Generates `@playwright/test` suites targeting the Business Central Web Client.
   - Connects to BC browser sessions, triggers keyboard shortcuts (Tell Me `Alt+Q`, Page Inspector `Ctrl+Alt+F1`), and asserts UI extension integrity.

5. **REST API & Next.js Bridge Agent**:
   - Constructs secure Microsoft Entra ID (Azure AD) Client Credentials OAuth2 token handling with memory caching.
   - Implements Next.js App Router Route Handlers (`app/api/bc/[entity]/route.ts`).
   - Generates TypeScript interfaces and React custom hooks (`useBusinessCentralEntity`).

---

### 4. End-to-End Data Flow

```
[Raw FRD / User Stories] 
         │ 
         ▼ (Agent Parsing Engine)
{ Structured Requirement Model: Base Tables, Custom Tables, Triggers, API Schema }
         │
         ▼ (AL Code Generator + Episodic Rules)
[app.json, *.TableExt.al, *.PageExt.al, *.Codeunit.al, *API.Page.al, *.PermissionSet.al]
         │
         ▼ (AL Compiler Diagnostic Linter)
{ 0 Errors, Clean Build }
         │
         ▼ (Playwright Spec Generator)
[tests/bc-customization.spec.ts] ──► (Chromium Automation Session) ──► { DOM Verified }
         │
         ▼ (Endpoint Scaffolder)
[app/api/bc/route.ts + hooks/useBCEntity.ts + React Client Component]
```

---

### 5. Architectural Alignment with Overlay (`john-walter-munene/overlay`)

This project's architecture is directly influenced by and adapted from the **Overlay** platform (`https://github.com/john-walter-munene/overlay`). The core parallels include:

| Overlay Architecture Pattern | Adaptation in ALchemy 365 BC Agent |
| :--- | :--- |
| **Verifiable Picks & Cryptographic Immutability** | Every generated Business Central extension package is sealed with a **deterministic SHA-256 fingerprint** linking the FRD spec, AL code AST, and Playwright execution log into a tamper-proof verification certificate. |
| **Automated Settlement Engine** | Just as Overlay settles betting picks against real sporting outcomes, ALchemy 365 features an **Automated Settlement Engine** that reconciles FRD acceptance criteria against automated Playwright browser test results and AL compiler linter outputs. |
| **Modular Domain Architecture** | Structured into clean, decoupled domain modules (`knowledge`, `requirements`, `al-compiler`, `browser-agent`, `api-gateway`, `settlement-analytics`) mirroring Overlay's NestJS/Next.js domain separation. |
| **Asynchronous Job / Telemetry Bus** | Long-running tasks (browser automation runs, deep doc crawler sweeps, compiler builds) run as verifiable background jobs emitting structured telemetry and audit traces. |
| **Enterprise Full-Stack Bridge** | Server-side token caching, proxy route handlers, and typed React custom hooks providing clean separation between backend infrastructure and user-facing clients. |

