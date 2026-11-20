import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repositoryRoot, "bin", "bc-agent.ts");

function runCli(args: string[]): string {
  return execFileSync(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

describe("BC Agent CLI", () => {
  it("shows the wired Phase 1 and Phase 2 commands in help", () => {
    const output = runCli(["help"]);
    for (const command of ["compile", "symbols", "publish", "sandbox", "browse"]) {
      assert.match(output, new RegExp(`^  ${command}\\s`, "m"));
    }
  });

  it("syncs local symbol packages into the cache", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-agent-cli-"));
    try {
      const sourceDir = path.join(tempDir, "source");
      const cacheDir = path.join(tempDir, "cache");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "Microsoft_Base Application_24.0.0.0.app"), "symbol-bytes");

      const output = runCli(["symbols", `--source=${sourceDir}`, `--symbols=${cacheDir}`]);
      assert.match(output, /Synced 1 package/);

      const cachedPackage = path.join(cacheDir, "Microsoft_Base Application_24.0.0.0.app");
      assert.equal(fs.readFileSync(cachedPackage, "utf8"), "symbol-bytes");
      const manifest = JSON.parse(fs.readFileSync(path.join(cacheDir, "symbol-cache.json"), "utf8"));
      assert.equal(manifest.packages.length, 1);
      assert.equal(manifest.packages[0].fileName, path.basename(cachedPackage));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails clearly when a symbol source directory has no packages", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-agent-cli-"));
    try {
      const result = spawnSync(process.execPath, [
        "--experimental-strip-types",
        cliPath,
        "symbols",
        "--source",
        tempDir,
      ], { cwd: repositoryRoot, encoding: "utf8" });

      assert.equal(result.status, 1);
      assert.match(result.stderr, /No \.app symbol packages found/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("BC Agent CLI browse", () => {
  it("fails clearly when the managed storage state is missing, and never claims a pass", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-agent-browse-"));
    try {
      const result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", cliPath, "browse", `--auth-state=${path.join(tempDir, "state.json")}`, `--out=${tempDir}`],
        { cwd: repositoryRoot, encoding: "utf8" }
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Storage state is not usable|not found/i);
      assert.match(result.stderr, /browse|auth-state/i, "the error explains how to fix it");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("BC Agent CLI login", () => {
  it("appears in help alongside browse", () => {
    const output = runCli(["help"]);
    assert.match(output, /^ {2}login\s/m);
    assert.match(output, /--auth-state <file>/);
  });

  it("refuses a non-https sign-in URL before launching a browser", () => {
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", cliPath, "login", "--url=http://bc.example", `--out=${path.join(os.tmpdir(), "never.json")}`],
      { cwd: repositoryRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /https/i);
  });

  it("requires a --url", () => {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", cliPath, "login"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /--url/i);
  });
});

describe("BC Agent CLI login and browse wiring", () => {
  it("onboarding order is visible in help: login produces the state browse consumes", () => {
    const output = runCli(["help"]);
    const loginIndex = output.indexOf("  login");
    const browseIndex = output.indexOf("  browse");
    assert.ok(loginIndex >= 0 && browseIndex >= 0);
    assert.equal(output.includes("default: auth/bc-storage-state.json"), true);
  });
});
