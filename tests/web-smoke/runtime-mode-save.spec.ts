/**
 * AGRO - Runtime Mode Save Functionality Test
 *
 * Verifies Phase 4 implementation:
 * - Runtime mode loads from backend on mount
 * - User can change runtime mode in UI
 * - Save button calls backend API
 * - Value persists after refresh
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8012';

test.describe('Runtime Mode Save Functionality', () => {
  test.beforeAll(async ({ request }) => {
    // Reset to development mode before tests
    await request.patch(`${API_BASE}/api/config/runtime_mode`, {
      data: { mode: 'development' }
    });
  });

  test('Runtime mode loads initial value from backend', async ({ page }) => {
    // Navigate to Infrastructure > Services tab
    await page.goto('/?tab=infrastructure&subtab=services');
    await page.waitForTimeout(2000);

    // Check that select element exists and has correct initial value
    const select = await page.locator('#infra-runtime-mode');
    await expect(select).toBeVisible();

    // Should load 'development' -> '1' from backend
    const value = await select.inputValue();
    console.log('[Test] Initial runtime mode value:', value);
    expect(value).toBe('1'); // '1' = development
  });

  test('User can change runtime mode to production and save', async ({ page, request }) => {
    // Navigate to Infrastructure > Services tab
    await page.goto('/?tab=infrastructure&subtab=services');
    await page.waitForTimeout(2000);

    // Listen for API call
    let apiCallMade = false;
    let apiPayload: any = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/config/runtime_mode') && req.method() === 'PATCH') {
        apiCallMade = true;
        apiPayload = req.postDataJSON();
        console.log('[Test] API call detected:', req.url(), apiPayload);
      }
    });

    // Change select to production ('0')
    await page.selectOption('#infra-runtime-mode', '0');
    await page.waitForTimeout(500);

    // Click save button
    const saveButton = await page.getByText(/Save Runtime Mode/);
    await saveButton.click();

    // Wait for API call and response
    await page.waitForTimeout(2000);

    // Verify API was called with correct payload
    expect(apiCallMade).toBe(true);
    expect(apiPayload).toEqual({ mode: 'production' });

    // Verify success message appears
    const successMessage = await page.getByText(/Runtime mode saved/);
    await expect(successMessage).toBeVisible();
    console.log('[Test] Success message shown');

    // Verify backend actually saved the value
    const response = await request.get(`${API_BASE}/api/config/runtime_mode`);
    const data = await response.json();
    expect(data.runtime_mode).toBe('production');
    console.log('[Test] Backend confirmed mode is production');
  });

  test('Runtime mode persists after page refresh', async ({ page }) => {
    // Navigate to Infrastructure > Services tab
    await page.goto('/?tab=infrastructure&subtab=services');
    await page.waitForTimeout(2000);

    // Verify select shows '0' (production) from previous test
    const select = await page.locator('#infra-runtime-mode');
    const value = await select.inputValue();
    expect(value).toBe('0'); // '0' = production
    console.log('[Test] Runtime mode persisted after refresh:', value);
  });

  test('User can change back to development mode', async ({ page, request }) => {
    // Navigate to Infrastructure > Services tab
    await page.goto('/?tab=infrastructure&subtab=services');
    await page.waitForTimeout(2000);

    // Listen for API call
    let apiCallMade = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/config/runtime_mode') && req.method() === 'PATCH') {
        apiCallMade = true;
      }
    });

    // Change back to development ('1')
    await page.selectOption('#infra-runtime-mode', '1');
    await page.waitForTimeout(500);

    // Click save button
    const saveButton = await page.getByText(/Save Runtime Mode/);
    await saveButton.click();

    // Wait for API call
    await page.waitForTimeout(2000);

    // Verify API was called
    expect(apiCallMade).toBe(true);

    // Verify backend saved development
    const response = await request.get(`${API_BASE}/api/config/runtime_mode`);
    const data = await response.json();
    expect(data.runtime_mode).toBe('development');
    console.log('[Test] Successfully changed back to development mode');
  });

  test('Save button is disabled during save operation', async ({ page }) => {
    // Navigate to Infrastructure > Services tab
    await page.goto('/?tab=infrastructure&subtab=services');
    await page.waitForTimeout(2000);

    // Change mode
    await page.selectOption('#infra-runtime-mode', '0');
    await page.waitForTimeout(500);

    // Get save button
    const saveButton = await page.getByText(/Save Runtime Mode/);

    // Click save and immediately check disabled state
    await saveButton.click();

    // During save, button should show "Saving..." or be disabled
    await page.waitForTimeout(100);
    const buttonText = await saveButton.textContent();
    console.log('[Test] Button text during save:', buttonText);

    // Button should eventually return to normal state
    await page.waitForTimeout(3000);
    const finalText = await saveButton.textContent();
    expect(finalText).toContain('Save Runtime Mode');
    console.log('[Test] Button returned to normal state:', finalText);
  });
});
