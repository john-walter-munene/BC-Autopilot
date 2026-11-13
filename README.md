# BC Autopilot

BC Autopilot is a TypeScript monorepo for a Business Central engineering console and its AL toolchain. The web console and API live in separate workspaces; shared AL compiler, symbol-cache, publish, and sandbox primitives are in `packages/shared`.

## Repository layout

```text
apps/
  api/                 Node.js HTTP API and domain modules
  web/                 React + Vite engineering console
packages/
  shared/              AL project, compiler, symbols, publish and sandbox services
bin/
  bc-agent.ts          Local developer CLI
tests/
  cli.test.ts          CLI smoke and symbol-cache tests
  playwright/          Optional live Business Central browser tests
docs/                  Architecture, specification, roadmap and contributor guides
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for workspace boundaries and [docs/ROADMAP.md](./docs/ROADMAP.md) for implementation status.

## Requirements

- Node.js 22.6 or newer and npm
- For AL compilation: Microsoft `alc.exe` (set `ALC_PATH` or pass `--alc`)
- For symbol cache population: downloaded `.app` symbol packages
- For `publish` and `sandbox`: PowerShell and BcContainerHelper; container provisioning also requires a compatible Docker host

## Local development

```powershell
npm ci
```

Start the API and web console in separate terminals:

```powershell
npm run dev:api
npm run dev
```

The API listens on port 3000 by default. Vite serves the web console on its development port.
Set `GEMINI_API_KEY` to enable live model responses; local workflows that do not use the model can run without it.

## CLI

Each Phase 1 operation has a root npm alias and a direct CLI command. Use `--` before CLI options when invoking a root alias:

```powershell
# Compile an existing AL project
npm.cmd run compile -- --project=.\al-src --symbols=.\al-src\.alpackages

# Copy local symbol .app files into the project cache (without --source, lists cached packages)
npm.cmd run symbols -- --source=.\downloaded-symbols --symbols=.\al-src\.alpackages

# Publish a compiled package; --sync requests schema synchronization
npm.cmd run publish -- --app=.\al-src\.output\publisher_name_1.0.0.0.app --container=bcserver --sync

# Provision a local Business Central container
npm.cmd run sandbox -- --container=bcserver --port=8080
```

The symbol command synchronizes packages from a local directory; it does not download symbols from Microsoft. Real compilation, publishing, and sandbox provisioning require the tools listed above. Run `npm run cli -- help` for all commands and options.

## Quality checks

```powershell
npm run lint       # TypeScript checks for shared, API and web workspaces
npm test           # Unit and CLI tests
npm run build      # Type checks and production web bundle
npm run verify     # lint + tests + build
```

`npm run test:e2e:browser` is separate from the default suite and requires an authenticated Business Central environment configured through `BC_WEB_URL`.

## Deployment

`Dockerfile` and `render.yaml` run the API service. The web workspace is built independently; configure its API origin when deploying it separately. The API does not require PostgreSQL or Redis in its current implementation.

## License

Licensed under the [Apache License, Version 2.0](./LICENSE).
