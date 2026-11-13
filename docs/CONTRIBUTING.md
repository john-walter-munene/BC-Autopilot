# Contributing

## Workspace conventions

| Area | Location | Owns |
|---|---|---|
| Web | `apps/web/` | React console, components and Vite configuration |
| API | `apps/api/` | HTTP entry point, API modules, generators and domain services |
| Shared | `packages/shared/` | Toolchain primitives reusable by API and CLI |
| CLI | `bin/bc-agent.ts` | Local compile, symbols, publish and sandbox commands |
| Tests | `packages/shared/src/*.test.ts`, `apps/api/src/**/*.test.ts`, `tests/*.test.ts` | Unit and CLI checks |

Keep cross-workspace toolchain behavior in `packages/shared`; avoid duplicating compiler, cache or PowerShell process logic in the API and CLI.

## Setup

Use Node.js 22.6+ and npm:

```powershell
npm ci
```

Run the API and web app in separate terminals:

```powershell
npm run dev:api
npm run dev
```

## Before opening a pull request

```powershell
npm run lint
npm test
npm run build
```

Or run all checks with `npm run verify`. The live browser suite is opt-in and needs an authenticated Business Central sandbox:

```powershell
$env:BC_WEB_URL = "https://businesscentral.dynamics.com/..."
npm run test:e2e:browser
```

## CLI and external tools

The Phase 1 aliases accept the same flags as the CLI:

```powershell
npm.cmd run compile -- --project=.\al-src --symbols=.\al-src\.alpackages
npm.cmd run symbols -- --source=.\downloaded-symbols --symbols=.\al-src\.alpackages
npm.cmd run publish -- --app=.\out\extension.app --container=bcserver --sync
npm.cmd run sandbox -- --container=bcserver
```

AL compilation requires `alc.exe`; publishing and provisioning require PowerShell and BcContainerHelper. Do not include Microsoft symbol packages, compiled `.app` files, credentials or Business Central storage state in commits.

## Pull requests

- Keep changes within the responsible workspace and update directly affected docs.
- Add focused tests for new behavior.
- Ensure CI's `npm run verify` and Docker build pass.
- Use a descriptive Conventional Commit-style title, such as `feat(cli): sync local symbol packages`.
