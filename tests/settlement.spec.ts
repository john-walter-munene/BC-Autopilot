/**
 * Settlement Engine & Cryptographic Verification Test Suite
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) settlement tests
 */

import { describe, it, expect } from 'vitest';
import { generateSha256Fingerprint, generatePackageSignature } from '../src/common/crypto.ts';
import { computeBuildSettlement } from '../src/modules/settlements/settlementService.ts';

describe('Settlement Engine & Cryptographic Integrity', () => {

  it('generates deterministic SHA-256 fingerprints for identical code artifacts', () => {
    const codeA = 'tableextension 50100 "CustomerExt" extends Customer { fields { field(50100; VIP; Boolean) {} } }';
    const codeB = 'tableextension 50100 "CustomerExt" extends Customer { fields { field(50100; VIP; Boolean) {} } }';
    const codeDiff = 'tableextension 50101 "CustomerExt" extends Customer { fields { field(50100; VIP; Boolean) {} } }';

    const hashA = generateSha256Fingerprint(codeA);
    const hashB = generateSha256Fingerprint(codeB);
    const hashDiff = generateSha256Fingerprint(codeDiff);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashDiff);
    expect(hashA).toHaveLength(64); // 256-bit hex
  });

  it('settles build successfully when all acceptance criteria and compiler pass', () => {
    const mockBuildRecord = {
      sessionId: 'session-test-01',
      extensionName: 'BCCustomerScoring',
      version: '1.0.0.0',
      sha256Hash: generateSha256Fingerprint('package-payload'),
      manifest: {
        id: '12345678-1234-1234-1234-1234567890ab',
        name: 'BCCustomerScoring',
        version: '1.0.0.0',
        runtime: '13.0',
        target: 'Cloud' as const,
        idRanges: [{ from: 50100, to: 50149 }]
      },
      alFiles: [
        { name: 'Customer.TableExt.al', objectType: 'tableextension' as const, objectId: 50100, code: 'code...' }
      ]
    };

    const mockRules = [
      { id: 'R1', storyTitle: 'VIP Tier Field Exists', passCriteria: 'Field 50100 exists', status: 'passed' as const },
      { id: 'R2', storyTitle: 'Credit Score Added', passCriteria: 'Field 50101 exists', status: 'passed' as const }
    ];

    const result = computeBuildSettlement(mockBuildRecord, mockRules, { passed: true, errors: [] });

    expect(result.status).toBe('SETTLED');
    expect(result.scorePercent).toBe(100);
    expect(result.passedCriteriaCount).toBe(2);
    expect(result.failedCriteriaCount).toBe(0);
    expect(result.verifiableCertificate.sha256Fingerprint).toBe(mockBuildRecord.sha256Hash);
  });

  it('flags build as DISPUTED when acceptance criteria fail', () => {
    const mockBuildRecord = {
      sessionId: 'session-test-02',
      extensionName: 'BCCustomerScoring',
      version: '1.0.0.0',
      sha256Hash: generateSha256Fingerprint('package-payload-broken'),
      manifest: {
        id: '12345678-1234-1234-1234-1234567890ab',
        name: 'BCCustomerScoring',
        version: '1.0.0.0',
        runtime: '13.0',
        target: 'Cloud' as const,
        idRanges: [{ from: 50100, to: 50149 }]
      },
      alFiles: []
    };

    const mockRules = [
      { id: 'R1', storyTitle: 'VIP Tier Field Exists', passCriteria: 'Field 50100 exists', status: 'passed' as const },
      { id: 'R2', storyTitle: 'Credit Score Added', passCriteria: 'Field 50101 exists', status: 'failed' as const, failureReason: 'Missing field definition' }
    ];

    const result = computeBuildSettlement(mockBuildRecord, mockRules, { passed: false, errors: ['Compilation failed'] });

    expect(result.status).toBe('DISPUTED');
    expect(result.scorePercent).toBeLessThan(100);
    expect(result.failedCriteriaCount).toBeGreaterThan(0);
  });

});
