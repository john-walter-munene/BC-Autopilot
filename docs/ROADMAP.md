# Roadmap

This roadmap distinguishes implemented code paths from end-to-end validation. Workspace migration does not imply that every external Business Central operation has been run successfully.

## Phase 0 — Workspace foundation

- [x] Organize the web UI under `apps/web`, API under `apps/api`, and reusable code under `packages/shared`.
- [x] Provide root npm scripts for typecheck, unit/CLI tests and web build.
- [x] Remove the superseded root `src/`, root server and duplicate package layout.
- [x] Add CI for verification and API container build.
- [ ] Complete production API/web hosting and configure the deployed web app's API origin.

## Phase 1 — Local AL toolchain

- [x] Run `alc.exe` on an existing AL project and parse compiler output.
- [x] Fingerprint, list, add and update symbol packages in a local `.alpackages` cache.
- [x] Publish a compiled package through BcContainerHelper.
- [x] Provision a Business Central container through BcContainerHelper.
- [x] Expose `compile`, `symbols`, `publish` and `sandbox` as root npm scripts.
- [ ] Validate compile, publish and provisioning against a real local Business Central environment.
- [ ] Automate Microsoft symbol acquisition and version selection.

## Phase 1.5 — Repository context import

- [ ] Ingest local or remote React/Next.js schemas and route contracts.
- [ ] Map imported domain models to Business Central tables and generate contract-matched API pages.
- [ ] Add end-to-end verification across an imported app and a Business Central sandbox.

## Phase 2 — Live browser automation

- [x] Make authenticated Playwright execution a supported workflow with managed storage-state handling.
- [x] Capture and retain trace, screenshot and video evidence from sandbox runs.
- [ ] Validate generated customizations against actual Business Central UI versions.

The implemented surface (`packages/shared/src/browser`) is:

- `storage-state.ts` — resolve, validate and capture a Playwright storage state. A state with no
  Business Central session cookie, or an expired one, is refused with the reason; cookie values are
  never returned by the inspection result.
- `run-evidence.ts` — one folder per run under `<output>/evidence/<runId>`, with a redacted
  `evidence.json` manifest and a retention policy (`maxRuns`, `maxAgeDays`). Screenshots are always
  kept; trace and video only when the run failed.
- `playwright-report.ts` — parses the JSON reporter into per-test results, honouring Playwright's own
  rules (a retry-recovered test is still a failure unless `allowFlaky` is set).
- `playwright-runner.ts` — runs `playwright test` through `execFile`, reads the report from stdout or
  disk, and fails loudly when Playwright is missing, cannot start, or produces no report.
- `playwright-evidence.ts` — the single entry point used by the CLI (`browse`) and the API
  (`createBrowserAgentService`). It refuses to spawn without a usable session and records evidence
  in the same call.

The suite was verified against a real Playwright run (one passing and one failing spec) during
implementation; that check is not part of CI because it needs a browser download. The remaining
Phase 2 item requires a live Business Central tenant and stays open.

## Phase 3 — Production API integration

- [ ] Complete the Entra ID/OData bridge with production token handling and retry/rate-limit behavior.
- [ ] Add webhook and batch synchronization workflows.
- [ ] Define and test a production persistence and process-safe background queue.

## Phase 4 — Distribution and operations

- [ ] Add production monitoring, release validation and AppSource packaging checks.
- [ ] Document supported Business Central releases and compatibility guarantees.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for current system boundaries, [06-IMPLEMENTATION-ROADMAP.md](./06-IMPLEMENTATION-ROADMAP.md) for the Phase 1 operator workflow and [07-TESTING.md](./07-TESTING.md) for the test layout and conventions.
