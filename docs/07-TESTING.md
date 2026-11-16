# Testing

The suite follows the node-postgres (`packages/pg/test`) model: `node:test` with `describe`/`it`,
services that take their side effects by injection, and fakes that are shared rather than rewritten
per file.

## Layout

Tests live next to the module they cover, grouped by domain, so a new feature adds a folder rather
than editing every script:

```
packages/shared/src/
  al/                      Phase 1 — AL toolchain
    alc-runner.ts
    alc-runner.test.ts
  browser/                 Phase 2 — browser automation
    storage-state.ts
    storage-state.test.ts
  testing/
    test-helpers.ts        shared fakes: execFile, clock, temp dirs, memory filesystem
apps/api/src/modules/<feature>/
  <feature>.service.ts
  <feature>.service.test.ts
tests/
  cli.test.ts              end-to-end CLI behaviour (spawns the real CLI)
  playwright/              live Business Central specs (not run in CI)
```

## Commands

| Command | Covers |
|---|---|
| `npm run test:al` | `packages/shared/src/al` |
| `npm run test:browser` | `packages/shared/src/browser` |
| `npm run test:api` | `apps/api` modules |
| `npm run test:cli` | `bin/bc-agent.ts` through a child process |
| `npm test` | all of the above |
| `npm run verify` | tests + typecheck + web build |

## Conventions

1. **Name the module, then write the test.** A failing test must fail for a behavioural reason, not a
   missing import. Check the failure message before implementing.
2. **Inject the boundary.** Processes (`execFile`), the clock, and the filesystem are constructor
   dependencies. Suites pass fakes; they never touch the real disk or spawn a browser.
3. **One behaviour per `it`.** Titles read as sentences (`it("drops the trace on a passing run")`).
4. **Assert the reason, not just the shape.** Prefer `assert.match(result.stderr, /EACCES/)` over
   `assert.equal(result.success, false)`, so the test documents *why* it failed.
5. **Never assert on `Math.random()` or real time.** Use `createFakeClock()`.
6. **A test that skips itself when a control is missing is not a test.** Conditional assertions were
   removed from the browser specs for this reason.
7. **Fix the fixture before the code.** If a test fails, first ask whether the fixture models reality
   (for example: does a real `readdir` return directories as well as files?).

## Adding a domain

1. Create `packages/shared/src/<domain>/`.
2. Add the modules and their `.test.ts` siblings.
3. Add `"test:<domain>": "node --experimental-strip-types --test \"packages/shared/src/<domain>/*.test.ts\""`.
4. Chain it into `test:shared` (or `test`).
5. Export the modules from `packages/shared/src/index.ts`.

## What is deliberately not unit-tested

`alc.exe`, BcContainerHelper and a live Business Central tenant cannot run in CI. Their bridges are
tested at the process boundary; the acceptance checks in
[06-IMPLEMENTATION-ROADMAP.md](./06-IMPLEMENTATION-ROADMAP.md) must be run on a machine with the
Microsoft toolchain and recorded against the exact target version.
