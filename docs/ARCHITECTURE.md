# ARCHITECTURE.md: System Architecture & Data Flow
## Modular Software Architecture Adapted from Overlay

> **Reference Repository**: [`john-walter-munene/overlay`](https://github.com/john-walter-munene/overlay)  
> **Architecture Pattern**: Modular Domain-Driven Full-Stack System (NestJS/Next.js inspiration)

---

### 1. High-Level File System & Module Structure

```text
/
├── docs/                        # Complete Engineering Documentation Suite
│   ├── SPEC.md                  # System MVP specifications & requirements
│   ├── ARCHITECTURE.md          # Modular system architecture & data flow
│   ├── ROADMAP.md               # Phased delivery roadmap (Phases 0 - 4)
│   ├── NAMING.md                # Naming conventions & domain dictionary
│   └── ...                      # Deep-dive guides (AL, Playwright, OAuth)
│
├── src/
│   ├── common/                  # Shared utilities, constants, types & errors
│   │   ├── types.ts             # Global TypeScript type definitions
│   │   ├── constants.ts         # BC AL object ID ranges & compiler flags
│   │   ├── crypto.ts            # Deterministic SHA-256 package checksum generator
│   │   └── errors.ts            # Standard domain error classes
│   │
│   ├── config/                  # Configuration service & environment validation
│   │   └── env.config.ts        # Typed BC tenant, Azure Entra ID & ports config
│   │
│   ├── modules/                 # Domain Modules (Feature-First Architecture)
│   │   ├── auth/                # Entra ID OAuth2 token acquisition & memory cache
│   │   ├── knowledge/           # BC Docs RAG engine & episodic heuristic rule bank
│   │   ├── requirements/        # FRD parser, user story analyzer & table mapper
│   │   ├── al-compiler/         # AL code generator & compiler linter diagnostics
│   │   ├── browser-agent/       # Playwright runner & BC Web Client DOM simulator
│   │   ├── api-gateway/         # Next.js Route Handlers, TypeScript SDK & React hooks
│   │   ├── settlements/         # Automated Settlement Engine & Verifiable Proof Records
│   │   ├── analytics/           # Compiler metrics, test pass rates & learning curves
│   │   ├── orchestrator/        # Autonomous agent workflow state machine & DAG
│   │   └── jobs/                # Background async job queue manager (BullMQ pattern)
│   │
│   ├── components/              # Modern React 19 Frontend Engineering Console
│   ├── App.tsx                  # Root application cockpit
│   ├── main.tsx                 # React DOM mount point
│   └── index.css                # Tailwind CSS v4 styling
│
├── server.ts                    # Full-Stack Express entry point with Vite middleware
├── package.json                 # Project dependencies & scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

### 2. Domain Modules Breakdown

#### 2.1 `modules/auth/` (Microsoft Entra ID Authentication)
- Manages Azure AD OAuth2 v2.0 Client Credentials Grant flow (`scope: https://api.businesscentral.dynamics.com/.default`).
- Implements proactive in-memory token caching to eliminate latency and avoid throttling.

#### 2.2 `modules/knowledge/` (Docs RAG & Episodic Rules)
- Maintains indexed Microsoft Learn Business Central developer documentation.
- Stores dynamic `LearnedRule` items with condition-action pairs and confidence weights.

#### 2.3 `modules/requirements/` (FRD Synthesis)
- Parses raw requirements documents, user stories, and acceptance criteria.
- Extracts entity models, base tables to extend, custom storage tables, and validation rules.

#### 2.4 `modules/al-compiler/` (AL Code Synthesis & Linter)
- Generates 100% syntactically pristine AL project objects (`app.json`, `TableExt`, `PageExt`, `Codeunit`, `API Page`, `PermissionSet`).
- Enforces cloud packaging rules: `runtime: "13.0"`, `target: "Cloud"`, `DataClassification = CustomerContent;`, `ToolTip = '...';`.

#### 2.5 `modules/browser-agent/` (Playwright Browser Automation)
- Generates executable `@playwright/test` specs targeting the Business Central Web Client.
- Simulates Tell Me (`Alt+Q`), Designer mode (`/design`), Page Inspector (`Ctrl+Alt+F1`), and FastTab DOM controls.

#### 2.6 `modules/api-gateway/` (Next.js & React Bridge)
- Scaffolds Next.js 14/15 App Router Route Handlers (`app/api/bc/[entity]/route.ts`).
- Generates TypeScript interfaces and React custom hooks (`useBusinessCentralEntity`).

#### 2.7 `modules/settlements/` (Verifiable Build Engine - Overlay Pattern)
- Direct architectural mirror of Overlay's verifiable pick and automated settlement system.
- Seals each build with a deterministic SHA-256 fingerprint.
- Automatically settles each FRD user story against Playwright assertions and compiler outputs.

#### 2.8 `modules/jobs/` (Async Task Queue)
- Simulates a robust background queue (mirroring BullMQ / Redis in Overlay) for long-running Playwright browser runs, deep doc crawls, and AL compiler builds.

#### 2.9 `modules/repo-import/` (Existing Web App Context Ingestion & Reverse Engineering)
- Ingests existing online service repositories (React / Next.js web applications).
- Scans Prisma schemas, Zod validation models, TypeScript interfaces, and API route handlers.
- Synthesizes the exact Business Central AL tables, page extensions, and API pages needed to back the existing web app in context with zero UI refactoring required.

---

### 3. Data Interaction & State Transitions

```
[Existing React/Next.js Repo] OR [User / FRD Input]
          │                                  │
          ▼ (modules/repo-import)            ▼ (modules/requirements)
[Context AST & Web Schemas]          [FRDSpecification]
          │                                  │
          └──────────────────┬───────────────┘
                             ▼ (modules/al-compiler + modules/knowledge)
             [AL Project AST & Files] ──► (modules/al-compiler/linter) ──► [Clean AST]
                             │
                             ▼ (modules/browser-agent)
             [Playwright Spec Execution] ──► [DOM Assertion Results]
                             │
                             ▼ (modules/api-gateway)
             [Next.js Route Handlers & React Hooks (Drop-in Client SDK)]
                             │
                             ▼ (modules/settlements)
             [VerifiableBuildRecord: SHA-256 Fingerprint + 100% Settled Verification Certificate]
```

