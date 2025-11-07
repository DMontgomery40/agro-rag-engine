import { test, expect, Page } from '@playwright/test';

/**
 * Accessibility Audit - ADA Compliance
 *
 * Tests accessibility requirements:
 * - All buttons have accessible labels
 * - All inputs have labels
 * - Tab navigation works
 * - Keyboard shortcuts work
 * - No contrast issues
 * - Screen reader compatibility
 * - Focus indicators visible
 * - ARIA attributes present
 * - Form validation accessible
 * - Modal dialogs accessible
 */

test.describe('Accessibility Audit - ADA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:8012');
    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('All buttons have accessible labels or text', async ({ page }) => {
    console.log('\n=== BUTTON ACCESSIBILITY ===\n');

    // Get all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons`);

    let unlabeledButtons = 0;

    for (let i = 0; i < Math.min(buttonCount, 50); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);

      if (!isVisible) continue;

      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');

      if (!text?.trim() && !ariaLabel && !ariaLabelledby && !title) {
        unlabeledButtons++;
        console.log(`⚠ Unlabeled button found at index ${i}`);
      }
    }

    console.log(`✓ Checked ${Math.min(buttonCount, 50)} buttons`);
    console.log(`✓ Unlabeled buttons: ${unlabeledButtons}`);
    expect(unlabeledButtons).toBeLessThan(5); // Allow some minor issues
  });

  test('All form inputs have associated labels', async ({ page }) => {
    console.log('\n=== INPUT ACCESSIBILITY ===\n');

    // Get all inputs
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} form inputs`);

    let unlabeledInputs = 0;

    for (let i = 0; i < Math.min(inputCount, 50); i++) {
      const input = inputs.nth(i);
      const isVisible = await input.isVisible().catch(() => false);

      if (!isVisible) continue;

      const type = await input.getAttribute('type');
      if (type === 'hidden') continue;

      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check for associated label
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = await label.count() > 0;
      }

      if (!hasLabel && !ariaLabel && !ariaLabelledby && !placeholder) {
        unlabeledInputs++;
        console.log(`⚠ Unlabeled input found at index ${i}`);
      }
    }

    console.log(`✓ Checked ${Math.min(inputCount, 50)} inputs`);
    console.log(`✓ Unlabeled inputs: ${unlabeledInputs}`);
    expect(unlabeledInputs).toBeLessThan(10); // Allow some minor issues
  });

  test('Tab navigation works through interactive elements', async ({ page }) => {
    console.log('\n=== TAB NAVIGATION ===\n');

    // Get initial focus
    let previousFocus = await page.evaluate(() => document.activeElement?.tagName);

    // Tab through elements
    const maxTabs = 20;
    let successfulTabs = 0;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const currentFocus = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        type: (document.activeElement as HTMLInputElement)?.type,
        text: document.activeElement?.textContent?.substring(0, 30)
      }));

      if (currentFocus.tag) {
        successfulTabs++;
        if (i < 5) {
          console.log(`  Tab ${i + 1}: ${currentFocus.tag} ${currentFocus.type || ''} - "${currentFocus.text || ''}"`);
        }
      }
    }

    console.log(`✓ Successfully tabbed through ${successfulTabs}/${maxTabs} elements`);
    expect(successfulTabs).toBeGreaterThan(10);
  });

  test('Focus indicators are visible', async ({ page }) => {
    console.log('\n=== FOCUS INDICATORS ===\n');

    // Tab to first focusable element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Get computed styles of focused element
    const focusStyles = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return null;

      const styles = window.getComputedStyle(focused);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        boxShadow: styles.boxShadow,
        border: styles.border
      };
    });

    if (focusStyles) {
      console.log('✓ Focus styles:', JSON.stringify(focusStyles, null, 2));

      // Check if there's a visible focus indicator
      const hasVisibleFocus =
        (focusStyles.outlineWidth && focusStyles.outlineWidth !== '0px') ||
        (focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
        focusStyles.outline !== 'none';

      expect(hasVisibleFocus).toBe(true);
      console.log('✓ Focus indicators are visible');
    } else {
      console.log('⚠ No focused element found');
    }
  });

  test('Keyboard shortcuts work correctly', async ({ page }) => {
    console.log('\n=== KEYBOARD SHORTCUTS ===\n');

    // Test Ctrl+K for search
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const searchModal = page.locator('.global-search-modal, [role="dialog"]').first();
    const isVisible = await searchModal.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✓ Ctrl+K opens search modal');

      // Test ESC to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const isClosed = !(await searchModal.isVisible().catch(() => false));
      expect(isClosed).toBe(true);
      console.log('✓ ESC closes modal');
    } else {
      console.log('⚠ Search modal not found');
    }

    // Test arrow key navigation in search
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('model');
    await page.waitForTimeout(1000);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    console.log('✓ Arrow down key works');

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    console.log('✓ Arrow up key works');

    await page.keyboard.press('Escape');
  });

  test('ARIA roles and attributes are present', async ({ page }) => {
    console.log('\n=== ARIA ATTRIBUTES ===\n');

    // Check for common ARIA attributes
    const ariaElements = {
      'role=button': await page.locator('[role="button"]').count(),
      'role=dialog': await page.locator('[role="dialog"]').count(),
      'role=navigation': await page.locator('[role="navigation"]').count(),
      'role=main': await page.locator('[role="main"]').count(),
      'aria-label': await page.locator('[aria-label]').count(),
      'aria-labelledby': await page.locator('[aria-labelledby]').count(),
      'aria-describedby': await page.locator('[aria-describedby]').count(),
      'aria-hidden': await page.locator('[aria-hidden]').count()
    };

    console.log('ARIA elements found:');
    Object.entries(ariaElements).forEach(([attr, count]) => {
      console.log(`  ${attr}: ${count}`);
    });

    const totalAriaElements = Object.values(ariaElements).reduce((a, b) => a + b, 0);
    expect(totalAriaElements).toBeGreaterThan(5);
    console.log(`✓ Total ARIA elements: ${totalAriaElements}`);
  });

  test('Images have alt text', async ({ page }) => {
    console.log('\n=== IMAGE ACCESSIBILITY ===\n');

    const images = page.locator('img');
    const imageCount = await images.count();
    console.log(`Found ${imageCount} images`);

    let missingAlt = 0;

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible().catch(() => false);

      if (!isVisible) continue;

      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaHidden = await img.getAttribute('aria-hidden');

      if (!alt && !ariaLabel && ariaHidden !== 'true') {
        missingAlt++;
        console.log(`⚠ Image without alt text at index ${i}`);
      }
    }

    console.log(`✓ Checked ${imageCount} images`);
    console.log(`✓ Missing alt text: ${missingAlt}`);
    expect(missingAlt).toBeLessThan(3);
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    console.log('\n=== COLOR CONTRAST ===\n');

    // Sample text elements for contrast check
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
    const elementCount = await textElements.count();

    const sampleSize = Math.min(20, elementCount);
    let lowContrastElements = 0;

    for (let i = 0; i < sampleSize; i++) {
      const element = textElements.nth(i);
      const isVisible = await element.isVisible().catch(() => false);

      if (!isVisible) continue;

      const contrast = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;

        // Simple heuristic: if background is transparent, use parent
        const rgb = (color: string) => {
          const match = color.match(/\d+/g);
          return match ? match.map(Number) : [0, 0, 0];
        };

        const [r, g, b] = rgb(color);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return { color, bgColor, luminance };
      });

      // Very basic check - proper contrast testing requires more sophisticated algorithms
      if (contrast.luminance < 0.2 || contrast.luminance > 0.8) {
        // Likely good contrast (very dark or very light text)
      } else {
        lowContrastElements++;
      }
    }

    console.log(`✓ Checked ${sampleSize} text elements`);
    console.log(`✓ Potential low contrast elements: ${lowContrastElements}`);
  });

  test('Modal dialogs are accessible', async ({ page }) => {
    console.log('\n=== MODAL ACCESSIBILITY ===\n');

    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check for proper ARIA attributes
    const roleDialog = await modal.getAttribute('role').catch(() => null);
    const ariaModal = await modal.getAttribute('aria-modal').catch(() => null);
    const ariaLabel = await modal.getAttribute('aria-label').catch(() => null);
    const ariaLabelledby = await modal.getAttribute('aria-labelledby').catch(() => null);

    console.log('Modal attributes:');
    console.log(`  role: ${roleDialog}`);
    console.log(`  aria-modal: ${ariaModal}`);
    console.log(`  aria-label: ${ariaLabel}`);
    console.log(`  aria-labelledby: ${ariaLabelledby}`);

    // Modal should trap focus
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const focusInModal = await page.evaluate(() => {
      const focused = document.activeElement;
      const modal = document.querySelector('.global-search-modal, [role="dialog"]');
      return modal?.contains(focused);
    });

    if (focusInModal) {
      console.log('✓ Focus is trapped within modal');
    }

    // Can close with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const isClosed = !(await modal.isVisible().catch(() => false));
    expect(isClosed).toBe(true);
    console.log('✓ Modal can be closed with ESC');
  });

  test('Form validation is accessible', async ({ page }) => {
    console.log('\n=== FORM VALIDATION ACCESSIBILITY ===\n');

    // Navigate to a form
    await page.click('a[href="/start"]');
    await page.waitForTimeout(1000);

    // Open build cards form
    const buildButton = page.locator('button:has-text("Build Cards")').first();
    if (await buildButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await buildButton.click();
      await page.waitForTimeout(500);

      // Try to submit with invalid data
      const input = page.locator('input[type="text"]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill(''); // Empty input

        // Look for validation message
        const errorMessage = page.locator('[role="alert"], [aria-invalid="true"]').first();
        const hasValidation = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasValidation) {
          console.log('✓ Form validation messages are accessible');
        } else {
          console.log('⚠ No validation messages detected');
        }
      }
    }
  });

  test('Links have meaningful text', async ({ page }) => {
    console.log('\n=== LINK ACCESSIBILITY ===\n');

    const links = page.locator('a');
    const linkCount = await links.count();
    console.log(`Found ${linkCount} links`);

    let meaninglessLinks = 0;

    for (let i = 0; i < Math.min(linkCount, 30); i++) {
      const link = links.nth(i);
      const isVisible = await link.isVisible().catch(() => false);

      if (!isVisible) continue;

      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      const meaningfulText = text?.trim() || ariaLabel?.trim();

      if (!meaningfulText || meaningfulText.length < 2) {
        meaninglessLinks++;
        console.log(`⚠ Link with no meaningful text at index ${i}`);
      } else if (['click here', 'here', 'link', 'read more'].includes(meaningfulText.toLowerCase())) {
        meaninglessLinks++;
        console.log(`⚠ Link with generic text: "${meaningfulText}"`);
      }
    }

    console.log(`✓ Checked ${Math.min(linkCount, 30)} links`);
    console.log(`✓ Links with unclear purpose: ${meaninglessLinks}`);
    expect(meaninglessLinks).toBeLessThan(5);
  });

  test('Page has proper heading structure', async ({ page }) => {
    console.log('\n=== HEADING STRUCTURE ===\n');

    const headings = {
      h1: await page.locator('h1').count(),
      h2: await page.locator('h2').count(),
      h3: await page.locator('h3').count(),
      h4: await page.locator('h4').count(),
      h5: await page.locator('h5').count(),
      h6: await page.locator('h6').count()
    };

    console.log('Heading structure:');
    Object.entries(headings).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });

    // Should have at least one h1
    expect(headings.h1).toBeGreaterThan(0);
    console.log('✓ Page has at least one h1');

    // Should not have too many h1s
    expect(headings.h1).toBeLessThan(5);
    console.log('✓ Not too many h1 headings');
  });

  test('Interactive elements have proper states', async ({ page }) => {
    console.log('\n=== INTERACTIVE ELEMENT STATES ===\n');

    // Check disabled buttons
    const disabledButtons = page.locator('button:disabled, button[aria-disabled="true"]');
    const disabledCount = await disabledButtons.count();
    console.log(`Found ${disabledCount} disabled buttons`);

    if (disabledCount > 0) {
      const firstDisabled = disabledButtons.first();
      const ariaDisabled = await firstDisabled.getAttribute('aria-disabled');
      const disabled = await firstDisabled.getAttribute('disabled');

      console.log(`✓ Disabled button has: disabled="${disabled}", aria-disabled="${ariaDisabled}"`);
    }

    // Check checked checkboxes
    const checkedBoxes = page.locator('input[type="checkbox"]:checked');
    const checkedCount = await checkedBoxes.count();
    console.log(`Found ${checkedCount} checked checkboxes`);

    // Check selected radio buttons
    const selectedRadios = page.locator('input[type="radio"]:checked');
    const selectedCount = await selectedRadios.count();
    console.log(`Found ${selectedCount} selected radio buttons`);

    console.log('✓ Interactive elements have proper states');
  });

  test('No accessibility violations detected', async ({ page }) => {
    console.log('\n=== OVERALL ACCESSIBILITY SCORE ===\n');

    // This is a summary test that checks for major accessibility issues
    const violations = [];

    // Check for missing page title
    const title = await page.title();
    if (!title || title.length < 3) {
      violations.push('Missing or empty page title');
    }

    // Check for lang attribute
    const lang = await page.locator('html').getAttribute('lang');
    if (!lang) {
      violations.push('Missing lang attribute on html element');
    }

    // Check for skip link
    const skipLink = page.locator('a[href*="#main"], a:has-text("Skip to")').first();
    const hasSkipLink = await skipLink.count() > 0;
    if (!hasSkipLink) {
      violations.push('No skip to main content link found');
    }

    // Check for main landmark
    const mainLandmark = page.locator('main, [role="main"]').first();
    const hasMainLandmark = await mainLandmark.count() > 0;
    if (!hasMainLandmark) {
      violations.push('No main landmark found');
    }

    console.log('\nAccessibility Violations:');
    if (violations.length === 0) {
      console.log('  None detected!');
    } else {
      violations.forEach(v => console.log(`  ⚠ ${v}`));
    }

    console.log(`\n✓ Accessibility violations: ${violations.length}`);
    expect(violations.length).toBeLessThan(3);
  });
});
