# ROADMAP.md: Phased Delivery Plan & Exit Criteria
## Strategic Implementation Path for Autonomous BC Agent

> **Reference Structure**: Adapted from [`john-walter-munene/overlay/docs/ROADMAP.md`](https://github.com/john-walter-munene/overlay)  
> **Milestones**: Phase 0 through Phase 4 with Explicit Exit Criteria

---

### Phase 0: System Architecture & Working MVP (CURRENT STATE)

**Goal**: Deliver a verified, interactive TypeScript engineering console capable of end-to-end AL synthesis, simulated Playwright execution, and Next.js route scaffolding.

#### Deliverables:
- [x] Full-stack TypeScript application with Express server and Vite frontend.
- [x] Curated Microsoft Learn knowledge base with AL language rules.
- [x] FRD requirement parser with 3 industry reference specifications.
- [x] Autonomous AL code generator (`app.json`, `TableExt`, `PageExt`, `Codeunit`, `API Page`, `PermissionSet`).
- [x] Built-in AL compiler diagnostic linter (rules `AL0666`, `AA0207`, cloud packaging).
- [x] Playwright browser test generator and simulated BC Web Client viewport.
- [x] Next.js 14/15 App Router Route Handler with Entra ID OAuth2 token caching.
- [x] Automated Settlement & Verifiable Build Engine with SHA-256 fingerprints.
- [x] Real-time document ingestion and self-reflection loop.

#### Exit Criteria:
- `tsc --noEmit` succeeds with 0 errors.
- Dev server responds with `HTTP 200 OK` on port 3000.
- All 5 research verification tests pass with 100% score.

---

### Phase 1: Local Docker Container Sandbox & AL Compiler CLI Integration

**Goal**: Interface the agent directly with physical Microsoft Business Central Docker containers and the official `alc.exe` compiler executable.

#### Deliverables:
- [ ] Containerized Business Central sandbox using `BcContainerHelper` PowerShell module.
- [ ] Automated download and caching of Microsoft symbol packages (`.alpackages`).
- [ ] Background Node.js process executing `alc.exe /project:... /packagecachepath:...`.
- [ ] Parsing real compiler output stdout/stderr back into the agent's reflection loop.
- [ ] Automated publishing using `Publish-BcContainerApp` with schema synchronization.

#### Exit Criteria:
- Agent compiles `.app` package on local file system with `alc.exe`.
- Extension deploys and activates on local BC Docker container.

---

### Phase 1.5: Reverse-Context Ingestion & Existing Web App Repo Import (React / Next.js)

**Goal**: Ingest an existing GitHub or local repository of an active online service (React / Next.js web application) to understand its full operational context and autonomously engineer the corresponding Microsoft Dynamics 365 Business Central backend in complete context.

#### Deliverables:
- [ ] **Git Repository Ingestion & AST Harvester**:
  - Clone or file-tree scan of existing React/Next.js repositories (App Router & Pages Router).
  - Abstract Syntax Tree (AST) scanning of TypeScript types, Prisma schemas (`schema.prisma`), Zod/Yup validation models, and Drizzle/TypeORM entities.
  - Route handler and API query extraction (`app/api/**/route.ts`, SWR/React Query fetch hooks, Server Actions).
- [ ] **Context-to-BC Domain Mapper**:
  - Maps web app entities (e.g., Subscriptions, Cart Checkouts, Loyalty Credits, User Roles) to BC standard tables (Customer 18, Item 27, Sales Header 36) or dedicated custom tables.
  - Detects fields missing from standard BC tables and auto-generates AL `tableextension` definitions with custom ID allocation (`50100..50149`).
  - Auto-synthesizes high-performance REST/OData `PageType = API` endpoints matching the exact JSON payloads already expected by the existing React/Next.js frontend.
- [ ] **Drop-in Client Replacement SDK**:
  - Generates drop-in replacement API route handlers and React client hooks (`useBusinessCentral()`, `/api/bc/*`) that match the existing app's contracts with zero required UI rewrites.
  - Implements Entra ID OAuth2 token caching, retry logic, and error boundaries.
- [ ] **Cross-App End-to-End Playwright Verification**:
  - Automatically spins up the imported React/Next.js app in headless Chromium alongside the Business Central sandbox.
  - Executes full user journey: e.g., user submits checkout in Next.js web app -> Playwright verifies corresponding Sales Order and Customer ledger entries created in Business Central Web Client.
- [ ] **Schema Drift & Evolution Tracker**:
  - Watches for PR changes in the web app repo and automatically suggests or synthesizes incremental AL schema migrations.

#### Exit Criteria:
- Agent ingests a real-world Next.js e-commerce or SaaS repo, extracts the data model, generates compliant AL extensions, and provisions matching custom API pages with 100% schema parity.
- Roundtrip E2E test passes: action taken in the existing Next.js web app immediately persists and reflects in Business Central.

---

### Phase 2: Live Headless Chromium Playwright Automation

**Goal**: Transition from simulated browser execution to real headless browser execution against live BC SaaS sandboxes.

#### Deliverables:
- [ ] Entra ID OAuth automated login flow saving persistent `auth/bc-storage-state.json`.
- [ ] Real Playwright runner executing inside Docker container against BC Web Client URL.
- [ ] Automated video capture, trace logs, and screenshot artifacts on test failures.
- [ ] Keyboard navigation automation for Tell Me (`Alt+Q`) and Page Inspector (`Ctrl+Alt+F1`).

#### Exit Criteria:
- 100% automated browser test pass rate against live Business Central Web Client.
- Video and screenshot evidence saved to `test-results/`.

---

### Phase 3: Production Next.js Gateway & Real-Time Webhooks

**Goal**: Build production-grade enterprise API bridge supporting webhooks, delta tokens, and atomic `$batch` operations.

#### Deliverables:
- [ ] Next.js 14/15 App Router endpoints deployed to Vercel/Render with Redis token caching.
- [ ] Webhook subscription manager (`POST /v2.0/subscriptions`) receiving real-time BC events.
- [ ] Composite `$batch` support for atomic multi-line invoice creations.
- [ ] High-throughput rate-limiting and exponential backoff retry handler.

#### Exit Criteria:
- Sub-150ms cached API response times.
- Real-time webhook notifications syncing BC ledger changes to Next.js within 2 seconds.

---

### Phase 4: Multi-Agent Swarm & AppSource Distribution

**Goal**: Orchestrate multi-agent swarms and package verified extensions for Microsoft AppSource marketplace submission.

#### Deliverables:
- [ ] Autonomous agent worker swarm with Redis / BullMQ message queue.
- [ ] AppSource validation pipeline checking technical validation rules, telemetry, and permission sets.
- [ ] Automated generation of user manuals, privacy policies, and EULAs.

#### Exit Criteria:
- Automated AppSource validation pass with 0 technical rejection flags.
