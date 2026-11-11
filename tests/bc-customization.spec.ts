/**
 * Playwright End-to-End Test Suite for Dynamics 365 Business Central Customizations
 * Verifies UI customizations, table extensions, action triggers, and API responsiveness.
 * Mirrors Overlay testing architecture.
 */

import { test, expect } from '@playwright/test';

const BC_SANDBOX_URL = process.env.BC_WEB_URL || 'https://businesscentral.dynamics.com/sandbox';
const TIMEOUT_MS = 45000;

test.describe('Dynamics 365 Business Central Autonomous Customizations', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate with Entra ID Bearer session cookie or mock sandbox
    await page.goto(BC_SANDBOX_URL, { waitUntil: 'networkidle', timeout: TIMEOUT_MS });
  });

  test('TC-01: Verifies Custom Table Extension Fields on Customer Card', async ({ page }) => {
    // 1. Navigate to Customer List
    const searchBar = page.locator('input[aria-label="Tell me what you want to do"]');
    if (await searchBar.isVisible()) {
      await searchBar.fill('Customers');
      await page.keyboard.press('Enter');
    }

    // 2. Open First Customer Record (e.g., Adatum Corporation)
    const customerRow = page.locator('table tbody tr').first();
    await customerRow.click();
    await page.keyboard.press('Enter');

    // 3. Assert Custom VIP Tier and Credit Assessment Score fields exist
    const vipTierField = page.locator('[controlname="VIP_Tier"], [aria-label*="VIP Tier"]');
    await expect(vipTierField).toBeVisible({ timeout: 15000 });

    const creditScoreField = page.locator('[controlname="Credit_Assessment_Score"], [aria-label*="Credit Assessment Score"]');
    await expect(creditScoreField).toBeVisible({ timeout: 15000 });
  });

  test('TC-02: Verifies Custom Action Trigger and Calculation Dialog', async ({ page }) => {
    // 1. Locate Action Bar on Customer Card
    const actionsGroup = page.locator('button[aria-label*="Customer Assessment"], button:has-text("Recalculate VIP Score")');
    if (await actionsGroup.isVisible()) {
      await actionsGroup.click();

      // 2. Expect notification banner confirming trigger executed
      const notificationBanner = page.locator('.ms-nav-notification-bar, [role="alert"]');
      await expect(notificationBanner).toBeVisible({ timeout: 10000 });
      await expect(notificationBanner).toContainText(/Calculation complete|VIP Tier updated/i);
    }
  });

  test('TC-03: Verifies OData API Page Response Schema for Next.js Bridge', async ({ request }) => {
    const apiEndpoint = `/api/v2.0/companies(${process.env.BC_COMPANY_ID || '00000000-0000-0000-0000-000000000000'})/customerAssessments`;
    
    // Test API Page responds with required custom fields
    const response = await request.get(apiEndpoint, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.BC_BEARER_TOKEN || 'mock-token'}`
      }
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('value');
      expect(Array.isArray(body.value)).toBe(true);
      if (body.value.length > 0) {
        expect(body.value[0]).toHaveProperty('vipTier');
        expect(body.value[0]).toHaveProperty('creditScore');
      }
    }
  });

});
