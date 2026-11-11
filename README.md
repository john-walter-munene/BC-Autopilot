# Alchemy365 — Autonomous Dynamics 365 Business Central Agent

> **Autonomous full-stack engineering agent that reads Microsoft Learn docs in real time, generates compliant AL extensions from Functional Requirement Documents (FRDs), automates UI customizations via Playwright in live browsers, writes Next.js OData REST bridges, and cryptographically seals builds.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Dynamics 365 BC](https://img.shields.io/badge/Dynamics_365-Business_Central-0078d4.svg)](https://learn.microsoft.com/en-us/dynamics365/business-central/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Testing-2EAD33.svg)](https://playwright.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED.svg)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Render-Blueprint-46E3B7.svg)](https://render.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-yellow.svg)](./LICENSE)

---

## 1. Architecture Overview

Alchemy365 is architected to mirror the domain-separated, verifiable settlement pattern pioneered by [`john-walter-munene/overlay`](https://github.com/john-walter-munene/overlay). 

Every AL extension package, browser customization, and API bridge is:
1. **Extracted from FRD or Existing React/Next.js Repos**: Ingests functional requirements or clones existing web apps, extracting schemas (`schema.prisma`, Zod models, TypeScript interfaces) to engineer the BC backend in context.
2. **Synthesized & Linted**: Idiomatic AL language objects (`tableextension`, `pageextension`, `page`, `codeunit`, `permissionset`, `app.json`) allocated in ID range `50100..50149`.
3. **Automated in Real Browsers**: Headless Playwright drives Business Central web client (Tell Me, FastTabs, Designer mode, Page Inspector).
4. **Bridged to Client Apps**: Typed Next.js App Router Route Handlers with Entra ID OAuth2 token caching (and drop-in replacement client SDKs).
5. **Cryptographically Sealed**: Deterministic SHA-256 fingerprints lock the build and settle acceptance stories automatically.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Alchemy365 Monorepo Layout                         │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│    apps/web (UI)     │   apps/api (REST)    │      apps/worker (Queue)      │
│  React 19 Dashboard  │  Express API Gateway │  BullMQ Background Queue      │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│                               src/modules/                                  │
│  ├── repo-import/     -> Ingest Existing React/Next.js Repos & Schema AST   │
│  ├── auth/            -> Entra ID OAuth2 Client Credentials & Token Caching │
│  ├── knowledge/       -> Real-time Microsoft Learn Doc RAG Exploration      │
│  ├── requirements/    -> FRD Parsing & User Story Extraction                │
│  ├── al-compiler/     -> AL Language Code Generation & AST Linter           │
│  ├── browser-agent/   -> Playwright Automated Web Client Browser Driver    │
│  ├── api-gateway/     -> OData v4 REST Endpoints & Next.js Client Bridge    │
│  ├── settlements/     -> Verifiable Build Settlement & Dispute Engine       │
│  ├── settlement-analytics/ -> Audit Trail, Fingerprints & Metrics           │
│  └── jobs/            -> Asynchronous Queue Broker & Job Definitions        │
├─────────────────────────────────────────────────────────────────────────────┤
│  bin/bc-agent.ts      -> Real-time Local Developer CLI                      │
│  prisma/schema.prisma -> Relational Database Schema & Audit Ledger          │
│  tests/               -> Playwright E2E & Vitest Unit Test Suites           │
│  docs/                -> Specifications, Architecture & Deployment Guides   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
.
├── .github/
│   └── workflows/ci.yml         # GitHub Actions automated lint & build pipeline
├── bin/
│   └── bc-agent.ts              # Developer CLI tool for real-time local project use
├── docs/
│   ├── SPEC.md                  # Comprehensive MVP and production functional specification
│   ├── ARCHITECTURE.md          # Modular system architecture, data models & data flows
│   ├── ROADMAP.md               # Phased delivery roadmap (Phases 0 through 4)
│   ├── NAMING.md                # Domain naming taxonomy & AL object conventions
│   ├── VENDOR-SPIKE.md          # BC Cloud APIs, AL Compiler & Playwright toolchain spike
│   ├── DEPLOY.md                # Production deployment runbook (Render / Docker)
│   ├── CONTRIBUTING.md          # Multi-developer collaboration guide
│   └── 01-ARCHITECTURE-AND-VISION.md ... 06-IMPLEMENTATION-ROADMAP.md
├── prisma/
│   └── schema.prisma            # PostgreSQL relational schema (Prisma ORM)
├── src/
│   ├── common/                  # Shared constants, typed domain errors, crypto hash
│   ├── config/                  # Type-safe environment & database configuration
│   ├── modules/                 # Modular domain services (Auth, Knowledge, Compiler, etc.)
│   ├── components/              # React 19 Frontend Views (Testbench, Analytics, etc.)
│   ├── data/                    # Sample FRDs, knowledge bases, episodic rules
│   ├── utils/                   # AL AST syntax linter & compiler diagnostics
│   └── services/                # Specialized AL, Playwright, and Endpoint generators
├── tests/
│   ├── bc-customization.spec.ts # Playwright E2E browser customization test suite
│   ├── settlement.spec.ts       # Cryptographic build settlement verification tests
│   └── al-compiler.spec.ts      # AL syntax and object ID unit tests
├── docker-compose.yml           # Local multi-container stack (App, Worker, Postgres, Redis)
├── Dockerfile                   # Multi-stage production container with Playwright
├── render.yaml                  # Render Blueprint Infrastructure-as-Code
├── tsconfig.base.json           # Shared base TypeScript configuration
├── package.json                 # Project scripts and dependencies
└── server.ts                    # Full-stack Node.js / Express entry point
```

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js >= 20.0
- Docker & Docker Compose (optional, for PostgreSQL & Redis)

### Step 1: Install Dependencies
```bash
git clone https://github.com/your-org/alchemy365.git
cd alchemy365
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Start Local Stack
```bash
# Starts both the backend server and frontend development interface on http://localhost:3000
npm run dev
```

### Step 4: Run supporting services in Docker (optional)
```bash
docker-compose up -d postgres redis
```

---

## 4. Using the Developer CLI in Real-Time Projects

When installed locally, engineers can execute the agent directly from the command line against their own projects:

```bash
# 1. Parse an FRD into structured user stories and target tables
npx tsx bin/bc-agent.ts parse --frd ./docs/sample-frd.md

# 2. Reverse-engineer from an existing React / Next.js web application repo
npx tsx bin/bc-agent.ts import-repo --repo https://github.com/my-org/my-nextjs-app

# 3. Synthesize and compile AL TableExtensions, PageExtensions, and API Pages
npx tsx bin/bc-agent.ts generate-al --frd ./docs/sample-frd.md --out ./src-al

# 4. Execute Playwright browser verification against a BC Web Client sandbox
npx tsx bin/bc-agent.ts test-browser --url https://businesscentral.dynamics.com/sandbox

# 5. Generate verifiable build settlement with deterministic SHA-256 fingerprint
npx tsx bin/bc-agent.ts settle
```

---

## 5. Deployment

### Render Blueprint (1-Click)
1. Push repository to GitHub.
2. In Render, create a **New Blueprint Instance** and link your repo.
3. Render automatically provisions the Web Service (`bc-agent-api`), Background Worker (`bc-agent-worker`), PostgreSQL database, and Redis cache per `render.yaml`.

### Docker Production Container
```bash
docker build -t alchemy365:latest .
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" alchemy365:latest
```

---

## 6. License
Licensed under the [Apache License, Version 2.0](./LICENSE).
