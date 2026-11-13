# Architecture

BC Autopilot follows a workspace monorepo layout inspired by [Overlay](https://github.com/john-walter-munene/overlay): deployable applications live in `apps/`, reusable capabilities live in `packages/`, and root scripts coordinate the workspaces.

## Workspace map

```text
apps/
  api/
    src/main.ts                 HTTP entry point and API routes
    src/modules/                Agent, AL compiler, auth, knowledge, jobs, etc.
    src/common/                 Configuration, data and generators
  web/
    src/                         React engineering console
packages/
  shared/src/                    Compiler runner, project writer, symbols, publish,
                                 sandbox, pipeline, common types and errors
bin/bc-agent.ts                  Local CLI using shared services
tests/                           Unit/CLI and optional live browser tests
docs/                            Product and engineering documentation
```

## Runtime boundaries

- **Web (`apps/web`)** is a Vite-built React application. It calls the API using `/api/...` routes during development and imports API domain helpers through the workspace TypeScript path alias.
- **API (`apps/api`)** is a Node HTTP server. `src/main.ts` exposes health, agent and AL toolchain routes; feature logic is grouped under `src/modules/`.
- **Shared (`packages/shared`)** owns the toolchain services that can be used by both the API and local CLI: AL project writing, `alc.exe` execution and output parsing, symbol package caching, BcContainerHelper publishing/provisioning, and the Phase 1 pipeline.
- **CLI (`bin/bc-agent.ts`)** calls those shared services directly. Root `compile`, `symbols`, `publish` and `sandbox` npm scripts are convenience aliases.

The API and CLI share toolchain behavior through `packages/shared`; the API controller is a thin wrapper around the Phase 1 pipeline. Symbol ingestion is currently local-directory based. It does not retrieve packages from Microsoft.

## State and deployment

The current job queue and demo state are in-memory. PostgreSQL, Redis and the Prisma schema are not part of the running API path. Do not run a separate worker process against the in-memory queue; a process-safe queue is future work.

The API and web app are separate workspaces. The API Docker/Render configuration deploys the API only; deploy the Vite bundle separately if a hosted UI is needed. The API is executed from TypeScript using Node's built-in type stripping, so supported Node versions start at 22.6.

## Verification

- `npm run lint` type-checks shared, API and web sources.
- `npm test` runs shared service tests, API controller tests and CLI tests.
- `npm run build` additionally produces the production Vite bundle.
- `tests/playwright/` contains optional live Business Central browser tests; those require a configured sandbox and are not part of `npm test`.
