# AL Engineering and Compiler

This guide covers AL project generation and the local Microsoft compiler integration. Reusable compiler and cache code lives in `packages/shared`; generated/domain AL helpers live in `apps/api/src/common/generators`.

## Project conventions

- AL manifests specify the target, runtime, application and ID ranges appropriate for the target Business Central version.
- Generated fields should include `DataClassification`; UI controls should include `ToolTip`.
- API pages should use `DelayedInsert = true` and `ODataKeyFields = SystemId` where appropriate.
- Use the actual target symbol packages and validate with `alc.exe`; the in-repository linter is a fast check, not a substitute for the Microsoft compiler.

## Compile a project

`compile` expects an existing AL project directory containing `app.json`.

```powershell
$env:ALC_PATH = "C:\path\to\alc.exe"
npm.cmd run compile -- --project=.\al-src --symbols=.\al-src\.alpackages
```

Available options:

| Option | Purpose |
|---|---|
| `--project <dir>` | AL project folder (default `./al-src`) |
| `--symbols <dir>` | `.alpackages` directory (defaults to `<project>/.alpackages`) |
| `--out <file>` | Compiled `.app` path |
| `--alc <path>` | Explicit `alc.exe` path; otherwise `ALC_PATH`/PATH lookup |

The CLI prints parsed diagnostics and sets a non-zero exit code on failure. The default output is written beneath the project `.output` directory.

## Populate the symbol cache

The CLI can copy local Microsoft `.app` symbol packages and write fingerprint metadata:

```powershell
npm.cmd run symbols -- --source=.\downloaded-symbols --symbols=.\al-src\.alpackages
```

Without `--source`, it lists packages already in the selected cache. This command does not download symbols or prune unrelated cache entries.

## Publish and provision

```powershell
npm.cmd run publish -- --app=.\al-src\.output\publisher_name_1.0.0.0.app --container=bcserver --sync
npm.cmd run sandbox -- --container=bcserver --port=8080
```

These commands invoke BcContainerHelper through PowerShell. Use a disposable development container and confirm the target container before publishing. See [the Phase 1 operator guide](./06-IMPLEMENTATION-ROADMAP.md).

## Validation boundary

Unit tests exercise process arguments, timeouts, output parsing and failure reporting using injected process runners. CI does not contain `alc.exe`, BcContainerHelper or a Business Central container, so real compile and deployment acceptance remains a local integration check.
