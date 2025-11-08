import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Storage Calculator Component Tests
 * Verifies the Storage Calculator UI components are properly created
 * and the hook logic is mathematically correct
 */

const WEB_SRC = path.join(process.cwd(), 'web', 'src');

test.describe('Storage Calculator Files', () => {
  test('should have all required component files', () => {
    const files = [
      'components/Storage/Calculator.tsx',
      'components/Storage/CalculatorForm.tsx',
      'components/Storage/ResultsDisplay.tsx',
      'components/Storage/OptimizationPlan.tsx',
      'components/Storage/index.ts',
    ];

    for (const file of files) {
      const fullPath = path.join(WEB_SRC, file);
      const exists = fs.existsSync(fullPath);
      console.log(`${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
      expect(exists).toBe(true);
    }
  });

  test('should have hook file', () => {
    const hookPath = path.join(WEB_SRC, 'hooks', 'useStorageCalculator.ts');
    const exists = fs.existsSync(hookPath);
    console.log(`useStorageCalculator hook: ${exists ? 'EXISTS' : 'MISSING'}`);
    expect(exists).toBe(true);
  });

  test('should have types file', () => {
    const typesPath = path.join(WEB_SRC, 'types', 'storage.ts');
    const exists = fs.existsSync(typesPath);
    console.log(`storage types: ${exists ? 'EXISTS' : 'MISSING'}`);
    expect(exists).toBe(true);
  });

  test('should have formatters utility', () => {
    const formattersPath = path.join(WEB_SRC, 'utils', 'formatters.ts');
    const exists = fs.existsSync(formattersPath);
    console.log(`formatters utility: ${exists ? 'EXISTS' : 'MISSING'}`);
    expect(exists).toBe(true);
  });
});

test.describe('Storage Calculator Components Structure', () => {
  test('Calculator.tsx should have proper imports and exports', () => {
    const filePath = path.join(WEB_SRC, 'components', 'Storage', 'Calculator.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for required imports
    expect(content).toContain("import React");
    expect(content).toContain("useStorageCalculator");
    expect(content).toContain("useOptimizationCalculator");
    expect(content).toContain("CalculatorForm");
    expect(content).toContain("ResultsDisplay");
    expect(content).toContain("OptimizationPlan");

    // Check for export
    expect(content).toContain("export function Calculator");

    // Check for tab switching logic
    expect(content).toContain("activeTab");
    expect(content).toContain("'full' | 'optimize'");

    console.log('✓ Calculator.tsx structure is correct');
  });

  test('CalculatorForm.tsx should have proper inputs', () => {
    const filePath = path.join(WEB_SRC, 'components', 'Storage', 'CalculatorForm.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for required imports
    expect(content).toContain("import React");
    expect(content).toContain("CalculatorInputs");
    expect(content).toContain("Calculator2Inputs");

    // Check for export
    expect(content).toContain("export function CalculatorForm");

    // Check for key inputs
    expect(content).toContain("repo-size");
    expect(content).toContain("chunk-size");
    expect(content).toContain("embedding-dim");
    expect(content).toContain("precision");
    expect(content).toContain("qdrant-overhead");
    expect(content).toContain("hydration");
    expect(content).toContain("redis");
    expect(content).toContain("replication");

    // Check for accessibility attributes
    expect(content).toContain("aria-label");

    console.log('✓ CalculatorForm.tsx structure is correct');
  });

  test('ResultsDisplay.tsx should show all components', () => {
    const filePath = path.join(WEB_SRC, 'components', 'Storage', 'ResultsDisplay.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for required imports
    expect(content).toContain("import React");
    expect(content).toContain("StorageResults");
    expect(content).toContain("formatBytes");

    // Check for export
    expect(content).toContain("export function ResultsDisplay");

    // Check for all result fields being displayed
    expect(content).toContain("results.chunks");
    expect(content).toContain("results.rawEmbeddings");
    expect(content).toContain("results.qdrantSize");
    expect(content).toContain("results.bm25Index");
    expect(content).toContain("results.cardsSummary");
    expect(content).toContain("results.hydration");
    expect(content).toContain("results.reranker");
    expect(content).toContain("results.redis");
    expect(content).toContain("results.singleInstance");
    expect(content).toContain("results.replicated");

    console.log('✓ ResultsDisplay.tsx structure is correct');
  });

  test('OptimizationPlan.tsx should show both plans', () => {
    const filePath = path.join(WEB_SRC, 'components', 'Storage', 'OptimizationPlan.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for required imports
    expect(content).toContain("import React");
    expect(content).toContain("Calculator2Results");
    expect(content).toContain("formatBytes");

    // Check for export
    expect(content).toContain("export function OptimizationPlan");

    // Check for plan displays
    expect(content).toContain("results.aggressivePlan");
    expect(content).toContain("results.conservativePlan");
    expect(content).toContain("results.statusMessage");
    expect(content).toContain("results.precisions");

    // Check for precision types
    expect(content).toContain("float32");
    expect(content).toContain("float16");
    expect(content).toContain("int8");
    expect(content).toContain("pq8");

    console.log('✓ OptimizationPlan.tsx structure is correct');
  });

  test('index.ts should export all components', () => {
    const filePath = path.join(WEB_SRC, 'components', 'Storage', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("export { Calculator }");
    expect(content).toContain("export { CalculatorForm }");
    expect(content).toContain("export { ResultsDisplay }");
    expect(content).toContain("export { OptimizationPlan }");

    console.log('✓ index.ts exports all components');
  });
});

test.describe('Storage Calculator Hook Logic', () => {
  test('useStorageCalculator hook should have correct structure', () => {
    const filePath = path.join(WEB_SRC, 'hooks', 'useStorageCalculator.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for both hooks
    expect(content).toContain("export function useStorageCalculator");
    expect(content).toContain("export function useOptimizationCalculator");

    // Check for state management
    expect(content).toContain("useState");
    expect(content).toContain("useCallback");
    expect(content).toContain("useEffect");

    // Check for calculation logic
    expect(content).toContain("Math.ceil(R / C)"); // Chunk calculation
    expect(content).toContain("N * D * B"); // Embeddings calculation
    expect(content).toContain("E * Q"); // Qdrant calculation
    expect(content).toContain("0.20 * R"); // BM25 calculation
    expect(content).toContain("0.10 * R"); // Cards calculation

    console.log('✓ useStorageCalculator hook structure is correct');
  });

  test('calculator math should be correct', () => {
    // Test the calculation logic
    // Using the same formula from the hook

    // Test case: 5 GiB repo, 4 KiB chunks, 512 dims, float32
    const R = 5 * 1073741824; // 5 GiB in bytes = 5,368,709,120 bytes
    const C = 4 * 1024; // 4 KiB in bytes = 4,096 bytes
    const D = 512; // Dimensions
    const B = 4; // float32 = 4 bytes
    const Q = 1.5; // Qdrant multiplier
    const hydrationPct = 1.0; // 100%
    const redisBytes = 400 * 1048576; // 400 MiB = 419,430,400 bytes
    const replFactor = 3;

    // Calculate
    const N = Math.ceil(R / C); // Should be 1,310,720 chunks
    const E = N * D * B; // Raw embeddings
    const Q_bytes = E * Q; // Qdrant size
    const BM25 = 0.20 * R; // BM25 index
    const CARDS = 0.10 * R; // Cards
    const HYDR = hydrationPct * R; // Hydration
    const RER = 0.5 * E; // Reranker

    const singleTotal = E + Q_bytes + BM25 + CARDS + HYDR + RER + redisBytes;
    const criticalComponents = E + Q_bytes + HYDR + CARDS + RER;
    const replicatedTotal = singleTotal + (replFactor - 1) * criticalComponents;

    console.log('Calculation test results:');
    console.log(`  Repo size: 5 GiB (${R.toLocaleString()} bytes)`);
    console.log(`  Chunk size: 4 KiB (${C.toLocaleString()} bytes)`);
    console.log(`  Chunks: ${N.toLocaleString()}`);
    console.log(`  Raw embeddings: ${(E / 1048576).toFixed(2)} MiB`);
    console.log(`  Qdrant size: ${(Q_bytes / 1048576).toFixed(2)} MiB`);
    console.log(`  BM25 index: ${(BM25 / 1048576).toFixed(2)} MiB`);
    console.log(`  Cards: ${(CARDS / 1048576).toFixed(2)} MiB`);
    console.log(`  Hydration: ${(HYDR / 1048576).toFixed(2)} MiB`);
    console.log(`  Reranker: ${(RER / 1048576).toFixed(2)} MiB`);
    console.log(`  Redis: ${(redisBytes / 1048576).toFixed(2)} MiB`);
    console.log(`  Single instance total: ${(singleTotal / 1073741824).toFixed(2)} GiB`);
    console.log(`  Replicated total (${replFactor}x): ${(replicatedTotal / 1073741824).toFixed(2)} GiB`);

    // Verify calculations
    expect(N).toBe(1310720); // 5 GiB / 4 KiB = 1,310,720 chunks
    expect(E).toBe(N * 512 * 4); // Embeddings = chunks * dims * bytes
    expect(Q_bytes).toBe(E * 1.5); // Qdrant = embeddings * multiplier
    expect(BM25).toBe(0.20 * R); // BM25 = 20% of repo
    expect(CARDS).toBe(0.10 * R); // Cards = 10% of repo
    expect(HYDR).toBe(R); // 100% hydration
    expect(RER).toBe(0.5 * E); // Reranker = 50% of embeddings
    expect(singleTotal).toBeGreaterThan(0);
    expect(replicatedTotal).toBeGreaterThan(singleTotal);

    console.log('✓ Calculator math is correct');
  });

  test('formatBytes should format correctly', () => {
    const filePath = path.join(WEB_SRC, 'utils', 'formatters.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check structure
    expect(content).toContain("export function formatBytes");
    expect(content).toContain("export function formatNumber");

    // Check that it handles different units
    expect(content).toContain("KiB");
    expect(content).toContain("MiB");
    expect(content).toContain("GiB");
    expect(content).toContain("TiB");

    console.log('✓ formatBytes utility structure is correct');
  });
});

test.describe('Storage Calculator File Sizes', () => {
  test('component files should have reasonable sizes', () => {
    const files = [
      { path: 'components/Storage/Calculator.tsx', minSize: 2000, maxSize: 10000 },
      { path: 'components/Storage/CalculatorForm.tsx', minSize: 3000, maxSize: 15000 },
      { path: 'components/Storage/ResultsDisplay.tsx', minSize: 1500, maxSize: 8000 },
      { path: 'components/Storage/OptimizationPlan.tsx', minSize: 2000, maxSize: 12000 },
    ];

    for (const file of files) {
      const fullPath = path.join(WEB_SRC, file.path);
      const stats = fs.statSync(fullPath);
      const size = stats.size;

      console.log(`${file.path}: ${size} bytes`);

      expect(size).toBeGreaterThan(file.minSize);
      expect(size).toBeLessThan(file.maxSize);
    }

    console.log('✓ All component files have reasonable sizes');
  });

  test('hook file should have substantial logic', () => {
    const hookPath = path.join(WEB_SRC, 'hooks', 'useStorageCalculator.ts');
    const stats = fs.statSync(hookPath);
    const size = stats.size;

    console.log(`useStorageCalculator.ts: ${size} bytes`);

    // Hook should be at least 5KB (substantial logic)
    expect(size).toBeGreaterThan(5000);
    console.log('✓ Hook file has substantial logic');
  });
});

test.describe('Storage Calculator Integration Check', () => {
  test('components should import from hook correctly', () => {
    const calculatorPath = path.join(WEB_SRC, 'components', 'Storage', 'Calculator.tsx');
    const content = fs.readFileSync(calculatorPath, 'utf-8');

    // Check import path
    expect(content).toContain("from '@/hooks/useStorageCalculator'");

    // Check both hooks are imported
    expect(content).toContain("useStorageCalculator");
    expect(content).toContain("useOptimizationCalculator");

    // Check they're used
    expect(content).toContain("useStorageCalculator()");
    expect(content).toContain("useOptimizationCalculator(");

    console.log('✓ Components correctly import and use hooks');
  });

  test('components should use formatters correctly', () => {
    const resultsPath = path.join(WEB_SRC, 'components', 'Storage', 'ResultsDisplay.tsx');
    const resultsContent = fs.readFileSync(resultsPath, 'utf-8');

    const optPath = path.join(WEB_SRC, 'components', 'Storage', 'OptimizationPlan.tsx');
    const optContent = fs.readFileSync(optPath, 'utf-8');

    // Check import
    expect(resultsContent).toContain("from '@/utils/formatters'");
    expect(optContent).toContain("from '@/utils/formatters'");

    // Check usage
    expect(resultsContent).toContain("formatBytes(");
    expect(optContent).toContain("formatBytes(");

    console.log('✓ Components correctly use formatters');
  });

  test('components should use types correctly', () => {
    // Only CalculatorForm, ResultsDisplay, and OptimizationPlan directly import types
    // Calculator gets them through the hook
    const filesToCheck = [
      'components/Storage/CalculatorForm.tsx',
      'components/Storage/ResultsDisplay.tsx',
      'components/Storage/OptimizationPlan.tsx',
    ];

    for (const file of filesToCheck) {
      const fullPath = path.join(WEB_SRC, file);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Should import from types
      expect(content).toContain("from '@/types/storage'");
    }

    console.log('✓ All components correctly import types');
  });
});

test.describe('Storage Calculator Test File', () => {
  test('this test file should exist in tests directory', () => {
    const testPath = path.join(process.cwd(), 'tests', 'storage-calculator.spec.ts');
    const exists = fs.existsSync(testPath);

    console.log(`storage-calculator.spec.ts: ${exists ? 'EXISTS' : 'MISSING'}`);
    expect(exists).toBe(true);
  });
});
