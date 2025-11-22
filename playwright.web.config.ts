import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web-smoke',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 0.75,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command: "npm --prefix web run dev -- --port 5175 --strictPort",
    url: 'http://127.0.0.1:5175/',
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
