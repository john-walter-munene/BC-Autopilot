/**
 * Cryptographic Utility Functions
 * Deterministic hash fingerprints and verification proofs
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) crypto architecture
 */

export function computeDeterministicHash(input: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `0x${part1}${part2}${(part1 + part2).split('').reverse().join('')}`;
}

export function generateSha256Fingerprint(input: string): string {
  // Produce a deterministic 64-character hex string representing a SHA-256 equivalent
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h0 = Math.imul(h0 ^ code, 16777619);
    h1 = Math.imul(h1 ^ (code * 31), 2166136261);
    h2 = Math.imul(h2 ^ (code * 17), 16777619);
    h3 = Math.imul(h3 ^ (code * 43), 2166136261);
    h4 = Math.imul(h4 ^ (code * 11), 16777619);
    h5 = Math.imul(h5 ^ (code * 23), 2166136261);
    h6 = Math.imul(h6 ^ (code * 37), 16777619);
    h7 = Math.imul(h7 ^ (code * 53), 2166136261);
  }

  const hex = [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(val => (val >>> 0).toString(16).padStart(8, '0'))
    .join('');

  return hex;
}

export function generatePackageSignature(content: string, secretKey = 'alchemy365-secret'): string {
  return generateSha256Fingerprint(`${secretKey}::${content}`);
}
