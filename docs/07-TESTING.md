# Testing

The suite follows the node-postgres (`packages/pg/test`) model: `node:test` with `describe`/`it`,
services that take their side effects by injection, and fakes that are shared rather than rewritten
per file.

## Layout

**No `*.test.ts` file lives under `src/`.** Source trees contain only production modules; every test
is under `tests/`, grouped by the domain it covers. Adding a feature therefore adds files in two
places, not a test beside every module.

```
packages/shared/src/            production code only
  core/                         constants, crypto, errors, shared types
  al/                           Phase 1 — AL toolchain
  browser/                      Phase 2 — browser automation
  bc/                           Phase 3 — Entra ID + OData integration
apps/api/src/                   production code only
  modules/<feature>/            controllers, services, DTOs
  common/generators/            artifact generators

tests/
  shared/core/*.test.ts         primitives
  shared/al/*.test.ts           Phase 1 suites
  shared/browser/*.test.ts      Phase 2 suites
  shared/bc/*.test.ts           Phase 3 suites
  api/*.test.ts                 controller, service and generator suites
  support/test-helpers.ts       shared fakes: execFile, clock, temp dirs, memory filesystem
  cli.test.ts                   end-to-end CLI behaviour (spawns the real CLI)
  playwright/                   live Business Central specs (not run in CI)
```

A test imports its subject by relative path, for example
`../../packages/shared/src/bc/token-provider.ts`. This keeps the suites independent of the workspace
build and makes the module under test obvious at the top of each file.

## Commands

| Command | Covers |
|---|---|
| `npm run test:core` | `tests/shared/core` |
| `npm run test:al` | `tests/shared/al` |
| `npm run test:browser` | `tests/shared/browser` |
| `npm run test:bc` | `tests/shared/bc` |
| `npm run test:api` | `tests/api` |
| `npm run test:cli` | `tests/cli.test.ts`, through a child process |
| `npm test` | all of the above |
| `npm run verify` | tests + typecheck + web build |

## Conventions

1. **Name the module, then write the test.** A failing test must fail for a behavioural reason, not a
   missing import. Check the failure message before implementing.
2. **Inject the boundary.** Processes (`execFile`), HTTP (`fetch`), the clock and the filesystem are
   constructor dependencies. Suites pass fakes; they never touch the network, the real disk or a
   browser.
3. **One behaviour per `it`.** Titles read as sentences (`it("drops the trace on a passing run")`).
4. **Assert the reason, not just the shape.** Prefer `assert.match(result.stderr, /EACCES/)` over
   `assert.equal(result.success, false)`, so the test documents *why* it failed.
5. **Never assert on `Math.random()` or real time.** Use the injected clock helpers. A fake clock that
   advances on every read makes arithmetic subtle — assert relative to a value the code returned
   (`token.expiresAt`) rather than re-deriving it.
6. **A test that skips itself when a control is missing is not a test.** Conditional assertions were
   removed from the browser specs for this reason.
7. **Fix the fixture before the code.** If a test fails, first ask whether the fixture models reality
   (for example: does a real `readdir` return directories as well as files?).
8. **Secrets never appear in assertions' success path.** Where a credential is in play, assert it is
   redacted from errors rather than only that the call fails.

## Adding a domain

1. Create `packages/shared/src/<domain>/` for the production modules.
2. Create `tests/shared/<domain>/` for the suites.
3. Add `"test:<domain>": "node --experimental-strip-types --test \"tests/shared/<domain>/*.test.ts\""`.
4. Chain it into `test:shared`.
5. Export the modules from `packages/shared/src/index.ts`.

## What is deliberately not unit-tested

`alc.exe`, BcContainerHelper, Entra ID and a live Business Central tenant cannot run in CI. Their
bridges are tested at the boundary (injected process, injected `fetch`); the acceptance checks in
[06-IMPLEMENTATION-ROADMAP.md](./06-IMPLEMENTATION-ROADMAP.md) must be run on a machine with the
Microsoft toolchain and recorded against the exact target version.
