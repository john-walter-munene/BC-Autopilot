# 04: Playwright Browser Customization & Automated UI Testing
## Browser Agent Automation for Dynamics 365 Business Central Web Client

---

### 1. Business Central Web Client DOM Architecture

The Dynamics 365 Business Central Web Client presents distinct browser automation challenges:
1. **Dynamic Virtualized Grids**: List pages render virtualized DOM table rows (`.ms-nav-grid`, `.ms-nav-list-row`) that recycle on scroll.
2. **Dynamic Class Names**: Control class names (e.g. `.ms-nav-edit-control-28941`) mutate between platform builds and hotfixes.
3. **Modal Dialogs & FastTabs**: FastTabs can be collapsed by default; modal confirmations can block thread execution.
4. **In-Client Designer & Page Inspector**: Testing extensions requires activating Designer mode (`/design`) or Page Inspector (`Ctrl+Alt+F1`).

---

### 2. Resilient Selector Conventions

Downstream agents **MUST** follow these selector rules when generating Playwright scripts for Business Central:

| UI Component | Anti-Pattern (PROHIBITED) | Recommended Locator Pattern |
| :--- | :--- | :--- |
| **Field Inputs** | `.ms-nav-edit-control-1834` | `page.locator('[aria-label*="Loyalty Tier"], [data-field-name*="Loyalty Tier"]')` |
| **Tell Me Search** | `#search-input` | `page.locator('input[aria-label*="Tell me what you want to do"]')` |
| **Action Buttons** | `button.ms-nav-btn` | `page.locator('button[aria-label*="Recalculate Points"]')` |
| **FastTabs** | `.tab-header-2` | `page.locator('button[aria-label*="Loyalty & Rewards"][aria-expanded="false"]')` |
| **Grid Rows** | `tr:nth-child(4)` | `page.locator('table.ms-nav-grid tbody tr').first()` |
| **Page Inspector** | `#inspector-div` | `page.locator('.ms-nav-page-inspector, [aria-label*="Page Inspection"]')` |

---

### 3. Production Playwright Test Spec (`tests/bc-customization.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('D365 Business Central Extension Validation Suite', () => {
  const BC_URL = process.env.BC_WEB_URL || 'https://businesscentral.dynamics.com/sandbox';

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Handle any unhandled confirmation dialogs automatically
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  });

  test('Verify In-Client Designer, Page Inspector & Extension Fields on Customer Card', async ({ page }) => {
    // Step 1: Navigate to Business Central
    await page.goto(BC_URL, { waitUntil: 'networkidle' });

    // Step 2: Wait for Shell Hydration
    await page.waitForSelector('.ms-nav-ready, .ms-nav-action-bar', { timeout: 45000 });
    await expect(page.locator('.ms-nav-action-bar')).toBeVisible();

    // Step 3: Trigger Tell Me Search (Alt+Q)
    await page.keyboard.press('Alt+Q');
    const tellMeInput = page.locator('input[aria-label*="Tell me what you want to do"], input.ms-nav-tellme-search');
    await tellMeInput.waitFor({ state: 'visible', timeout: 10000 });
    await tellMeInput.fill('Customers');
    await page.keyboard.press('Enter');

    // Step 4: Open Target Customer Card
    const firstRow = page.locator('table.ms-nav-grid tbody tr, .ms-nav-list-row').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    await firstRow.click();
    await page.waitForSelector('.ms-nav-content', { state: 'visible' });

    // Step 5: Activate Page Inspector (Ctrl+Alt+F1)
    await page.keyboard.press('Control+Alt+F1');
    const inspector = page.locator('.ms-nav-page-inspector, [aria-label*="Page Inspection"]');
    await expect(inspector).toBeVisible({ timeout: 10000 });

    // Step 6: Expand Custom FastTab if Collapsed
    const fastTabToggle = page.locator('button[aria-label*="Loyalty & Rewards"][aria-expanded="false"]');
    if (await fastTabToggle.isVisible()) {
      await fastTabToggle.click();
      await page.waitForTimeout(500);
    }

    // Step 7: Assert Custom AL Extension Fields Rendered
    const loyaltyTierField = page.locator('[aria-label*="Loyalty Tier"], [data-field-name*="ALC Loyalty Tier"]');
    await expect(loyaltyTierField).toBeVisible();

    const loyaltyPointsField = page.locator('[aria-label*="Loyalty Points"], [data-field-name*="ALC Loyalty Points"]');
    await expect(loyaltyPointsField).toBeVisible();

    // Step 8: Capture Evidence Screenshot
    await page.screenshot({ path: 'test-results/bc-extension-verified.png', fullPage: false });
  });
});
```

---

### 4. Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BC_WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: './auth/bc-storage-state.json', // Cached Entra ID session
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

### 5. Headless CI/CD Execution Command

```bash
# Run automated suite in CI/CD pipeline
npx playwright test --config=playwright.config.ts --reporter=line,html
```
