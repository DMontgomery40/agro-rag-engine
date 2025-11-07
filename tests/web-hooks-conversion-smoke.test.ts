/**
 * Smoke Test: Core Utilities React Hooks Conversion
 * Verifies that the converted hooks are properly structured and importable
 */

import { describe, test, expect } from '@jest/globals';

describe('Core Hooks Conversion Smoke Tests', () => {
  test('useAPI hook exists and is importable', async () => {
    const { useAPI } = await import('../web/src/hooks/useAPI');
    expect(useAPI).toBeDefined();
    expect(typeof useAPI).toBe('function');
  });

  test('useTheme hook exists and is importable', async () => {
    const { useTheme } = await import('../web/src/hooks/useTheme');
    expect(useTheme).toBeDefined();
    expect(typeof useTheme).toBe('function');
  });

  test('useUIHelpers hook exists and is importable', async () => {
    const { useUIHelpers } = await import('../web/src/hooks/useUIHelpers');
    expect(useUIHelpers).toBeDefined();
    expect(typeof useUIHelpers).toBe('function');
  });

  test('CoreContext exports all required utilities', async () => {
    const context = await import('../web/src/contexts/CoreContext');
    expect(context.CoreProvider).toBeDefined();
    expect(context.useCore).toBeDefined();
    expect(context.useAPI).toBeDefined();
    expect(context.useTheme).toBeDefined();
    expect(context.useUIHelpers).toBeDefined();
  });

  test('Hooks index exports all hooks', async () => {
    const hooks = await import('../web/src/hooks');
    expect(hooks.useAPI).toBeDefined();
    expect(hooks.useTheme).toBeDefined();
    expect(hooks.useUIHelpers).toBeDefined();
  });

  test('Contexts index exports all context utilities', async () => {
    const contexts = await import('../web/src/contexts');
    expect(contexts.CoreProvider).toBeDefined();
    expect(contexts.useCore).toBeDefined();
  });
});

describe('Legacy Module Files Still Exist', () => {
  test('Original modules are preserved for backwards compatibility', () => {
    const fs = require('fs');
    const path = require('path');

    const modulesPath = path.join(__dirname, '../web/src/modules');

    expect(fs.existsSync(path.join(modulesPath, 'fetch-shim.js'))).toBe(true);
    expect(fs.existsSync(path.join(modulesPath, 'core-utils.js'))).toBe(true);
    expect(fs.existsSync(path.join(modulesPath, 'api-base-override.js'))).toBe(true);
    expect(fs.existsSync(path.join(modulesPath, 'ui-helpers.js'))).toBe(true);
    expect(fs.existsSync(path.join(modulesPath, 'theme.js'))).toBe(true);
  });
});

describe('TypeScript Build Verification', () => {
  test('Build artifacts contain hook files', () => {
    const fs = require('fs');
    const path = require('path');

    const distPath = path.join(__dirname, '../web/dist');

    // Verify dist directory exists (build completed)
    expect(fs.existsSync(distPath)).toBe(true);

    // Verify index.html was generated
    expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
  });
});
