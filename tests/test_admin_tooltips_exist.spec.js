/**
 * Test: Admin Tab Tooltips Exist in tooltips.js
 * Smoke test to verify all admin parameters have tooltip definitions
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// List of Admin parameters that should have tooltips
const REQUIRED_ADMIN_TOOLTIPS = [
  // Infrastructure
  'THEME_MODE',
  'HOST',
  'OPEN_BROWSER',
  'DATA_DIR',
  'AUTO_COLIMA',
  'COLIMA_PROFILE',
  'DEV_LOCAL_UVICORN',

  // Editor
  'EDITOR_ENABLED',
  'EDITOR_PORT',
  'EDITOR_BIND',
  'EDITOR_EMBED_ENABLED',

  // Tracing
  'TRACING_MODE',
  'TRACE_AUTO_LS',
  'TRACE_RETENTION',

  // LangChain/LangSmith
  'LANGSMITH_API_KEY',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_PROJECT',
  'LANGCHAIN_ENDPOINT',

  // Langtrace
  'LANGTRACE_API_KEY',
  'LANGTRACE_API_HOST',
  'LANGTRACE_PROJECT_ID',

  // Grafana
  'GRAFANA_BASE_URL',
  'GRAFANA_AUTH_TOKEN',
  'GRAFANA_AUTH_MODE',
  'GRAFANA_DASHBOARD_UID'
];

test.describe('Admin Tooltips Definition Check', () => {
  test('tooltips.js should contain all required admin tooltip definitions', () => {
    const tooltipsPath = path.join(__dirname, '..', 'gui', 'js', 'tooltips.js');
    const tooltipsContent = fs.readFileSync(tooltipsPath, 'utf-8');

    const missing = [];
    const found = [];

    for (const param of REQUIRED_ADMIN_TOOLTIPS) {
      // Look for pattern like: PARAM_NAME: L(
      const regex = new RegExp(`^\\s+${param}:\\s+L\\(`, 'm');
      if (regex.test(tooltipsContent)) {
        found.push(param);
      } else {
        missing.push(param);
      }
    }

    console.log(`\nTooltip definitions check:`);
    console.log(`✓ Found: ${found.length}/${REQUIRED_ADMIN_TOOLTIPS.length}`);
    console.log(`✗ Missing: ${missing.length}`);

    if (missing.length > 0) {
      console.log(`\nMissing tooltips for:\n  - ${missing.join('\n  - ')}`);
    } else {
      console.log(`\n✓ All required admin parameter tooltips are defined!`);
      console.log(`\nDefined tooltips:`);
      found.forEach(param => console.log(`  ✓ ${param}`));
    }

    expect(missing).toHaveLength(0);
  });

  test('sample tooltip content check - THEME_MODE', () => {
    const tooltipsPath = path.join(__dirname, '..', 'gui', 'js', 'tooltips.js');
    const tooltipsContent = fs.readFileSync(tooltipsPath, 'utf-8');

    // Extract THEME_MODE tooltip
    const match = tooltipsContent.match(/THEME_MODE:\s+L\(\s*'([^']+)',\s*'([^']+)',/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('GUI Theme');
    expect(match[2]).toContain('Color theme');
  });

  test('sample tooltip content check - TRACING_MODE', () => {
    const tooltipsPath = path.join(__dirname, '..', 'gui', 'js', 'tooltips.js');
    const tooltipsContent = fs.readFileSync(tooltipsPath, 'utf-8');

    // Extract TRACING_MODE tooltip
    const match = tooltipsContent.match(/TRACING_MODE:\s+L\(\s*'([^']+)',\s*'([^']+)',/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('Tracing Mode');
    expect(match[2]).toContain('backend');
  });

  test('sample tooltip content check - GRAFANA_BASE_URL', () => {
    const tooltipsPath = path.join(__dirname, '..', 'gui', 'js', 'tooltips.js');
    const tooltipsContent = fs.readFileSync(tooltipsPath, 'utf-8');

    // Extract GRAFANA_BASE_URL tooltip
    const match = tooltipsContent.match(/GRAFANA_BASE_URL:\s+L\(\s*'([^']+)',\s*'([^']+)',/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('Grafana Base URL');
    expect(match[2]).toContain('Base URL');
  });

  test('sample tooltip has links - EDITOR_ENABLED', () => {
    const tooltipsPath = path.join(__dirname, '..', 'gui', 'js', 'tooltips.js');
    const tooltipsContent = fs.readFileSync(tooltipsPath, 'utf-8');

    // Check that EDITOR_ENABLED tooltip exists and has a link
    expect(tooltipsContent).toContain('EDITOR_ENABLED:');

    // Find the section with EDITOR_ENABLED
    const lines = tooltipsContent.split('\n');
    const editorLineIndex = lines.findIndex(line => line.includes('EDITOR_ENABLED:'));
    expect(editorLineIndex).toBeGreaterThan(-1);

    // Check next few lines for a link pattern
    const nextFewLines = lines.slice(editorLineIndex, editorLineIndex + 10).join('\n');
    expect(nextFewLines).toMatch(/https?:\/\//);
  });
});
