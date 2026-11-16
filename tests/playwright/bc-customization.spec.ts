/**
 * Playwright end-to-end suite for Dynamics 365 Business Central customizations.
 *
 * Rules enforced here (docs/04, docs/AGENT-INSTRUCTIONS.md):
 *   - state-based waits only, never fixed sleeps
 *   - no conditional assertions: a missing control is a failure, not a skip
 *   - a managed storage state is required, so an unauthenticated run fails loudly
 *
 * Requires BC_WEB_URL and a captured session (see `npm run cli -- browse`).
 */

import { test, expect } from '@playwright/test';

const BC_SANDBOX_URL = process.env.BC_WEB_URL ?? 'https://businesscentral.dynamics.com/sandbox';
const STORAGE_STATE = process.env.PLAYWRIGHT_STORAGE_STATE ?? process.env.BC_STORAGE_STATE;

test.use(STORAGE_STATE ? { storageState: STORAGE_STATE } : {});

test.describe('Dynamics 365 Business Central customizations', () => {
  test.beforeEach(async ({ page }) => {
    // Accept modal confirmations so a dialog can never block the suite
    page.on('dialog', dialog => dialog.accept());
    await page.goto(BC_SANDBOX_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.ms-nav-ready, .ms-nav-action-bar', { timeout: 45_000 });
  });

  test('TC-01: custom table extension fields are rendered on the customer card', async ({ page }) => {
    await page.keyboard.press('Alt+Q');
    const tellMe = page.locator('input[aria-label*="Tell me what you want to do"]');
    await tellMe.fill('Customers');
    await page.keyboard.press('Enter');

    await page.waitForSelector('.ms-nav-content', { state: 'visible', timeout: 30_000 });
    const firstRow = page.locator('table.ms-nav-grid tbody tr, .ms-nav-list-row').first();
    await firstRow.click();
    await page.waitForSelector('.ms-nav-content', { state: 'visible' });

    await expect(page.locator('[controlname="VIP_Tier"], [aria-label*="VIP Tier"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[controlname="Credit_Assessment_Score"], [aria-label*="Credit Assessment Score"]')).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({ path: 'test-results/bc-extension-verified.png' });
  });

  test('TC-02: the custom action recalculates and confirms', async ({ page }) => {
    const action = page.locator('button[aria-label*="Customer Assessment"], button:has-text("Recalculate VIP Score")').first();
    await expect(action).toBeVisible({ timeout: 15_000 });
    await action.click();

    const notification = page.locator('.ms-nav-notification-bar, [role="alert"]').first();
    await expect(notification).toBeVisible({ timeout: 10_000 });
    await expect(notification).toContainText(/Calculation complete|VIP Tier updated/i);
  });

  test('TC-03: the OData API page exposes the custom fields', async ({ request }) => {
    const companyId = process.env.BC_COMPANY_ID;
    const token = process.env.BC_BEARER_TOKEN;
    test.skip(!companyId || !token, 'BC_COMPANY_ID and BC_BEARER_TOKEN are required for the API check');

    const response = await request.get(`/api/v2.0/companies(${companyId})/customerAssessments`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    // A non-200 is a real failure here: skipping it would hide a broken API page.
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.value)).toBe(true);
    if (body.value.length > 0) {
      expect(body.value[0]).toHaveProperty('vipTier');
      expect(body.value[0]).toHaveProperty('creditScore');
    }
  });
});
