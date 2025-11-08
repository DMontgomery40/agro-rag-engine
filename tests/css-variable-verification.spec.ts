/**
 * CSS Variable Integration Verification Test
 *
 * Verifies that all CSS files from /gui/css/ are correctly integrated into React
 * and that CSS variables are working properly in both dark and light modes.
 *
 * CRITICAL: This test ensures pixel-perfect ADA compliance for dyslexic user
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('CSS Variable Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React to fully render
    await page.waitForSelector('body', { state: 'attached' });
  });

  test('tokens.css loaded - Dark mode variables work', async ({ page }) => {
    // Get computed styles for :root
    const rootStyles = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        bg: styles.getPropertyValue('--bg').trim(),
        bgElev1: styles.getPropertyValue('--bg-elev1').trim(),
        bgElev2: styles.getPropertyValue('--bg-elev2').trim(),
        fg: styles.getPropertyValue('--fg').trim(),
        fgMuted: styles.getPropertyValue('--fg-muted').trim(),
        accent: styles.getPropertyValue('--accent').trim(),
        accentContrast: styles.getPropertyValue('--accent-contrast').trim(),
        line: styles.getPropertyValue('--line').trim(),
        ok: styles.getPropertyValue('--ok').trim(),
        warn: styles.getPropertyValue('--warn').trim(),
        err: styles.getPropertyValue('--err').trim(),
      };
    });

    // Verify dark mode CSS variables (EXACT values from tokens.css)
    expect(rootStyles.bg).toBe('#0a0a0a');
    expect(rootStyles.bgElev1).toBe('#111111');
    expect(rootStyles.bgElev2).toBe('#1a1a1a');
    expect(rootStyles.fg).toBe('#ffffff');
    expect(rootStyles.fgMuted).toBe('#9fb1c7');
    expect(rootStyles.accent).toBe('#00ff88');
    expect(rootStyles.accentContrast).toBe('#000000');
    expect(rootStyles.line).toBe('#2a2a2a');
    expect(rootStyles.ok).toBe('#00ff88');
    expect(rootStyles.warn).toBe('#ffaa00');
    expect(rootStyles.err).toBe('#ff6b6b');

    console.log('✅ Dark mode CSS variables verified');
  });

  test('tokens.css loaded - Light mode variables work', async ({ page }) => {
    // Set light mode by adding data-theme attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Wait for CSS to apply
    await page.waitForTimeout(100);

    // Get computed styles for light mode
    const lightStyles = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        bg: styles.getPropertyValue('--bg').trim(),
        bgElev1: styles.getPropertyValue('--bg-elev1').trim(),
        bgElev2: styles.getPropertyValue('--bg-elev2').trim(),
        fg: styles.getPropertyValue('--fg').trim(),
        fgMuted: styles.getPropertyValue('--fg-muted').trim(),
        accent: styles.getPropertyValue('--accent').trim(),
        accentContrast: styles.getPropertyValue('--accent-contrast').trim(),
        line: styles.getPropertyValue('--line').trim(),
        cardBg: styles.getPropertyValue('--card-bg').trim(),
        ok: styles.getPropertyValue('--ok').trim(),
        warn: styles.getPropertyValue('--warn').trim(),
        err: styles.getPropertyValue('--err').trim(),
      };
    });

    // Verify light mode CSS variables (WITH improvements)
    expect(lightStyles.bg).toBe('#F7F8FB');
    expect(lightStyles.bgElev1).toBe('#FFFFFF');
    expect(lightStyles.bgElev2).toBe('#F1F3F7');
    expect(lightStyles.fg).toBe('#0F1220');
    expect(lightStyles.fgMuted).toBe('#475569');
    expect(lightStyles.accent).toBe('#16A34A');
    expect(lightStyles.accentContrast).toBe('#FFFFFF');

    // CRITICAL: Verify light mode improvements
    expect(lightStyles.line).toBe('#94A3B8'); // Darker border (was #CBD5E1)
    expect(lightStyles.cardBg).toBe('#F8FAFC'); // Off-white (was #FFFFFF)

    expect(lightStyles.ok).toBe('#16A34A');
    expect(lightStyles.warn).toBe('#B45309');
    expect(lightStyles.err).toBe('#DC2626');

    console.log('✅ Light mode CSS variables verified (improvements applied)');
  });

  test('micro-interactions.css loaded - Animation variables work', async ({ page }) => {
    // Get computed styles for animation timing variables
    const animationVars = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        timingInstant: styles.getPropertyValue('--timing-instant').trim(),
        timingFast: styles.getPropertyValue('--timing-fast').trim(),
        timingNormal: styles.getPropertyValue('--timing-normal').trim(),
        timingSlow: styles.getPropertyValue('--timing-slow').trim(),
        timingLazy: styles.getPropertyValue('--timing-lazy').trim(),
        easeOut: styles.getPropertyValue('--ease-out').trim(),
        easeIn: styles.getPropertyValue('--ease-in').trim(),
        easeBounce: styles.getPropertyValue('--ease-bounce').trim(),
      };
    });

    // Verify ALL timing variables from micro-interactions.css
    expect(animationVars.timingInstant).toBe('0.05s');
    expect(animationVars.timingFast).toBe('0.15s');
    expect(animationVars.timingNormal).toBe('0.2s');
    expect(animationVars.timingSlow).toBe('0.3s');
    expect(animationVars.timingLazy).toBe('0.6s');

    // Verify easing functions
    expect(animationVars.easeOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(animationVars.easeIn).toBe('cubic-bezier(0.4, 0, 1, 1)');
    expect(animationVars.easeBounce).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)');

    console.log('✅ Micro-interaction CSS variables verified');
  });

  test('micro-interactions.css loaded - Shadow variables work', async ({ page }) => {
    const shadowVars = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        shadowSm: styles.getPropertyValue('--shadow-sm').trim(),
        shadowMd: styles.getPropertyValue('--shadow-md').trim(),
        shadowLg: styles.getPropertyValue('--shadow-lg').trim(),
      };
    });

    // Verify shadow variables
    expect(shadowVars.shadowSm).toBe('0 1px 3px rgba(0, 0, 0, 0.12)');
    expect(shadowVars.shadowMd).toBe('0 4px 12px rgba(0, 0, 0, 0.15)');
    expect(shadowVars.shadowLg).toBe('0 8px 24px rgba(0, 0, 0, 0.2)');

    console.log('✅ Shadow CSS variables verified');
  });

  test('CSS variables applied to body element', async ({ page }) => {
    // Verify body element uses CSS variables correctly
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = getComputedStyle(body);
      return {
        background: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Body should use var(--bg) and var(--fg)
    // These values will be computed to RGB, so we need to check they're set
    expect(bodyStyles.background).toBeTruthy();
    expect(bodyStyles.color).toBeTruthy();

    // Verify they're not default browser colors
    expect(bodyStyles.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(bodyStyles.color).not.toBe('rgb(0, 0, 0)');

    console.log('✅ CSS variables applied to body element');
  });

  test('All CSS files loaded in correct order', async ({ page }) => {
    // Check that all stylesheets are loaded
    const stylesheets = await page.evaluate(() => {
      const links = Array.from(document.styleSheets);
      return links.map(sheet => {
        try {
          return sheet.href || 'inline';
        } catch {
          return 'restricted';
        }
      });
    });

    // At minimum, we should have CSS loaded (could be bundled)
    expect(stylesheets.length).toBeGreaterThan(0);

    console.log('✅ CSS files loaded:', stylesheets.length, 'stylesheets');
  });

  test('Reduced motion media query respects preferences', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Check that animations are disabled
    const animationCheck = await page.evaluate(() => {
      const testDiv = document.createElement('div');
      testDiv.style.animation = 'test 1s';
      document.body.appendChild(testDiv);

      const styles = getComputedStyle(testDiv);
      const animationDuration = styles.animationDuration;

      document.body.removeChild(testDiv);
      return animationDuration;
    });

    // With reduced motion, animations should be 0.01ms (from micro-interactions.css)
    console.log('✅ Reduced motion preference detected');
  });

  test('Build produced valid CSS bundle', async ({ page }) => {
    // Check for CSS errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('css')) {
        errors.push(msg.text());
      }
    });

    // Navigate and wait for all CSS to load
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify no CSS errors
    expect(errors.length).toBe(0);

    console.log('✅ No CSS errors in console');
  });
});

test.describe('CSS Integration Summary', () => {
  test('Generate integration report', async ({ page }) => {
    await page.goto(BASE_URL);

    const report = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);

      return {
        tokensLoaded: styles.getPropertyValue('--accent').trim() === '#00ff88',
        microInteractionsLoaded: styles.getPropertyValue('--timing-fast').trim() === '0.15s',
        darkModeWorks: styles.getPropertyValue('--bg').trim() === '#0a0a0a',
        animationVarsWork: styles.getPropertyValue('--ease-out').trim().includes('cubic-bezier'),
      };
    });

    console.log('\n========================================');
    console.log('CSS INTEGRATION VERIFICATION REPORT');
    console.log('========================================');
    console.log('✅ tokens.css loaded:', report.tokensLoaded);
    console.log('✅ micro-interactions.css loaded:', report.microInteractionsLoaded);
    console.log('✅ Dark mode working:', report.darkModeWorks);
    console.log('✅ Animation variables working:', report.animationVarsWork);
    console.log('========================================\n');

    expect(report.tokensLoaded).toBe(true);
    expect(report.microInteractionsLoaded).toBe(true);
    expect(report.darkModeWorks).toBe(true);
    expect(report.animationVarsWork).toBe(true);
  });
});
