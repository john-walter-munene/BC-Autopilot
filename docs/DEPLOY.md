# Production Deployment Runbook (docs/DEPLOY.md)
*Mirrors Overlay (CognitronTechnologies / john-walter-munene) Production Runbook*

## 1. Prerequisites & Environment Variables

Ensure the following variables are defined in your deployment environment (Render, Docker, or Kubernetes):

```bash
# Server & Runtime
NODE_ENV=production
PORT=3000
APP_URL=https://bc-agent-api.onrender.com

# PostgreSQL & Redis
DATABASE_URL=postgresql://bc_agent_admin:SecretPass@postgres:5432/bc_agent_db?schema=public
REDIS_URL=redis://bc-agent-redis:6379

# Microsoft Entra ID (Business Central Cloud OAuth2)
BC_TENANT_ID=your-azure-tenant-id
BC_CLIENT_ID=your-entra-app-client-id
BC_CLIENT_SECRET=your-entra-client-secret
BC_ENVIRONMENT=Sandbox
BC_COMPANY_ID=00000000-0000-0000-0000-000000000000

# Gemini AI Engine
GEMINI_API_KEY=your-gemini-api-key
```

---

## 2. Local Docker Compose Launch

To spin up all services locally:

```bash
# 1. Clone repository
git clone https://github.com/your-org/alchemy365-agent.git
cd alchemy365-agent

# 2. Start PostgreSQL, Redis, API Web, and BullMQ Worker
docker-compose up -d --build

# 3. Apply Prisma migrations
npx prisma migrate deploy

# 4. Verify API health
curl -s http://localhost:3000/api/health | jq .
```

---

## 3. Render Blueprint Deployment

1. Connect your GitHub repository to Render.
2. In the Render Dashboard, click **New +** -> **Blueprint**.
3. Select this repository; Render automatically parses `render.yaml`.
4. Render provisions:
   - `bc-agent-api` (Web Service on Node 22)
   - `bc-agent-worker` (Background Worker running BullMQ queue)
   - `bc-agent-postgres` (PostgreSQL 16 managed database)
   - `bc-agent-redis` (Redis managed cache and job queue broker)
5. Fill in the sensitive environment variables (`GEMINI_API_KEY`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`).
6. Click **Apply**.

---

## 4. Database Schema Migration

Run the Prisma migration pipeline before routing traffic:

```bash
# Run Prisma push or deploy in production
npx prisma db push
```

---

## 5. Post-Deployment Smoke Test

Execute the verification check against the deployed instance:

```bash
# 1. Test Entra ID OAuth2 token handshake
curl -X POST https://bc-agent-api.onrender.com/api/agent/explore-docs \
  -H "Content-Type: application/json" \
  -d '{"query":"tableextension AL syntax"}'

# 2. Test Settlement Engine
curl -s https://bc-agent-api.onrender.com/api/health
```
