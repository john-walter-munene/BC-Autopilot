/**
 * AL Compiler & Code Engineering Service
 * Generates idiomatic AL extensions, validates AST syntax, and packages sealed builds
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) compilation service pattern
 */

import { lintAlCode } from '../../utils/alLinter.ts';
import { generateSha256Fingerprint } from '../../common/crypto.ts';
import { generateDefaultAlFiles } from '../../services/alGenerator.ts';
import type { AlExtensionFile, AppJsonManifest } from '../../types/agent.ts';
import type { CompileAlPackageRequest, CompileAlPackageResult } from './alCompiler.types.ts';

export class AlCompilerService {
  generateAlSuite(requirementSummary?: string): { manifest: AppJsonManifest; files: AlExtensionFile[] } {
    return generateDefaultAlFiles(requirementSummary);
  }

  compileAndSeal(req: CompileAlPackageRequest): CompileAlPackageResult {
    const allDiagnostics: CompileAlPackageResult['diagnostics'] = [];

    // Lint each AL file
    for (const file of req.files) {
      const diagnostics = lintAlCode(file.fileName, file.codeContent);
      for (const diag of diagnostics) {
        if (diag.severity === 'error' || diag.severity === 'warning') {
          allDiagnostics.push({
            file: file.fileName,
            line: diag.line,
            message: diag.message,
            severity: diag.severity
          });
        }
      }
    }

    const hasErrors = allDiagnostics.some(d => d.severity === 'error');
    const combinedContent = JSON.stringify(req.manifest) + req.files.map(f => f.codeContent).join('\n');
    const sha256Hash = generateSha256Fingerprint(combinedContent);

    return {
      success: !hasErrors,
      sha256Hash,
      filesCount: req.files.length,
      diagnostics: allDiagnostics,
      appJson: req.manifest
    };
  }
}

export const alCompilerService = new AlCompilerService();
