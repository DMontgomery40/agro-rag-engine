import { test, expect, Page } from '@playwright/test';

test.describe('AGRO GUI Navigation System', () => {
    let page: Page;

    test.beforeEach(async ({ page: p }) => {
        page = p;
        // Navigate to the GUI
        await page.goto('http://localhost:8012');
        
        // Wait for the page to load
        await page.waitForSelector('[data-testid]', { timeout: 5000 });
    });

    test('should have test IDs on critical elements', async () => {
        // Check that test instrumentation is working
        const testIds = await page.evaluate(() => {
            return window.TestHelpers ? window.TestHelpers.getAllTestIds() : [];
        });
        
        expect(testIds.length).toBeGreaterThan(0);
        
        // Check critical elements
        const criticalIds = [
            'tab-btn-dashboard',
            'tab-btn-chat',
            'health-status'
        ];
        
        for (const id of criticalIds) {
            const element = await page.locator(`[data-testid="${id}"]`);
            await expect(element).toBeVisible();
        }
    });

    test('should have Navigation API available', async () => {
        const hasNavigation = await page.evaluate(() => {
            return typeof window.Navigation === 'object' && 
                   typeof window.Navigation.navigateTo === 'function';
        });
        
        expect(hasNavigation).toBe(true);
    });

    test('should resolve tab IDs correctly', async () => {
        const resolutions = await page.evaluate(() => {
            if (!window.Navigation) return null;
            
            return {
                dashboard: window.Navigation.resolveTabId('dashboard'),
                devtools: window.Navigation.resolveTabId('devtools'),
                metrics: window.Navigation.resolveTabId('metrics'),
                config: window.Navigation.resolveTabId('config')
            };
        });
        
        expect(resolutions).toEqual({
            dashboard: 'dashboard',
            devtools: 'vscode',
            metrics: 'grafana',
            config: 'rag'
        });
    });

    test('should navigate between tabs', async () => {
        // Start on dashboard
        const initialTab = await page.evaluate(() => window.Navigation?.getCurrentTab());
        expect(initialTab).toBe('dashboard');
        
        // Navigate to chat
        await page.evaluate(() => window.Navigation?.navigateTo('chat'));
        await page.waitForTimeout(100);
        
        const currentTab = await page.evaluate(() => window.Navigation?.getCurrentTab());
        expect(currentTab).toBe('chat');
        
        // Check that chat content is visible
        const chatContent = await page.locator('#tab-chat');
        await expect(chatContent).toHaveClass(/active/);
    });

    test('should maintain compatibility with old switchTab', async () => {
        // Use old API
        await page.evaluate(() => {
            if (window.switchTab) {
                window.switchTab('config');
            }
        });
        
        await page.waitForTimeout(100);
        
        // Check that it mapped correctly
        const currentTab = await page.evaluate(() => window.Navigation?.getCurrentTab());
        expect(currentTab).toBe('rag');
    });

    test('should emit navigation events', async () => {
        const events = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const capturedEvents = [];
                
                // Listen for events
                if (window.CoreUtils?.events) {
                    window.CoreUtils.events.on('nav:tab-change', (data) => {
                        capturedEvents.push({ type: 'new', data });
                    });
                    
                    window.CoreUtils.events.on('tab-switched', (data) => {
                        capturedEvents.push({ type: 'old', data });
                    });
                }
                
                // Navigate
                window.Navigation?.navigateTo('chat');
                
                // Wait a bit for events
                setTimeout(() => resolve(capturedEvents), 100);
            });
        });
        
        expect(events).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'new' }),
            expect.objectContaining({ type: 'old' })
        ]));
    });

    test('should save navigation state to localStorage', async () => {
        await page.evaluate(() => window.Navigation?.navigateTo('vscode'));
        
        const savedTab = await page.evaluate(() => 
            localStorage.getItem('nav_current_tab')
        );
        
        expect(savedTab).toBe('vscode');
    });

    test('should check module health', async () => {
        const health = await page.evaluate(() => {
            if (!window.TestHelpers) return null;
            
            const status = window.TestHelpers.getModuleStatus();
            return status.filter(m => ['Navigation', 'CoreUtils', 'Theme'].includes(m.name));
        });
        
        expect(health).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Navigation', loaded: true }),
            expect.objectContaining({ name: 'CoreUtils', loaded: true }),
            expect.objectContaining({ name: 'Theme', loaded: true })
        ]));
    });

    test('should handle VS Code panel visibility', async () => {
        await page.evaluate(() => window.Navigation?.showPanel('vscode'));
        await page.waitForTimeout(100);
        
        const isVisible = await page.evaluate(() => 
            window.Navigation?.isPanelVisible('vscode')
        );
        
        expect(isVisible).toBe(true);
        
        const tab = await page.evaluate(() => window.Navigation?.getCurrentTab());
        expect(tab).toBe('vscode');
    });

    test('should handle Grafana panel visibility', async () => {
        await page.evaluate(() => window.Navigation?.showPanel('grafana'));
        await page.waitForTimeout(100);
        
        const isVisible = await page.evaluate(() => 
            window.Navigation?.isPanelVisible('grafana')
        );
        
        expect(isVisible).toBe(true);
        
        const tab = await page.evaluate(() => window.Navigation?.getCurrentTab());
        expect(tab).toBe('grafana');
    });

    test('should validate critical elements exist', async () => {
        const validation = await page.evaluate(() => {
            if (!window.TestHelpers) return null;
            return window.TestHelpers.validateCriticalElements();
        });
        
        expect(validation).toMatchObject({
            valid: true,
            missing: []
        });
    });
});

test.describe('AGRO GUI Compatibility Mode', () => {
    test('should start in compatibility mode by default', async ({ page }) => {
        await page.goto('http://localhost:8012');
        
        const isCompat = await page.evaluate(() => 
            window.Navigation?.isCompatibilityMode()
        );
        
        expect(isCompat).toBe(true);
    });
    
    test('should toggle compatibility mode', async ({ page }) => {
        await page.goto('http://localhost:8012');
        
        // Toggle off compatibility mode
        await page.evaluate(() => 
            window.Navigation?.setCompatibilityMode(false)
        );
        
        const isCompat = await page.evaluate(() => 
            window.Navigation?.isCompatibilityMode()
        );
        
        expect(isCompat).toBe(false);
        
        // Check localStorage
        const flag = await page.evaluate(() => 
            localStorage.getItem('AGRO_NEW_IA')
        );
        
        expect(flag).toBe('1');
    });
});


