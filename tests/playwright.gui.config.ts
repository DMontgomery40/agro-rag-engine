import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './gui',
    timeout: 30 * 1000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,  // Run tests sequentially for GUI
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,  // Single worker for GUI tests
    reporter: [
        ['html', { outputFolder: '../test-results/gui-report' }],
        ['list']
    ],
    use: {
        baseURL: 'http://localhost:8012',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        }
    ],
    webServer: {
        command: 'cd .. && make dev-headless',
        url: 'http://localhost:8012/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    }
});








