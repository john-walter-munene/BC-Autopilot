#!/usr/bin/env node
/**
 * BC Agent CLI.
 * Overlay counterpart: the command surface exposed by apps/api (scripts/ or bin/).
 *
 * Phase 1 commands write an AL project, compile it with the physical alc.exe,
 * sync symbol packages, publish to a container, and provision a sandbox.
 */

import fs from "node:fs";
import path from "node:path";
import {
  AlProjectWriter,
  AlcRunner,
  SymbolCacheService,
  PublishService,
  ContainerSandboxService,
  defaultOutputPath,
  formatAlcDiagnostics,
  resolveAlcPath,
} from "@bc-agent/shared";
import { alCompilerService } from "../apps/api/src/modules/al-compiler/al-compiler.service.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

function flag(name: string, fallback?: string): string | undefined {
  const inlineValue = args.find(arg => arg.startsWith(`--${name}=`));
  if (inlineValue !== undefined) return inlineValue.slice(name.length + 3) || fallback;

  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

function printHelp(): void {
  console.log(`
BC Agent - Autonomous Business Central CLI

Usage: node --experimental-strip-types bin/bc-agent.ts <command> [options]

Commands:
  generate-al    Generate an AL project folder
                 --out <dir>          Target project directory (default: ./al-src)

  compile        Compile an AL project with alc.exe
                 --project <dir>      AL project directory
                 --symbols <dir>      .alpackages cache directory
                 --out <file>         Output .app path
                 --alc <path>         Path to alc.exe (or set ALC_PATH)

  symbols        Sync the symbol package cache
                 --symbols <dir>      .alpackages cache directory
                 --source <dir>       Directory containing .app symbol packages

  publish        Publish a compiled .app to a container
                 --app <file>         Path to the .app package
                 --container <name>   Container name
                 --sync               Synchronise the schema

  sandbox        Provision a Business Central container
                 --container <name>   Container name
                 --port <n>           Web client port (default: 8080)

  settle         Print the SHA-256 fingerprint of generated AL sources
  doctor         Report toolchain availability (alc.exe, PowerShell)
  help           Show this manual
`);
}

async function main(): Promise<void> {
  switch (command) {
    case "generate-al": {
      const outDir = flag("out", "./al-src")!;
      const suite = alCompilerService.generateAlSuite("Customer assessment scoring");
      const result = new AlProjectWriter().writeProject({
        manifest: suite.manifest,
        files: suite.files,
        outDir,
      });
      console.log(`[generate-al] Project written to ${result.projectPath}`);
      for (const file of result.writtenFiles) console.log(`  - ${file}`);
      break;
    }

    case "compile": {
      const project = flag("project", "./al-src")!;
      const symbols = flag("symbols", path.join(project, ".alpackages"))!;
      const output = flag("out");
      const alc = flag("alc");

      const manifestPath = path.join(project, "app.json");
      if (!fs.existsSync(manifestPath)) {
        console.error(`[compile] app.json not found in ${project}`);
        process.exitCode = 1;
        return;
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      const result = await new AlcRunner().run({
        projectPath: project,
        packageCachePath: symbols,
        outputPath: output ?? defaultOutputPath(project, "alc", manifest.name, manifest.version),
        alcPath: alc,
      });

      if (result.parsed.diagnostics.length > 0) {
        console.log(formatAlcDiagnostics(result.parsed.diagnostics));
      }
      console.log(`[compile] ${result.success ? "SUCCESS" : "FAILED"} in ${result.durationMs}ms`);
      if (result.packageExists) console.log(`[compile] Package: ${result.outputPath} (${result.packageSizeBytes} bytes)`);
      if (!result.success) process.exitCode = 1;
      break;
    }

    case "symbols": {
      const symbols = flag("symbols", "./.alpackages")!;
      const sourceDir = flag("source");
      const cache = new SymbolCacheService();
      if (sourceDir) {
        if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
          console.error(`[symbols] Source directory not found: ${sourceDir}`);
          process.exitCode = 1;
          return;
        }

        const sources = fs.readdirSync(sourceDir, { withFileTypes: true })
          .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".app"))
          .map(entry => ({
            fileName: entry.name,
            content: fs.readFileSync(path.join(sourceDir, entry.name)),
          }));

        if (sources.length === 0) {
          console.error(`[symbols] No .app symbol packages found in ${sourceDir}`);
          process.exitCode = 1;
          return;
        }

        const result = cache.sync({ cachePath: symbols }, sources);
        console.log(`[symbols] Synced ${sources.length} package(s) into ${result.cachePath}`);
        console.log(`[symbols] Added: ${result.added.length}, updated: ${result.updated.length}, unchanged: ${result.unchanged.length}`);
        break;
      }

      const packages = cache.listPackages(symbols);
      console.log(`[symbols] ${packages.length} package(s) in ${path.resolve(symbols)}`);
      for (const pkg of packages) {
        console.log(`  - ${pkg.fileName} (${pkg.sizeBytes} bytes, ${pkg.sha256.slice(0, 12)})`);
      }
      break;
    }

    case "publish": {
      const app = flag("app");
      if (!app) {
        console.error("[publish] --app is required");
        process.exitCode = 1;
        return;
      }
      const result = await new PublishService().publish({
        appPath: app,
        containerName: flag("container"),
        sync: args.includes("--sync"),
      });
      console.log(`[publish] ${result.success ? "SUCCESS" : "FAILED"} in ${result.durationMs}ms`);
      if (result.stderr) console.error(result.stderr);
      if (!result.success) process.exitCode = 1;
      break;
    }

    case "sandbox": {
      const containerName = flag("container", "bcserver")!;
      const port = Number(flag("port", "8080"));
      const result = await new ContainerSandboxService().provision({
        containerName,
        webClientPort: port,
        acceptEula: true,
      });
      console.log(`[sandbox] ${result.success ? "SUCCESS" : "FAILED"} - ${result.webClientUrl}`);
      if (result.stderr) console.error(result.stderr);
      if (!result.success) process.exitCode = 1;
      break;
    }

    case "settle": {
      const suite = alCompilerService.generateAlSuite("Customer assessment scoring");
      const result = alCompilerService.compileAndSeal(suite);
      console.log(`[settle] ${result.success ? "SETTLED" : "DISPUTED"}`);
      console.log(`[settle] SHA-256: ${result.sha256Hash}`);
      if (!result.success) process.exitCode = 1;
      break;
    }

    case "doctor": {
      const alc = resolveAlcPath(flag("alc"));
      console.log(`alc.exe:     ${alc ?? "NOT FOUND (set ALC_PATH or --alc)"}`);
      console.log(`PowerShell:  ${process.platform === "win32" ? "expected at pwsh.exe/powershell.exe" : "pwsh"}`);
      console.log(`Node:        ${process.version}`);
      break;
    }

    default:
      printHelp();
      break;
  }
}

main().catch(error => {
  console.error("[CLI Error]:", error);
  process.exit(1);
});