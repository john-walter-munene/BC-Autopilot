# SPEC.md: Full MVP Specification & Production Path
## System Specification for Autonomous Dynamics 365 Business Central Engineering Agent

> **Mirrored Architecture**: Adapted from [`john-walter-munene/overlay`](https://github.com/john-walter-munene/overlay)  
> **Repository Model**: Modular Domain-Driven Full-Stack Architecture  
> **Target Platform**: Microsoft Dynamics 365 Business Central (2024 Release Wave 2 / AL Runtime 13.0)

---

### 1. Vision & Problem Statement

Engineering customizations for Microsoft Dynamics 365 Business Central requires cross-functional expertise across AL language development, Microsoft Entra ID authentication, modern OData V4 API pages, and browser testing.

**ALchemy 365** provides an autonomous TypeScript agent system that:
1. Ground truth documentation retrieval (Microsoft Learn).
2. Converts raw Functional Requirement Documents (FRDs) into 100% syntactically valid AL extensions.
3. Automatically validates UI customizations on the BC Web Client via Playwright.
4. Produces high-throughput REST API endpoints and typed React/Next.js client hooks.
5. Employs an **Automated Settlement & Verifiable Build Engine** (directly adapted from Overlay's verifiable pick settlement model) to cryptographically seal and verify every build artifact.

---

### 2. Functional Requirements

#### FR-01: Real-Time Documentation Ingestion & Knowledge Graph
- **Requirement**: Agent must index official Microsoft Learn documentation for Business Central and update its heuristic rule bank in real time upon new release wave publication.
- **Verification**: Ingests raw markdown/URLs and outputs structured `LearnedRule` objects with conditions, remedies, and confidence scores.

#### FR-02: FRD Ingestion & Technical Synthesis
- **Requirement**: Ingests user stories and acceptance criteria, automatically identifying base tables to extend (Customer Table 18, Item Table 27), custom tables to create (ID range 50100..50149), and business logic events.
- **Verification**: Maps fields, data types, validation constraints, and API exposure requirements into a structured specification JSON.

#### FR-03: Autonomous AL Extension Generation
- **Requirement**: Synthesizes 7 core AL project files (`app.json`, `TableExtension`, `PageExtension`, `Enum`, `Codeunit`, `API Page`, `PermissionSet`).
- **Compiler Rules Enforced**:
  - `AL0666`: Mandatory `DataClassification = CustomerContent;`
  - `AA0207`: Mandatory accessibility `ToolTip = '...';`
  - `target: Cloud`: Strict AppSource SaaS packaging compliance.
  - `DelayedInsert = true;` and `ODataKeyFields = SystemId;` on API pages.

#### FR-04: Automated Playwright Browser Customization
- **Requirement**: Generates and executes `@playwright/test` scripts targeting the BC Web Client.
- **Coverage**: Navigation, Tell Me (`Alt+Q`), In-Client Designer mode (`/design`), Page Inspector (`Ctrl+Alt+F1`), FastTab field expansion, and DOM assertion.

#### FR-05: Next.js 14/15 App Router & React Custom Hook Bridge
- **Requirement**: Scaffolds server-side route handlers with Microsoft Entra ID Client Credentials grant and in-memory token caching, plus typed React hooks (`useBusinessCentralEntity`).

#### FR-06: Verifiable Build Settlement (Overlay Pattern)
- **Requirement**: Computes a deterministic SHA-256 fingerprint for every build and executes automated settlement reconciling FRD acceptance criteria against Playwright and compiler outputs.

#### FR-07: Existing Web App Repo Import & Reverse-Context Engineering
- **Requirement**: Capability to ingest an existing React / Next.js repository (via GitHub URL or local directory tree) to understand all frontend components, schemas (`schema.prisma`, Zod models, TypeScript interfaces), API route handlers, and state management in context.
- **Reverse-Context Generation**:
  - Automatically deduces implied Business Central base tables (Customer 18, Item 27, Sales Header 36) and custom extension fields (`50100..50149`).
  - Auto-synthesizes corresponding AL `tableextension`, `pageextension`, and `PageType = API` objects matching the exact payload expectations of the existing web application.
  - Generates drop-in replacement client SDKs (`app/api/bc/*` or `@/lib/bc-client.ts`) allowing the web application to run against Business Central with zero UI changes.
- **Verification**: End-to-end Playwright tests verify that user interactions on the imported React/Next.js UI persist and update records inside the Business Central sandbox.

---

### 3. Non-Functional Requirements

- **Type Safety**: 100% TypeScript with strict null checks.
- **Runtime Portability**: Compatible with Node.js 20+, Docker container sandboxes, and modern cloud deployment targets (Render, Cloud Run, Azure App Service).
- **Latency**: AL code synthesis under 3.5 seconds; Playwright test suite execution under 4.0 seconds in simulation mode.
