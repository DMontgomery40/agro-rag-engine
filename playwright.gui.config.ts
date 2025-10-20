import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/gui',
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
        screenshot: 'on',
        video: 'on'
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        }
    ],
    webServer: {
        command: "bash -lc 'docker compose -f infra/docker-compose.yml up -d api && until curl -sf http://127.0.0.1:8012/health; do sleep 1; done'",
        url: 'http://localhost:8012/health',
        reuseExistingServer: true,
        timeout: 180 * 1000,
    }
});
