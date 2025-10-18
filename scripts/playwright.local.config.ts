import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(process.cwd(), 'tests', 'visual'),
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'off'
  }
});

