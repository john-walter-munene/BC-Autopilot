# Phase 1 — Local Business Central Toolchain

Phase 1 adds a local CLI path for compiling AL projects and operating a Business Central container. It uses the same shared service layer as the API; Microsoft tools remain external prerequisites.

## Requirements

- Node.js 22.6+ and npm
- `alc.exe`, resolved from `--alc`, `ALC_PATH`, or `PATH`
- PowerShell and BcContainerHelper for `publish` and `sandbox`
- A compatible local Docker host for container provisioning
- Locally acquired symbol `.app` packages for the target Business Central version

## Operator workflow

1. Prepare an AL project with `app.json` and source files.
2. Obtain the required symbol packages for the target version.
3. Copy them into `.alpackages` and record their cache manifest:

   ```powershell
   npm.cmd run symbols -- --source=.\symbols --symbols=.\al-src\.alpackages
   ```

4. Compile the project:

   ```powershell
   npm.cmd run compile -- --project=.\al-src --symbols=.\al-src\.alpackages
   ```

5. Provision a sandbox if needed, then publish the resulting package:

   ```powershell
   npm.cmd run sandbox -- --container=bcserver --port=8080
   npm.cmd run publish -- --app=.\al-src\.output\publisher_name_1.0.0.0.app --container=bcserver --sync
   ```

Use `npm run cli -- help` to inspect every command option. `compile` accepts `--out` and `--alc`; `publish` supports `--sync`.

## Implemented and not yet automated

Implemented shared services cover AL project writing, process execution, diagnostics parsing, local symbol-cache synchronization and fingerprinting, PowerShell publishing, and container provisioning. The root npm aliases expose `compile`, `symbols`, `publish` and `sandbox`.

Symbol acquisition and release-wave selection are manual. The repository's CI verifies code and unit tests but cannot perform an actual AL compile or container publish. Those acceptance checks require a local Business Central toolchain and should be recorded against the exact target version.
