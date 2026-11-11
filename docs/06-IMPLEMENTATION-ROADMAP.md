# 06: Production Implementation Roadmap
## Phased Blueprint: From Current MVP to Enterprise Production

---

### Phase Overview

```
[Phase 1: Environment Setup] ──► [Phase 2: Compiler & LSP Daemon] ──► [Phase 3: Real Playwright Grid]
              │                                   │                                  │
              ▼                                   ▼                                  ▼
[Phase 4: Next.js Gateway]   ──► [Phase 5: Multi-Agent Swarm]   ──► [Phase 6: CI/CD & AppSource]
```

---

### Phase 1: Business Central Infrastructure Setup

1. **Docker Container Sandbox (Local/Self-Hosted)**:
   - Use Microsoft `BcContainerHelper` PowerShell module to spin up standard Business Central containers:
     ```powershell
     Install-Module BcContainerHelper -Force
     New-BcContainer -containerName "bcserver" `
                     -imageName "mcr.microsoft.com/businesscentral/sandbox:latest" `
                     -accept_eula `
                     -auth "UserPassword"
     ```
   - Exposes:
     - Web Client: `http://localhost:8080/BC`
     - Developer Service (VSTS port): `7049`
     - OData V4 Port: `7048`

2. **Microsoft Entra ID (Azure AD) App Registration**:
   - Register App: `ALchemy 365 Agent Gateway`
   - Grant API Permissions: `Dynamics 365 Business Central` -> `API.ReadWrite.All` (Application permission).
   - Generate Client Secret and configure in `.env`:
     ```env
     AZURE_TENANT_ID="72f988bf-86f1-41af-91ab-2d7cd011db47"
     AZURE_CLIENT_ID="f3b9c1a0-94e2-411a-8c90-28198f48102a"
     AZURE_CLIENT_SECRET="secret_here"
     BC_ENVIRONMENT="Sandbox"
     BC_COMPANY_ID="1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
     ```

---

### Phase 2: Compiler & Language Server Protocol (LSP) Daemon

1. **Download Base Application Symbol Packages**:
   - Acquire `.alpackages` for the target BC release wave:
     - `Microsoft_System Application_24.0.0.0.app`
     - `Microsoft_Base Application_24.0.0.0.app`

2. **Automated AL Compiler CLI Execution Daemon**:
   - Create a background Node.js runner:
     ```typescript
     import { execFile } from 'child_process';
     import path from 'path';

     export function compileAlExtension(projectPath: string, outputPath: string): Promise<string> {
       return new Promise((resolve, reject) => {
         execFile('alc.exe', [
           `/project:${projectPath}`,
           `/packagecachepath:${path.join(projectPath, '.alpackages')}`,
           `/out:${outputPath}`
         ], (error, stdout, stderr) => {
           if (error) reject(stderr || stdout);
           else resolve(stdout);
         });
       });
     }
     ```

---

### Phase 3: Real Browser Playwright Runner

1. **Playwright Container Execution**:
   - Mount Playwright inside a Linux Docker container with headless Chromium:
     ```dockerfile
     FROM mcr.microsoft.com/playwright:v1.49.0-jammy
     WORKDIR /agent
     COPY package*.json ./
     RUN npm install
     COPY . .
     CMD ["npx", "playwright", "test"]
     ```

2. **Authenticated Storage State Generation**:
   - Execute an initial one-time interactive login to store Entra ID OAuth refresh cookies:
     ```bash
     npx playwright codegen https://businesscentral.dynamics.com/sandbox --save-storage=auth/bc-storage-state.json
     ```
   - The agent reuses this storage state across headless automated runs, bypassing interactive MFA prompts.

---

### Phase 4: Production Next.js Gateway & Webhook Synchronization

1. **OData REST Proxying & Delta Token Sync**:
   - Configure Next.js Route Handlers to cache OData responses using Redis / Memory Cache.
   - Subscribe to Business Central Webhook notifications (`POST /v2.0/subscriptions`) to receive push updates when records are inserted or posted in BC.

2. **Composite Batch Operations**:
   - Implement `$batch` endpoint in Next.js to commit Sales Headers and Lines in a single atomic transaction.

---

### Phase 5: Multi-Agent Swarm Integration

1. **Deploy Specialized Worker Agents**:
   - **Agent Alpha (Requirements & Docs)**: Ingests FRDs, queries live Microsoft Learn docs, outputs technical architecture specs.
   - **Agent Beta (AL Coder)**: Writes `.al` files, executes `alc` compiler, triggers reflection on errors.
   - **Agent Gamma (QA & Playwright)**: Runs browser automation, captures screenshots, validates DOM controls.
   - **Agent Delta (Integration & Next.js)**: Scaffolds frontend routes and hooks.

2. **Central State Bus**:
   - Workers communicate over a central message bus (Redis or WebSocket), passing structured JSON manifests.

---

### Phase 6: CI/CD & AppSource Validation

1. **GitHub Actions CI/CD Pipeline**:
   ```yaml
   name: Business Central Autonomous Extension CI
   on: [push, pull_request]
   jobs:
     verify:
       runs-on: windows-latest
       steps:
         - uses: actions/checkout@v4
         - name: Run AL Compiler Verification
           run: alc.exe /project:./al-project /packagecachepath:./.alpackages
         - name: Run Playwright BC Web Client Tests
           run: npx playwright test
         - name: Publish to Cloud Sandbox
           run: Publish-BcContainerApp -appFile ./dist/*.app
   ```
