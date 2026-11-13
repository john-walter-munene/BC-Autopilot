/**
 * Unit tests: AL compiler output parser.
 * Mirrors node-postgres `test/unit/utils-tests.js` — exhaustive table-driven coverage of every
 * accepted input shape, plus the edge cases that previously broke the reflection loop.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatAlcDiagnostics,
  groupDiagnosticsByFile,
  parseAlcLine,
  parseAlcOutput,
} from "./alc-output-parser.ts";

const SUCCESS_OUTPUT = [
  "Compiling project C:\\proj...",
  "0 Error(s)",
  "0 Warning(s)",
  "Successfully created package 'C:\\proj\\.output\\alc_BCCustomerScoring_1.0.0.0.app'",
  "",
].join("\n");

const ERROR_OUTPUT = [
  'C:\\proj\\Customer.TableExt.al(12,9): error AL1022: The name "ALC Loyalty Tier" does not exist in the current context.',
  'C:\\proj\\CustomerCard.PageExt.al(7,13): error AL0118: The field "ALC Loyalty Tier" is not defined on the table.',
  "2 Error(s)",
  "",
].join("\n");

const WARNING_OUTPUT = [
  'C:\\proj\\Customer.TableExt.al(12,9): warning AL0666: Field "ALC Loyalty Tier" must have a DataClassification.',
  'C:\\proj\\CustomerCard.PageExt.al(7,13): warning AA0207: Control "ALC Loyalty Tier" is missing a ToolTip.',
  "2 Warning(s)",
  "Successfully created package 'C:\\proj\\.output\\alc_BCCustomerScoring_1.0.0.0.app'",
  "",
].join("\n");

describe("parseAlcLine", () => {
  it("parses a located error diagnostic with line and column", () => {
    const raw = 'C:\\proj\\Customer.TableExt.al(12,9): error AL1022: The name "Foo" does not exist.';
    const diagnostic = parseAlcLine(raw);
    assert.deepEqual(diagnostic, {
      code: "AL1022",
      severity: "error",
      message: 'The name "Foo" does not exist.',
      file: "C:\\proj\\Customer.TableExt.al",
      line: 12,
      column: 9,
      raw,
    });
  });

  it("parses a located diagnostic without a column", () => {
    const d = parseAlcLine("Customer.TableExt.al(12): warning AL0666: Missing DataClassification.");
    assert.equal(d?.line, 12);
    assert.equal(d?.column, undefined);
    assert.equal(d?.severity, "warning");
    assert.equal(d?.code, "AL0666");
  });

  it("parses a relative file path", () => {
    const d = parseAlcLine("src/Customer.TableExt.al(3,1): error AL0118: Field not defined.");
    assert.equal(d?.file, "src/Customer.TableExt.al");
  });

  it("parses a diagnostic with a trailing project tag", () => {
    const d = parseAlcLine("Customer.TableExt.al(12,9): error AL1022: Bad name. [C:\\proj\\App.app]");
    assert.equal(d?.message, "Bad name.");
  });

  it("parses an unlocated diagnostic", () => {
    const d = parseAlcLine('error AL1022: The name "Foo" does not exist.');
    assert.equal(d?.code, "AL1022");
    assert.equal(d?.severity, "error");
    assert.equal(d?.message, 'The name "Foo" does not exist.');
    assert.equal(d?.file, undefined);
  });

  it("parses a bare analyzer code as an error", () => {
    const d = parseAlcLine('AL1022: The name "Foo" does not exist.');
    assert.equal(d?.code, "AL1022");
    assert.equal(d?.severity, "error");
  });

  it("parses a severity-only compiler failure with the AL0000 fallback code", () => {
    const d = parseAlcLine("error: The project file could not be loaded.");
    assert.equal(d?.code, "AL0000");
    assert.equal(d?.severity, "error");
    assert.equal(d?.message, "The project file could not be loaded.");
  });

  it('normalises the "information" severity alias to info', () => {
    const d = parseAlcLine("Customer.al(1,1): information AL0432: Deprecated usage.");
    assert.equal(d?.severity, "info");
  });

  it("normalises diagnostic codes to upper case", () => {
    const d = parseAlcLine("Customer.al(1,1): error al1022: Bad name.");
    assert.equal(d?.code, "AL1022");
  });

  it("returns null for blank lines", () => {
    assert.equal(parseAlcLine(""), null);
    assert.equal(parseAlcLine("   "), null);
  });

  it("returns null for non-diagnostic chatter", () => {
    assert.equal(parseAlcLine("Compiling project C:\\proj..."), null);
    assert.equal(parseAlcLine("0 Error(s)"), null);
  });
});

describe("parseAlcOutput", () => {
  it("reports success for a clean compile", () => {
    const result = parseAlcOutput(SUCCESS_OUTPUT);
    assert.equal(result.success, true);
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.packagesEmitted, 1);
  });

  it("reports failure and extracts every error", () => {
    const result = parseAlcOutput(ERROR_OUTPUT);
    assert.equal(result.success, false);
    assert.equal(result.errors.length, 2);
    assert.deepEqual(result.errors.map(e => e.code), ["AL1022", "AL0118"]);
    assert.equal(result.errors[0].file, "C:\\proj\\Customer.TableExt.al");
    assert.equal(result.errors[0].line, 12);
  });

  it("keeps warnings without failing the compile", () => {
    const result = parseAlcOutput(WARNING_OUTPUT);
    assert.equal(result.success, true);
    assert.equal(result.warnings.length, 2);
    assert.deepEqual(result.warnings.map(w => w.code), ["AL0666", "AA0207"]);
    assert.equal(result.packagesEmitted, 1);
  });

  it("merges stdout and stderr diagnostics", () => {
    const result = parseAlcOutput(
      "Customer.al(1,1): error AL1022: From stdout.",
      "Customer.al(2,1): error AL0118: From stderr."
    );
    assert.equal(result.errors.length, 2);
    assert.deepEqual(result.errors.map(e => e.message), ["From stdout.", "From stderr."]);
  });

  it("handles CRLF line endings", () => {
    const result = parseAlcOutput("Customer.al(1,1): error AL1022: Bad.\r\n1 Error(s)\r\n");
    assert.equal(result.errors.length, 1);
  });

  it("preserves unrecognised lines for the reflection loop", () => {
    const result = parseAlcOutput("Some unexpected compiler banner\n0 Error(s)\n");
    assert.deepEqual(result.unparsedLines, ["Some unexpected compiler banner"]);
  });

  it("counts multiple emitted packages", () => {
    const result = parseAlcOutput("Successfully created package 'a.app'\nSuccessfully created package 'b.app'\n");
    assert.equal(result.packagesEmitted, 2);
  });

  it("returns an empty, successful result for empty output", () => {
    const result = parseAlcOutput("", "");
    assert.equal(result.success, true);
    assert.equal(result.packagesEmitted, 0);
    assert.deepEqual(result.unparsedLines, []);
    assert.equal(result.diagnostics.length, 0);
  });

  it("treats a missing stdout argument as empty", () => {
    const result = parseAlcOutput(undefined);
    assert.equal(result.success, true);
  });
});

describe("groupDiagnosticsByFile", () => {
  it("groups diagnostics by file and buckets unlocated diagnostics under <project>", () => {
    const { diagnostics } = parseAlcOutput(
      [
        "A.al(1,1): error AL1022: one",
        "A.al(2,1): warning AL0666: two",
        "B.al(1,1): error AL0118: three",
        "error: project level failure",
      ].join("\n")
    );
    const grouped = groupDiagnosticsByFile(diagnostics);
    assert.deepEqual(Object.keys(grouped).sort(), ["<project>", "A.al", "B.al"]);
    assert.equal(grouped["A.al"].length, 2);
    assert.equal(grouped["B.al"].length, 1);
    assert.equal(grouped["<project>"].length, 1);
  });

  it("returns an empty object for no diagnostics", () => {
    assert.deepEqual(groupDiagnosticsByFile([]), {});
  });
});

describe("formatAlcDiagnostics", () => {
  it("renders a readable summary with file, line and column", () => {
    const { diagnostics } = parseAlcOutput("A.al(12,9): error AL1022: Bad name.");
    assert.equal(formatAlcDiagnostics(diagnostics), "A.al(12,9): error AL1022: Bad name.");
  });

  it("renders unlocated diagnostics without a location prefix", () => {
    const { diagnostics } = parseAlcOutput("error: project level failure");
    assert.equal(formatAlcDiagnostics(diagnostics), "error AL0000: project level failure");
  });

  it("renders a placeholder when there are no diagnostics", () => {
    assert.equal(formatAlcDiagnostics([]), "No diagnostics.");
  });
});