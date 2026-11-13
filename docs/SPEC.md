# Product and Engineering Specification

## Purpose

BC Autopilot provides a developer console for Business Central customization workflows. It combines a React UI, Node API, AL source-generation helpers, local compiler integration and container operations in a TypeScript workspace monorepo.

## Product scope

### Current capabilities

- Read and parse functional requirement inputs and generate AL artifacts.
- Display generated AL and run local linter checks in the engineering console.
- Generate Playwright and OData/Next.js bridge artifacts.
- Run the physical AL compiler against an existing project through the CLI.
- Maintain a fingerprinted local `.alpackages` cache from user-provided `.app` files.
- Publish an existing compiled package and provision a Business Central container through BcContainerHelper.
- Expose agent and AL toolchain endpoints through `apps/api`.

### Explicit limitations

- The UI workflow includes simulated/demo outcomes; a successful UI status is not proof of a real Business Central deployment.
- The CLI does not download Microsoft symbols automatically. Use `symbols --source <dir>` with locally obtained `.app` packages.
- `alc.exe`, PowerShell, BcContainerHelper and a compatible container host are external prerequisites and are not installed by npm.
- The API's job queue and state are in-memory. There is no active PostgreSQL/Redis persistence or separate process-safe worker.
- Live browser tests are optional and require a configured, authenticated Business Central environment.

## Workspace requirements

| Area | Requirement |
|---|---|
| Web | React + Vite application under `apps/web` |
| API | Node HTTP service and feature modules under `apps/api` |
| Shared services | Reusable toolchain code under `packages/shared` |
| CLI | Local commands in `bin/bc-agent.ts` for compile, symbols, publish and sandbox |
| Runtime | Node.js 22.6+; npm workspaces |
| Quality gate | Typecheck, unit/CLI tests and production web build pass in CI |

## AL toolchain behavior

- `compile` accepts an existing directory containing `app.json`, locates `alc.exe`, runs it with the requested package cache and reports diagnostics.
- `symbols` lists the cache by default; `--source` copies `.app` files from a local source directory and updates the cache manifest.
- `publish` invokes `Publish-BcContainerApp` and returns the command output and status.
- `sandbox` invokes `New-BcContainer` and reports the Web Client, OData and developer-service URLs.

The commands report missing inputs and external tools as failures. They do not claim that a real container operation succeeded unless the underlying command exits successfully.

## Quality criteria

Run `npm run verify` for TypeScript checks, automated tests and the web production build. Live compiler, publish, sandbox and browser acceptance checks must be run separately in an environment that has the corresponding Microsoft tools and Business Central container.
