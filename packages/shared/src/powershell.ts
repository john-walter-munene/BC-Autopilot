/**
 * PowerShell executable discovery shared by the BcContainerHelper bridges.
 * Returns the first PowerShell on PATH: pwsh (PowerShell 7) first, then Windows PowerShell.
 */

import fs from "node:fs";
import path from "node:path";

export function resolvePowershellPath(): string | null {
  const candidates = process.platform === "win32" ? ["pwsh.exe", "powershell.exe"] : ["pwsh", "powershell"];
  const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);

  for (const name of candidates) {
    for (const entry of pathEntries) {
      const fullPath = path.join(entry, name);
      try {
        if (fs.existsSync(fullPath)) return fullPath;
      } catch {
        // Keep searching unreadable PATH entries.
      }
    }
  }

  return null;
}