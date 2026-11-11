/**
 * AL Compiler Domain Types
 * AL Language code generation, AST parsing, and extension package verification
 */

import type { AlExtensionFile, AppJsonManifest } from '../../types/agent.ts';

export type { AlExtensionFile, AppJsonManifest };

export interface CompileAlPackageRequest {
  manifest: AppJsonManifest;
  files: AlExtensionFile[];
}

export interface CompileAlPackageResult {
  success: boolean;
  sha256Hash: string;
  filesCount: number;
  diagnostics: Array<{ file: string; line: number; message: string; severity: 'error' | 'warning' }>;
  appJson: AppJsonManifest;
}
