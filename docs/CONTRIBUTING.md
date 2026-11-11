# Contributing to Alchemy365: Autonomous Business Central Agent (docs/CONTRIBUTING.md)
*Mirrors Overlay (CognitronTechnologies / john-walter-munene) Monorepo Contribution Guidelines*

Thank you for contributing to the Autonomous Dynamics 365 Business Central Agent project. This monorepo is structured so that UI developers, compiler engineers, browser automation specialists, and backend developers can work concurrently without stepping on each other's changes.

---

## 1. Monorepo Domain Separation

| Team / Focus Area | Workspace Location | Responsibilities | Key Technologies |
| :--- | :--- | :--- | :--- |
| **Frontend & UX Engineers** | `apps/web/` & `src/components/` | Visual workflow views, testbench scorecard, settlement analytics, interactive chat drawer | React 19, Tailwind CSS, Lucide Icons, Motion |
| **AL Compiler Engineers** | `packages/al-compiler/` & `src/modules/al-compiler/` | AL AST parsing, object ID allocation (`50100..50149`), manifest generator, symbol verification | TypeScript, AL language AST, RegExp parsers |
| **Browser Test Engineers** | `packages/browser-agent/` & `tests/` | Playwright scripts, Tell Me automation, FastTab locators, Page Inspector assertions | Playwright, Chromium headless, StorageState |
| **API & Next.js Engineers** | `packages/api-gateway/` & `src/modules/api-gateway/` | OData v4 REST endpoints, Next.js App Router Route Handlers, Entra ID OAuth2 token caching | Node.js, Express, Fetch API, OAuth2 |
| **Settlement & Audit Engineers** | `packages/settlement-engine/` & `src/modules/settlements/` | Deterministic SHA-256 code fingerprints, rule verification, dispute prevention | Cryptography, Audit Log ledgers, Prisma ORM |

---

## 2. Local Setup & Fast Onboarding

```bash
# 1. Clone repository
git clone https://github.com/your-org/alchemy365.git
cd alchemy365

# 2. Install dependencies across all workspaces
npm install

# 3. Copy environment configuration
cp .env.example .env

# 4. Start local development stack (Vite + Express on port 3000)
npm run dev

# 5. Spin up supporting databases (PostgreSQL & Redis)
docker-compose up -d postgres redis
```

---

## 3. Autonomous CLI for Real-Time Local Development

Developers can run the agent locally against any Functional Requirement Document or local Business Central repository using the CLI:

```bash
# Parse a Functional Requirement Document into structured entities
npx tsx bin/bc-agent.ts parse --frd ./docs/sample-frd.md

# Synthesize and compile AL table extensions and page extensions
npx tsx bin/bc-agent.ts generate-al --frd ./docs/sample-frd.md --out ./src-al

# Run Playwright browser test verification against a live or sandbox BC web client
npx tsx bin/bc-agent.ts test-browser --url https://businesscentral.dynamics.com/sandbox

# Compute verifiable build settlement with deterministic SHA-256 fingerprint
npx tsx bin/bc-agent.ts settle --session current
```

---

## 4. Branching, PRs, and Quality Gates

- **Branch Naming**:
  - `feat/ui-component-name` for frontend interface work
  - `feat/al-syntax-ast` for AL compiler work
  - `feat/playwright-dom` for browser automation scripts
  - `fix/settlement-crypto` for verification or hashing bugs
- **Pre-PR Quality Checks**:
  ```bash
  npm run lint       # Must exit 0 with 0 TypeScript compiler warnings
  npm run build      # Must successfully build production bundle
  ```
- **PR Title Convention**: Follow Conventional Commits (`feat(al): ...`, `fix(ui): ...`, `docs(arch): ...`).
