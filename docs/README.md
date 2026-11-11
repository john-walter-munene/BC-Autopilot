# ALchemy 365: Autonomous Microsoft Dynamics 365 Business Central Engineering Agent
## Master System Documentation & Implementation Blueprint

> **Target Audience**: Software Engineers, AI Agent Swarms, Enterprise Architects, and BC Developers.  
> **Status**: Production Blueprint & Agent Implementation Guide  
> **Target Framework**: TypeScript (Node.js / Express / Next.js) + Microsoft AL Language + Playwright

---

### Executive Summary

**ALchemy 365** is an autonomous AI software engineering agent capable of autonomously understanding Microsoft Dynamics 365 Business Central (BC) by indexing official documentation in real time, translating Functional Requirement Documents (FRDs) into production-grade AL extensions, verifying and customizing the BC Web Client via automated Playwright browser sessions, and scaffolding high-performance OData V4 / REST API endpoints consumed by React / Next.js applications.

---

### Documentation Map

This documentation suite is organized into modular specifications designed to be consumed by human engineers and autonomous AI agents:

| Document | Title | Purpose |
| :--- | :--- | :--- |
| [`01-ARCHITECTURE-AND-VISION.md`](./01-ARCHITECTURE-AND-VISION.md) | **System Architecture & Vision** | High-level system design, multi-agent roles, end-to-end execution pipeline, and state machines. |
| [`02-REALTIME-DOCS-AND-RAG.md`](./02-REALTIME-DOCS-AND-RAG.md) | **Real-Time Docs & RAG Engine** | Microsoft Learn crawling, semantic chunking, heuristic rule extraction, and episodic memory. |
| [`03-AL-ENGINEERING-AND-COMPILER.md`](./03-AL-ENGINEERING-AND-COMPILER.md) | **AL Extension Code Engineering** | Official Microsoft AL syntax, Cloud target rules, TableExtensions, PageExtensions, EventSubscribers, and `alc.exe` CLI compiler verification. |
| [`04-PLAYWRIGHT-BROWSER-AUTOMATION.md`](./04-PLAYWRIGHT-BROWSER-AUTOMATION.md) | **Playwright Browser Customization** | Automated UI interactions against BC Web Client: Tell Me (`Alt+Q`), Designer Mode (`/design`), Page Inspector (`Ctrl+Alt+F1`), and virtualized DOM selectors. |
| [`05-REST-API-AND-NEXTJS-INTEGRATION.md`](./05-REST-API-AND-NEXTJS-INTEGRATION.md) | **REST API & Next.js Bridge** | Microsoft Entra ID (Azure AD) OAuth2 token caching, OData V4 endpoints, TypeScript SDK, and React custom hooks. |
| [`06-IMPLEMENTATION-ROADMAP.md`](./06-IMPLEMENTATION-ROADMAP.md) | **Production Implementation Roadmap** | Step-by-step phased engineering roadmap from MVP to live BC Docker/SaaS container environments. |
| [`AGENT-INSTRUCTIONS.md`](./AGENT-INSTRUCTIONS.md) | **Downstream Agent Prompts & Contracts** | Machine-actionable agent roles, schemas, API contracts, and sub-agent dispatch guides. |

---

### Core Autonomous Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ALchemy 365 Autonomous Loop                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[Stage 1: Documentation Grounding]              [Stage 2: FRD Specification Parsing]
- Indexes Microsoft Learn AL rules               - Ingests User Stories & Acceptance Criteria
- Caches runtime 13.0 / BC 2024 wave 2          - Maps Base Tables (18, 36) & Custom Tables (50100)
- Enforces cloud packaging constraints          - Identifies Triggers & API Exposure Requirements
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
                     [Stage 3: AL Code Engineering]
                     - Synthesizes app.json (idRanges 50100..50149)
                     - Synthesizes TableExtension, PageExtension, Enum
                     - Injects business logic via Codeunit [EventSubscriber]
                     - Generates API Page (PageType = API, DelayedInsert = true)
                     - Generates PermissionSet
                                    │
                                    ▼
                     [Stage 4: Compiler Linter & Reflexion]
                     - Validates AL0666 (DataClassification = CustomerContent)
                     - Validates AA0207 (Accessibility ToolTips)
                     - Runs self-reflection loop if errors detected
                                    │
                                    ▼
                     [Stage 5: Playwright Browser Automation]
                     - Spawns headless/headed Chromium via @playwright/test
                     - Navigates to BC Web Client URL
                     - Interacts via Tell Me (Alt+Q) & Designer mode
                     - Inspects Page Inspector (Ctrl+Alt+F1) DOM
                     - Asserts extension field rendering and triggers
                                    │
                                    ▼
                     [Stage 6: React / Next.js Bridge Scaffolding]
                     - Generates Entra ID OAuth2 Client Credentials token cache
                     - Generates Next.js Route Handler (app/api/bc/[entity]/route.ts)
                     - Generates TypeScript interfaces & React custom hooks
                     - Validates live OData V4 client consumption
```

---

### Quick Start: Running the Current Working MVP

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Server listens on `http://localhost:3000`.

2. **Access the Agent Cockpit**:
   - Open `http://localhost:3000` in the browser.
   - Click **"Execute Full Autonomous Cycle"** to observe the agent process the reference *Customer Loyalty & Rewards* project.

3. **Inspect the Generated Artifacts**:
   - Tab **AL Extension Code**: Review generated AL objects and compiler diagnostic checks.
   - Tab **Playwright Automation**: Review test scripts and watch simulated BC Web Client DOM assertions.
   - Tab **React / Next.js Bridge**: Test the live interactive client consuming the generated API page.
   - Tab **Continuous Learning & Memory**: Test real-time doc ingestion and the self-reflection benchmark.
   - Tab **Research Evaluation**: Run the automated scorecard test suite.
