import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Web frontend CSS and font loading', () => {
  const webIndexPath = path.join(__dirname, '../../web/index.html');
  const webMainCSSPath = path.join(__dirname, '../../web/src/styles/main.css');
  const webDistPath = path.join(__dirname, '../../web/dist/index.html');

  test('Web index.html should have Inter font preconnect', () => {
    const content = fs.readFileSync(webIndexPath, 'utf-8');
    expect(content).toContain('fonts.googleapis.com');
    expect(content).toContain('fonts.gstatic.com');
  });

  test('Web index.html should have Inter font stylesheet link', () => {
    const content = fs.readFileSync(webIndexPath, 'utf-8');
    expect(content).toContain('Inter:wght@400;500;600;700;800');
  });

  test('Main CSS should have rag-subtab-content class', () => {
    const content = fs.readFileSync(webMainCSSPath, 'utf-8');
    expect(content).toContain('.rag-subtab-content');
    expect(content).toContain('.rag-subtab-content.active');
  });

  test('Main CSS should have subtab-bar class with sticky positioning', () => {
    const content = fs.readFileSync(webMainCSSPath, 'utf-8');
    expect(content).toContain('.subtab-bar');
    expect(content).toContain('position: sticky');
    expect(content).toContain('top: 65px');
  });

  test('Built dist should include Inter font', () => {
    if (fs.existsSync(webDistPath)) {
      const content = fs.readFileSync(webDistPath, 'utf-8');
      expect(content).toContain('fonts.googleapis.com');
      expect(content).toContain('Inter');
    }
  });

  test('Main CSS should define CSS custom properties for theme', () => {
    const content = fs.readFileSync(webMainCSSPath, 'utf-8');
    // Should reference CSS variables
    expect(content).toContain('var(--bg)');
    expect(content).toContain('var(--fg)');
    expect(content).toContain('var(--accent)');
  });
});
