/**
 * RAG Services Conversion Verification Test
 * Emergency Agent B4 - Verify all RAG backend modules converted to React services
 *
 * Tests:
 * 1. All service classes instantiate correctly
 * 2. All hooks are callable and return expected interface
 * 3. Service methods are accessible
 * 4. No runtime errors during initialization
 */

import { test, expect } from '@playwright/test';

test.describe('RAG Services Conversion - Agent B4', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (Vite is on port 3005)
    await page.goto('http://localhost:3005');

    // Wait for React to load
    await page.waitForSelector('#root', { timeout: 10000 });
  });

  test('RerankService and useReranker hook are available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // Dynamically import the service and hook
        const { RerankService } = await import('/src/services/RerankService.ts');
        const { useReranker } = await import('/src/hooks/useReranker.ts');

        // Test service instantiation
        const service = new RerankService('http://localhost:8012');

        return {
          serviceExists: !!service,
          serviceHasMethods: typeof service.mineTriplets === 'function' &&
                             typeof service.trainModel === 'function' &&
                             typeof service.evaluateModel === 'function' &&
                             typeof service.submitFeedback === 'function',
          hookExists: typeof useReranker === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
    expect(result.hookExists).toBe(true);
  });

  test('IndexingService and useIndexing hook are available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { IndexingService } = await import('/src/services/IndexingService.ts');
        const { useIndexing } = await import('/src/hooks/useIndexing.ts');

        const service = new IndexingService('http://localhost:8012');

        return {
          serviceExists: !!service,
          serviceHasMethods: typeof service.startIndexing === 'function' &&
                             typeof service.stopIndexing === 'function' &&
                             typeof service.getStatus === 'function' &&
                             typeof service.getStats === 'function',
          hookExists: typeof useIndexing === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
    expect(result.hookExists).toBe(true);
  });

  test('IndexProfilesService is available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { IndexProfilesService, PROFILES } = await import('/src/services/IndexProfilesService.ts');

        const service = new IndexProfilesService('http://localhost:8012');

        return {
          serviceExists: !!service,
          serviceHasMethods: typeof service.applyProfile === 'function' &&
                             typeof service.getProfiles === 'function',
          profilesExist: !!PROFILES,
          hasSharedProfile: !!PROFILES.shared,
          hasFullProfile: !!PROFILES.full,
          hasDevProfile: !!PROFILES.dev
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
    expect(result.profilesExist).toBe(true);
    expect(result.hasSharedProfile).toBe(true);
    expect(result.hasFullProfile).toBe(true);
    expect(result.hasDevProfile).toBe(true);
  });

  test('KeywordsService and useKeywords hook are available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { KeywordsService } = await import('/src/services/KeywordsService.ts');
        const { useKeywords } = await import('/src/hooks/useKeywords.ts');

        const service = new KeywordsService('http://localhost:8012');

        return {
          serviceExists: !!service,
          serviceHasMethods: typeof service.loadKeywords === 'function' &&
                             typeof service.filterKeywords === 'function',
          hookExists: typeof useKeywords === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
    expect(result.hookExists).toBe(true);
  });

  test('MCPRagService and useMCPRag hook are available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { MCPRagService } = await import('/src/services/MCPRagService.ts');
        const { useMCPRag } = await import('/src/hooks/useMCPRag.ts');

        const service = new MCPRagService('http://localhost:8012');

        return {
          serviceExists: !!service,
          serviceHasMethods: typeof service.search === 'function' &&
                             typeof service.formatResults === 'function',
          hookExists: typeof useMCPRag === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
    expect(result.hookExists).toBe(true);
  });

  test('RAGService orchestrator is available', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { RAGService } = await import('/src/services/RAGService.ts');

        const service = new RAGService('http://localhost:8012');

        return {
          serviceExists: !!service,
          hasRerankService: !!service.rerank,
          hasIndexingService: !!service.indexing,
          hasProfilesService: !!service.profiles,
          hasKeywordsService: !!service.keywords,
          hasMCPService: !!service.mcp,
          serviceHasMethods: typeof service.search === 'function' &&
                             typeof service.getSystemStatus === 'function' &&
                             typeof service.getSystemStats === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.serviceExists).toBe(true);
    expect(result.hasRerankService).toBe(true);
    expect(result.hasIndexingService).toBe(true);
    expect(result.hasProfilesService).toBe(true);
    expect(result.hasKeywordsService).toBe(true);
    expect(result.hasMCPService).toBe(true);
    expect(result.serviceHasMethods).toBe(true);
  });

  test('All hooks are exported from hooks/index.ts', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const hooks = await import('/src/hooks/index.ts');

        return {
          hasUseReranker: typeof hooks.useReranker === 'function',
          hasUseIndexing: typeof hooks.useIndexing === 'function',
          hasUseKeywords: typeof hooks.useKeywords === 'function',
          hasUseMCPRag: typeof hooks.useMCPRag === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.hasUseReranker).toBe(true);
    expect(result.hasUseIndexing).toBe(true);
    expect(result.hasUseKeywords).toBe(true);
    expect(result.hasUseMCPRag).toBe(true);
  });

  test('RerankService can parse metrics correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { RerankService } = await import('/src/services/RerankService.ts');
        const service = new RerankService('http://localhost:8012');

        const testOutput = 'MRR@all: 0.7500\nHit@1: 0.6000\nHit@3: 0.8000\nEvaluated on 100 items';
        const metrics = service.parseMetrics(testOutput);

        return {
          metricsExist: !!metrics,
          mrrCorrect: metrics?.mrr === 0.75,
          hit1Correct: metrics?.hit1 === 0.60,
          hit3Correct: metrics?.hit3 === 0.80,
          countCorrect: metrics?.evaluated_count === 100
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.metricsExist).toBe(true);
    expect(result.mrrCorrect).toBe(true);
    expect(result.hit1Correct).toBe(true);
    expect(result.hit3Correct).toBe(true);
    expect(result.countCorrect).toBe(true);
  });

  test('IndexingService can format bytes correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { IndexingService } = await import('/src/services/IndexingService.ts');
        const service = new IndexingService('http://localhost:8012');

        return {
          bytes: service.formatBytes(1024),
          kilobytes: service.formatBytes(1024 * 1024),
          megabytes: service.formatBytes(1024 * 1024 * 1024),
          zero: service.formatBytes(0)
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.bytes).toBe('1 KB');
    expect(result.kilobytes).toBe('1 MB');
    expect(result.megabytes).toBe('1 GB');
    expect(result.zero).toBe('0 B');
  });
});
