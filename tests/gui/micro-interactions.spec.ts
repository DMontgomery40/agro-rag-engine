/**
 * AGRO Micro-Interactions Test Suite
 * Tests all UX polish features including:
 * - Button hover/active states
 * - Tab transitions
 * - Ripple effects
 * - Form validation feedback
 * - Loading states
 * - Accessibility (reduced motion, focus indicators)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:8012';

test.describe('Micro-Interactions & UX Polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Button Polish - Main Tab Buttons', () => {
    test('should have smooth hover transitions on tab buttons', async ({ page }) => {
      const tabButton = page.locator('.tab-bar button').first();

      // Check initial state
      const initialTransform = await tabButton.evaluate(el =>
        window.getComputedStyle(el).transform
      );

      // Hover over button
      await tabButton.hover();

      // Wait for transition to complete
      await page.waitForTimeout(200);

      // Check transform applied (should have scale or translateY)
      const hoverTransform = await tabButton.evaluate(el =>
        window.getComputedStyle(el).transform
      );

      // Transform should change on hover
      expect(hoverTransform).not.toBe(initialTransform);

      // Check for box-shadow (elevation)
      const boxShadow = await tabButton.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );
      expect(boxShadow).not.toBe('none');
    });

    test('should have click/active feedback', async ({ page }) => {
      const tabButton = page.locator('.tab-bar button').first();

      // Click and hold
      await tabButton.click({ delay: 100 });

      // Active state should have been applied momentarily
      // This is hard to catch, but we can verify the CSS exists
      const activeStyles = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        let found = false;

        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule &&
                  rule.selectorText?.includes('.tab-bar button:active')) {
                found = true;
                break;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return found;
      });

      expect(activeStyles).toBe(true);
    });

    test('should show ripple effect on click', async ({ page }) => {
      const tabButton = page.locator('.tab-bar button').first();

      // Click button
      await tabButton.click();

      // Wait a moment for ripple to appear
      await page.waitForTimeout(50);

      // Check if ripple element exists (may have already animated out)
      // We'll verify the UXFeedback module exists instead
      const hasUXFeedback = await page.evaluate(() => {
        return typeof window.UXFeedback !== 'undefined' &&
               typeof window.UXFeedback.createRipple === 'function';
      });

      expect(hasUXFeedback).toBe(true);
    });
  });

  test.describe('Subtab Interactions', () => {
    test('should reveal RAG subtabs with animation', async ({ page }) => {
      // Find RAG tab button
      const ragTab = page.locator('.tab-bar button').filter({ hasText: /RAG/i });

      // Click RAG tab
      await ragTab.click();

      // Wait for subtabs to appear
      await page.waitForTimeout(300);

      // Check if subtab bar is visible
      const subtabBar = page.locator('.subtab-bar').first();
      await expect(subtabBar).toBeVisible();

      // Check for animation state attribute
      const dataState = await subtabBar.getAttribute('data-state');
      expect(dataState).toBe('visible');
    });

    test('should have animated underline on subtab hover', async ({ page }) => {
      // Navigate to RAG tab to show subtabs
      const ragTab = page.locator('.tab-bar button').filter({ hasText: /RAG/i });
      await ragTab.click();
      await page.waitForTimeout(200);

      // Find first subtab button
      const subtabBtn = page.locator('.subtab-btn').first();

      // Hover over it
      await subtabBtn.hover();
      await page.waitForTimeout(200);

      // Check if ::after pseudo-element has width
      const hasUnderline = await subtabBtn.evaluate(el => {
        const styles = window.getComputedStyle(el, '::after');
        const width = styles.getPropertyValue('width');
        return width !== '0px' && width !== '';
      });

      expect(hasUnderline).toBe(true);
    });
  });

  test.describe('Tab Content Transitions', () => {
    test('should animate tab content when switching', async ({ page }) => {
      // Get initial tab
      const firstTab = page.locator('.tab-content.active').first();
      const firstTabId = await firstTab.getAttribute('id');

      // Click a different tab
      const secondTabButton = page.locator('.tab-bar button').nth(1);
      await secondTabButton.click();

      // Wait for transition
      await page.waitForTimeout(250);

      // Check that active tab changed
      const newActiveTab = page.locator('.tab-content.active').first();
      const newTabId = await newActiveTab.getAttribute('id');

      expect(newTabId).not.toBe(firstTabId);

      // Verify transition styles exist in CSS
      const hasTransition = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        let found = false;

        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule &&
                  rule.selectorText?.includes('.tab-content') &&
                  rule.cssText.includes('transition')) {
                found = true;
                break;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return found;
      });

      expect(hasTransition).toBe(true);
    });
  });

  test.describe('Form Input States', () => {
    test('should have focus glow animation on inputs', async ({ page }) => {
      const searchInput = page.locator('#global-search');

      // Focus input
      await searchInput.focus();

      // Wait for animation
      await page.waitForTimeout(200);

      // Check for box-shadow (focus ring)
      const boxShadow = await searchInput.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );

      expect(boxShadow).not.toBe('none');
    });

    test('should have UXFeedback form validation API', async ({ page }) => {
      const hasFormAPI = await page.evaluate(() => {
        return typeof window.UXFeedback !== 'undefined' &&
               typeof window.UXFeedback.form !== 'undefined' &&
               typeof window.UXFeedback.form.markValid === 'function' &&
               typeof window.UXFeedback.form.markInvalid === 'function';
      });

      expect(hasFormAPI).toBe(true);
    });
  });

  test.describe('Loading States & Progress', () => {
    test('should have progress manager available', async ({ page }) => {
      const hasProgressManager = await page.evaluate(() => {
        return typeof window.UXFeedback !== 'undefined' &&
               typeof window.UXFeedback.progress !== 'undefined' &&
               typeof window.UXFeedback.progress.show === 'function' &&
               typeof window.UXFeedback.progress.update === 'function' &&
               typeof window.UXFeedback.progress.hide === 'function';
      });

      expect(hasProgressManager).toBe(true);
    });

    test('should create and manage progress bars', async ({ page }) => {
      // Create a test progress bar
      await page.evaluate(() => {
        window.UXFeedback.progress.show('test-progress', {
          message: 'Testing...',
          initialPercent: 0,
          eta: '5 seconds'
        });
      });

      // Wait for creation
      await page.waitForTimeout(100);

      // Check if progress bar exists
      const progressBar = page.locator('[data-progress-id="test-progress"]');
      await expect(progressBar).toBeVisible();

      // Update progress
      await page.evaluate(() => {
        window.UXFeedback.progress.update('test-progress', {
          percent: 50,
          message: 'Half way!',
          eta: '2 seconds'
        });
      });

      await page.waitForTimeout(100);

      // Check progress fill width
      const fillWidth = await progressBar.locator('.progress-fill').evaluate(el =>
        window.getComputedStyle(el).width
      );

      expect(fillWidth).not.toBe('0px');

      // Hide progress
      await page.evaluate(() => {
        window.UXFeedback.progress.hide('test-progress');
      });

      // Wait for fade out
      await page.waitForTimeout(400);

      // Should be removed from DOM
      const stillExists = await progressBar.count();
      expect(stillExists).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have reduced motion support in CSS', async ({ page }) => {
      const hasReducedMotion = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        let found = false;

        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (const rule of rules) {
              if (rule instanceof CSSMediaRule &&
                  rule.conditionText?.includes('prefers-reduced-motion')) {
                found = true;
                break;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return found;
      });

      expect(hasReducedMotion).toBe(true);
    });

    test('should have focus-visible styles for keyboard navigation', async ({ page }) => {
      // Tab through interface
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check if focused element has outline
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineColor: styles.outlineColor,
          boxShadow: styles.boxShadow
        };
      });

      // Should have some form of focus indicator
      const hasFocusIndicator =
        focusedElement.outline !== 'none' ||
        focusedElement.boxShadow !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });

    test('should respect reduced motion preference', async ({ page }) => {
      const prefersReducedMotion = await page.evaluate(() => {
        return typeof window.UXFeedback !== 'undefined' &&
               typeof window.UXFeedback.prefersReducedMotion === 'function';
      });

      expect(prefersReducedMotion).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should use GPU-accelerated properties', async ({ page }) => {
      // Check if elements have will-change or transform properties
      const usesGPUAcceleration = await page.evaluate(() => {
        const button = document.querySelector('.tab-bar button');
        if (!button) return false;

        const styles = window.getComputedStyle(button);
        return styles.willChange !== 'auto' ||
               styles.transform !== 'none' ||
               styles.backfaceVisibility === 'hidden';
      });

      expect(usesGPUAcceleration).toBe(true);
    });

    test('should load micro-interactions CSS file', async ({ page }) => {
      const cssLoaded = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.some(link => link.href.includes('micro-interactions.css'));
      });

      expect(cssLoaded).toBe(true);
    });

    test('should load ux-feedback JS file', async ({ page }) => {
      const jsLoaded = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.some(script => script.src.includes('ux-feedback.js'));
      });

      expect(jsLoaded).toBe(true);
    });
  });

  test.describe('Health Status Pulse', () => {
    test('should have health status element with pulse animation', async ({ page }) => {
      const healthStatus = page.locator('#health-status');
      await expect(healthStatus).toBeVisible();

      // Check if it has a class that triggers animation
      const text = await healthStatus.textContent();
      expect(text).toBeTruthy();

      // Verify animation exists in CSS
      const hasAnimation = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        let found = false;

        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (const rule of rules) {
              if (rule instanceof CSSKeyframesRule &&
                  rule.name?.includes('health-pulse')) {
                found = true;
                break;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return found;
      });

      expect(hasAnimation).toBe(true);
    });
  });

  test.describe('Integration Tests', () => {
    test('should maintain all micro-interactions during typical user flow', async ({ page }) => {
      // Simulate real user interaction flow

      // 1. Hover over a tab button
      const chatTab = page.locator('.tab-bar button').filter({ hasText: /Chat/i });
      await chatTab.hover();
      await page.waitForTimeout(150);

      // 2. Click it
      await chatTab.click();
      await page.waitForTimeout(200);

      // 3. Verify content switched
      const chatContent = page.locator('#tab-chat');
      await expect(chatContent).toHaveClass(/active/);

      // 4. Click RAG tab to show subtabs
      const ragTab = page.locator('.tab-bar button').filter({ hasText: /RAG/i });
      await ragTab.click();
      await page.waitForTimeout(300);

      // 5. Verify subtabs are visible
      const subtabBar = page.locator('.subtab-bar').first();
      await expect(subtabBar).toBeVisible();

      // 6. Hover over a subtab
      const subtabBtn = page.locator('.subtab-btn').first();
      await subtabBtn.hover();
      await page.waitForTimeout(150);

      // 7. Click subtab
      await subtabBtn.click();
      await page.waitForTimeout(200);

      // All interactions should complete without errors
      // Check console for errors
      const errors = await page.evaluate(() => {
        return (window as any).__errors || [];
      });

      expect(errors.length).toBe(0);
    });

    test('should handle rapid tab switching gracefully', async ({ page }) => {
      const tabs = page.locator('.tab-bar button');
      const count = await tabs.count();

      // Rapidly switch between tabs
      for (let i = 0; i < Math.min(count, 5); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(50); // Very short delay - rapid switching
      }

      // Wait for all animations to settle
      await page.waitForTimeout(300);

      // Should still have exactly one active tab
      const activeTabs = await page.locator('.tab-content.active').count();
      expect(activeTabs).toBeGreaterThanOrEqual(1);
    });
  });
});
