# @alchemy365/worker

Asynchronous BullMQ/Redis worker process executing long-running background tasks for the autonomous agent.

## Handled Jobs
- `SWEEP_MS_DOCS`: Regularly crawls new Microsoft Learn updates, release notes, and AL breaking changes.
- `COMPILE_AL_PACKAGE`: Compiles multi-file AL packages and calculates deterministic SHA-256 signatures.
- `RUN_PLAYWRIGHT_SUITE`: Spawns headless Chromium to execute end-to-end tests against Business Central sandboxes.
- `COMPUTE_SETTLEMENT`: Compares acceptance criteria assertions against compiler logs and issues audit certificates.
