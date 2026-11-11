/**
 * AL Compiler & AST Linting Test Suite
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) engine unit tests
 */

import { describe, it, expect } from 'vitest';
import { lintAlCode } from '../src/utils/alLinter.ts';
import { alCompilerService } from '../src/modules/al-compiler/alCompiler.service.ts';
import { AL_OBJECT_ID_RANGE } from '../src/common/constants.ts';

describe('AL Compiler & Linter Engine', () => {

  it('validates correct tableextension AL syntax and ID allocation', () => {
    const validAl = `
tableextension 50100 "CustomerRiskExt" extends Customer
{
    fields
    {
        field(50100; "VIP Tier"; Option)
        {
            Caption = 'VIP Tier';
            DataClassification = CustomerContent;
            OptionMembers = Standard, Silver, Gold, Platinum;
        }
    }
}
    `.trim();

    const lint = lintAlCode(validAl);
    expect(lint.valid).toBe(true);
    expect(lint.errors).toHaveLength(0);
  });

  it('flags out-of-range object IDs outside of 50100..50149', () => {
    const invalidAl = `
tableextension 60100 "CustomerRiskExt" extends Customer
{
    fields
    {
        field(50100; "VIP Tier"; Option)
        {
            DataClassification = CustomerContent;
        }
    }
}
    `.trim();

    const lint = lintAlCode(invalidAl);
    expect(lint.warnings.some(w => w.message.includes('outside customary range'))).toBe(true);
  });

  it('generates complete AL extension package with manifest and valid SHA-256 fingerprint', () => {
    const alSuite = alCompilerService.generateAlSuite('Custom customer assessment scoring');
    expect(alSuite.files.length).toBeGreaterThan(0);
    expect(alSuite.manifest.runtime).toBe('13.0');
    expect(alSuite.manifest.target).toBe('Cloud');

    const compiled = alCompilerService.compileAndSeal({
      manifest: alSuite.manifest,
      files: alSuite.files
    });

    expect(compiled.success).toBe(true);
    expect(compiled.sha256Hash).toHaveLength(64);
    expect(compiled.filesCount).toBe(alSuite.files.length);
  });

});
