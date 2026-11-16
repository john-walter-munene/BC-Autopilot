/**
 * Unit tests: generated Playwright specs.
 * Enforces the project's browser-automation rules on the code we emit, not just the code we write.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePlaywrightSuite, generatePlaywrightTestSuite } from "./playwright-generator.ts";
import type { FunctionalRequirementDoc } from "@bc-agent/shared";

const FRD: FunctionalRequirementDoc = {
  id: "frd-test",
  title: "Loyalty",
  version: "1.0.0",
  module: "Customer Management",
  overview: "Adds loyalty fields to the customer card.",
  userStories: [],
  baseTablesToExtend: [
    {
      id: 18,
      name: "Customer",
      extensionFields: [
        { name: "ALC Loyalty Tier", dataType: "Enum", description: "Tier", isCustom: true },
      ],
    },
  ],
  customTablesToCreate: [],
  businessRules: [],
  apiExposureNeeds: { entityName: "customerLoyalty", entitySetName: "customerLoyalties", exposedFields: ["id"], allowedMethods: ["GET"] },
  uiCustomizations: [{ targetPageId: 21, targetPageName: "Customer Card", placement: "addlast(General)", elementsToAdd: [] }],
};

/** The rules every generated spec must satisfy (docs/04 and LearnedRule PLAYWRIGHT_BC_HYDRATION_SELECTOR). */
function assertDeterministic(code: string): void {
  assert.doesNotMatch(code, /waitForTimeout/, "generated specs must never sleep");
  assert.match(code, /waitForSelector|waitFor\(|toBeVisible/, "waits must be on state, not time");
}

describe("generatePlaywrightSuite", () => {
  it("emits a deterministic spec with no fixed sleeps", () => {
    const suite = generatePlaywrightSuite(FRD);
    assertDeterministic(suite.testCode);
  });

  it("registers a dialog handler so modal confirmations cannot block the run", () => {
    const suite = generatePlaywrightSuite(FRD);
    assert.match(suite.testCode, /page\.on\('dialog'/);
  });

  it("targets the FRD's page and first custom field", () => {
    const suite = generatePlaywrightSuite(FRD);
    assert.match(suite.testCode, /Customer Card/);
    assert.match(suite.testCode, /ALC Loyalty Tier/);
  });

  it("produces steps that start pending, so nothing is reported as passed before a run", () => {
    const suite = generatePlaywrightSuite(FRD);
    assert.ok(suite.steps.length > 0);
    assert.ok(suite.steps.every(step => step.status === "pending"));
    assert.equal(suite.lastRunStatus, "idle");
  });

  it("does not invent a duration for a suite that has never run", () => {
    const suite = generatePlaywrightSuite(FRD);
    assert.equal(suite.totalDurationMs, 0);
  });
});

describe("generatePlaywrightTestSuite", () => {
  it("emits a real spec rather than a placeholder comment", () => {
    const suite = generatePlaywrightTestSuite(["ALC Loyalty Points"], "Customer Card");
    assert.match(suite.testCode, /from '@playwright\/test'/);
    assert.match(suite.testCode, /test\(/);
    assertDeterministic(suite.testCode);
  });
});
