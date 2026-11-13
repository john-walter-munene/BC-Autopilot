/**
 * AL Compiler Output Parser
 * Converts raw `alc.exe` stdout/stderr into structured diagnostics for the reflection loop.
 *
 * Supported formats (all observed in AL Language compiler output):
 *   C:\proj\Customer.TableExt.al(12,9): error AL1022: The name "Foo" does not exist.
 *   C:\proj\Customer.TableExt.al(12,9): warning AL0666: Field must have a DataClassification.
 *   C:\proj\Customer.TableExt.al(12,9): info AL0432: 'Foo' is marked for removal.
 *   error AL1022: The name "Foo" does not exist.
 *   Customer.TableExt.al(12,9): error AL1022: The name "Foo" does not exist.
 *   Customer.TableExt.al(12,9): error AL1022: The name "Foo" does not exist. [C:\proj\App.app]
 *   AL1022: The name "Foo" does not exist.
 *   error: The project file could not be loaded.
 */

import type { AlcDiagnostic, AlcDiagnosticSeverity, AlcParseResult } from './al-cli-types.ts';

const SEVERITY_ALIASES: Record<string, AlcDiagnosticSeverity> = {
  error: 'error',
  errors: 'error',
  warning: 'warning',
  warnings: 'warning',
  info: 'info',
  information: 'info',
  message: 'info',
};

/** `path(line,col): severity CODE: message` — the canonical MSBuild-style diagnostic */
const LOCATED_DIAGNOSTIC = /^(?<file>.+?)\((?<line>\d+)(?:,(?<column>\d+))?\)\s*:\s*(?<severity>error|warning|info|information)\s+(?<code>[A-Z]{2}\d{3,5})\s*:\s*(?<message>.*)$/i;

/** `severity CODE: message` — no file location */
const UNLOCATED_DIAGNOSTIC = /^(?<severity>error|warning|info|information)\s+(?<code>[A-Z]{2}\d{3,5})\s*:\s*(?<message>.*)$/i;

/** `CODE: message` — bare analyzer code */
const BARE_CODE_DIAGNOSTIC = /^(?<code>[A-Z]{2}\d{3,5})\s*:\s*(?<message>.*)$/;

/** `severity: message` — compiler-level failure without an analyzer code */
const SEVERITY_ONLY = /^(?<severity>error|warning|info|information)\s*:\s*(?<message>.+)$/i;

/** `N Error(s)` / `N Warning(s)` summary lines emitted by alc.exe */
const SUMMARY_LINE = /^\s*\d+\s+(?:error|warning|info)\(s\)\s*$|^\s*\d+\s+(?:error|warning|info)s?\s*$/i;

/** `Successfully created package '...app'` / `Package written to ...` */
const PACKAGE_EMITTED = /(successfully created package|package (?:was )?(?:written|created|saved)|wrote package)/i;

const NOISE_LINE = /^\s*$/;

function normaliseSeverity(raw: string): AlcDiagnosticSeverity {
  return SEVERITY_ALIASES[raw.toLowerCase()] ?? 'info';
}

function stripTrailingProjectTag(message: string): string {
  return message.replace(/\s*\[[^\]]+\.app\]\s*$/, '').trim();
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parse a single compiler output line. Returns `null` when the line is not a diagnostic.
 */
export function parseAlcLine(line: string): AlcDiagnostic | null {
  const trimmed = line.trim();
  if (NOISE_LINE.test(trimmed)) return null;

  const located = LOCATED_DIAGNOSTIC.exec(trimmed);
  if (located?.groups) {
    return {
      code: located.groups.code.toUpperCase(),
      severity: normaliseSeverity(located.groups.severity),
      message: stripTrailingProjectTag(located.groups.message),
      file: located.groups.file.trim(),
      line: toNumber(located.groups.line),
      column: toNumber(located.groups.column),
      raw: line,
    };
  }

  const unlocated = UNLOCATED_DIAGNOSTIC.exec(trimmed);
  if (unlocated?.groups) {
    return {
      code: unlocated.groups.code.toUpperCase(),
      severity: normaliseSeverity(unlocated.groups.severity),
      message: stripTrailingProjectTag(unlocated.groups.message),
      raw: line,
    };
  }

  const bareCode = BARE_CODE_DIAGNOSTIC.exec(trimmed);
  if (bareCode?.groups) {
    return {
      code: bareCode.groups.code.toUpperCase(),
      severity: 'error',
      message: stripTrailingProjectTag(bareCode.groups.message),
      raw: line,
    };
  }

  const severityOnly = SEVERITY_ONLY.exec(trimmed);
  if (severityOnly?.groups) {
    return {
      code: 'AL0000',
      severity: normaliseSeverity(severityOnly.groups.severity),
      message: stripTrailingProjectTag(severityOnly.groups.message),
      raw: line,
    };
  }

  return null;
}

/**
 * Parse the full stdout/stderr of an `alc.exe` invocation.
 */
export function parseAlcOutput(stdout: string, stderr = ''): AlcParseResult {
  const diagnostics: AlcDiagnostic[] = [];
  const unparsedLines: string[] = [];
  let packagesEmitted = 0;

  const allLines = [...(stdout ?? '').split(/\r?\n/), ...(stderr ?? '').split(/\r?\n/)];

  for (const line of allLines) {
    if (NOISE_LINE.test(line)) continue;

    if (SUMMARY_LINE.test(line.trim())) continue;

    if (PACKAGE_EMITTED.test(line)) {
      packagesEmitted += 1;
      continue;
    }

    const diagnostic = parseAlcLine(line);
    if (diagnostic) {
      diagnostics.push(diagnostic);
    } else {
      unparsedLines.push(line);
    }
  }

  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const infos = diagnostics.filter(d => d.severity === 'info');

  return {
    diagnostics,
    errors,
    warnings,
    infos,
    success: errors.length === 0,
    packagesEmitted,
    unparsedLines,
  };
}

/**
 * Group diagnostics by file for the reflection loop (file -> diagnostics).
 */
export function groupDiagnosticsByFile(diagnostics: AlcDiagnostic[]): Record<string, AlcDiagnostic[]> {
  const grouped: Record<string, AlcDiagnostic[]> = {};
  for (const diagnostic of diagnostics) {
    const key = diagnostic.file ?? '<project>';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(diagnostic);
  }
  return grouped;
}

/**
 * Render diagnostics as a compact, human-readable summary (used by the CLI and logs).
 */
export function formatAlcDiagnostics(diagnostics: AlcDiagnostic[]): string {
  if (diagnostics.length === 0) return 'No diagnostics.';
  return diagnostics
    .map(d => {
      const location = d.file ? `${d.file}${d.line !== undefined ? `(${d.line}${d.column !== undefined ? `,${d.column}` : ''})` : ''}: ` : '';
      return `${location}${d.severity} ${d.code}: ${d.message}`;
    })
    .join('\n');
}
