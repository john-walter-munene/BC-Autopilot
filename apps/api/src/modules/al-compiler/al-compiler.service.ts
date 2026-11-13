/**
 * AL compiler service: in-memory generation, linting and sealing.
 * Overlay counterpart: apps/api/src/modules/<name>/<name>.service.ts
 *
 * Phase 1 physical compilation lives in the shared pipeline (see alc-runner.ts).
 */

import { lintAlCode } from "../../common/al-linter.ts";
import { generateDefaultAlFiles } from "../../common/generators/al-generator.ts";
import { generateSha256Fingerprint } from "@bc-agent/shared";
import type { AlExtensionFile, AppJsonManifest } from "@bc-agent/shared";

export interface CompileAlPackageRequest {
  manifest: AppJsonManifest;
  files: AlExtensionFile[];
}

export interface CompileAlPackageResult {
  success: boolean;
  sha256Hash: string;
  filesCount: number;
  diagnostics: Array<{ file: string; line: number; message: string; severity: "error" | "warning" }>;
  appJson: AppJsonManifest;
}

export class AlCompilerService {
  generateAlSuite(requirementSummary?: string): { manifest: AppJsonManifest; files: AlExtensionFile[] } {
    return generateDefaultAlFiles(requirementSummary);
  }

  compileAndSeal(req: CompileAlPackageRequest): CompileAlPackageResult {
    const allDiagnostics: CompileAlPackageResult["diagnostics"] = [];

    for (const file of req.files) {
      const diagnostics = lintAlCode(file.fileName, file.codeContent);
      for (const diag of diagnostics) {
        if (diag.severity === "error" || diag.severity === "warning") {
          allDiagnostics.push({
            file: file.fileName,
            line: diag.line,
            message: diag.message,
            severity: diag.severity,
          });
        }
      }
    }

    const hasErrors = allDiagnostics.some(d => d.severity === "error");
    const combinedContent = JSON.stringify(req.manifest) + req.files.map(f => f.codeContent).join("\n");
    const sha256Hash = generateSha256Fingerprint(combinedContent);

    return {
      success: !hasErrors,
      sha256Hash,
      filesCount: req.files.length,
      diagnostics: allDiagnostics,
      appJson: req.manifest,
    };
  }
}

export const alCompilerService = new AlCompilerService();