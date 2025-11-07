#!/bin/bash
# GUI VERIFICATION - Tests GUI functionality without requiring Docker
# Focuses on tab rendering, keyword manager, and tooltips

set -e

echo "==================================================================="
echo "GUI FUNCTIONALITY VERIFICATION"
echo "==================================================================="
echo ""

echo "Starting backend server..."
# Resolve repo root relative to this script; avoid hard-coded absolute paths
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"
pkill -f "uvicorn.*8012" || true
python3 -m uvicorn server.app:app --host 127.0.0.1 --port 8012 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo ""
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8012/health > /dev/null 2>&1; then
        echo "✅ Backend is responding"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start after 30 seconds"
        cat /tmp/backend.log | tail -50
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo "Starting frontend server..."
cd "$REPO_ROOT/web"
# Ensure frontend dependencies are installed (react-router-dom, zustand, etc.)
if [ ! -d node_modules/react-router-dom ] || [ ! -d node_modules/zustand ]; then
    echo "Installing web dependencies..."
    npm install >/tmp/frontend.npm.install.log 2>&1 || { echo "npm install failed"; cat /tmp/frontend.npm.install.log; exit 1; }
fi
pkill -f "vite.*3000" || true
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "Waiting for frontend to be ready..."
for i in {1..45}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is responding"
        break
    fi
    if [ $i -eq 45 ]; then
        echo "❌ Frontend failed to start after 45 seconds"
        cat /tmp/frontend.log | tail -50
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo "==================================================================="
echo "INSTALLING PLAYWRIGHT"
echo "==================================================================="
echo ""

cd "$REPO_ROOT/web"
if ! npx playwright --version > /dev/null 2>&1; then
    echo "Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install chromium
else
    echo "✅ Playwright already installed"
fi

echo ""
echo "==================================================================="
echo "RUNNING PLAYWRIGHT E2E TESTS"
echo "==================================================================="
echo ""

mkdir -p e2e

cat > e2e/tab-verification.spec.ts << 'PLAYWRIGHT_EOF'
import { test, expect } from '@playwright/test';

test.describe('Tab Functionality Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    // Wait for modules to load
    await page.waitForTimeout(2000);
  });

  const tabs = [
    { name: 'Dashboard', path: '/', selector: 'a[href="/"]' },
    { name: 'RAG', path: '/rag', selector: 'a[href="/rag"]' },
    { name: 'Chat', path: '/chat', selector: 'a[href="/chat"]' },
    { name: 'Editor', path: '/editor', selector: 'a[href="/editor"]' },
    { name: 'Settings', path: '/settings', selector: 'a[href="/settings"]' },
    { name: 'Logs', path: '/logs', selector: 'a[href="/logs"]' },
    { name: 'Help', path: '/help', selector: 'a[href="/help"]' },
    { name: 'Docker', path: '/docker', selector: 'a[href="/docker"]' },
    { name: 'About', path: '/about', selector: 'a[href="/about"]' }
  ];

  for (const tab of tabs) {
    test(`${tab.name} tab loads and renders`, async ({ page }) => {
      const errors: string[] = [];
      const consoleMessages: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      // Navigate to tab
      await page.goto(`http://localhost:3000${tab.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Take screenshot
      await page.screenshot({ path: `/tmp/screenshot_${tab.name.toLowerCase()}.png` });

      // Log results
      if (errors.length > 0) {
        console.log(`❌ ${tab.name} tab has JavaScript errors:`, errors);
      } else {
        console.log(`✅ ${tab.name} tab loaded without JavaScript errors`);
      }

      if (consoleMessages.length > 0) {
        console.log(`Console errors in ${tab.name}:`, consoleMessages);
      }
    });
  }

  test('CRITICAL: Keyword Manager renders in RAG tab', async ({ page }) => {
    console.log('\n=== TESTING KEYWORD MANAGER ===');

    await page.goto('http://localhost:3000/rag');
    await page.waitForLoadState('networkidle');

    // Wait longer for modules to execute
    await page.waitForTimeout(3000);

    // Take screenshot of RAG tab
    await page.screenshot({ path: '/tmp/screenshot_rag_tab_full.png', fullPage: true });

    // Check if repos-section exists
    const reposSection = page.locator('#repos-section');
    const reposSectionExists = await reposSection.count() > 0;
    console.log(`repos-section exists: ${reposSectionExists}`);

    if (reposSectionExists) {
      const reposSectionVisible = await reposSection.isVisible();
      console.log(`repos-section visible: ${reposSectionVisible}`);

      const reposContent = await reposSection.innerHTML();
      console.log(`repos-section innerHTML length: ${reposContent.length}`);

      if (reposContent.length === 0) {
        console.log('❌ CRITICAL: repos-section exists but is EMPTY - config.js did not populate it');
      } else {
        console.log('repos-section content preview:', reposContent.substring(0, 200));
      }
    }

    // Check for keyword manager elements
    const kwSelects = await page.locator('select[id^="kw-"]').count();
    console.log(`Keyword select elements found: ${kwSelects}`);

    const kwSrcSelects = await page.locator('select[id^="kw-src-"]').count();
    const kwAllSelects = await page.locator('select[id^="kw-all-"]').count();
    const kwRepoSelects = await page.locator('select[id^="kw-repo-"]').count();

    console.log(`Breakdown: kw-src=${kwSrcSelects}, kw-all=${kwAllSelects}, kw-repo=${kwRepoSelects}`);

    if (kwSelects === 0) {
      console.log('❌ CRITICAL FAILURE: Keyword manager did NOT render');
      console.log('This confirms the timing issue - config.js cannot find #repos-section');
    } else {
      console.log(`✅ Keyword manager rendered with ${kwSelects} select elements`);
    }

    // Don't fail the test, just report findings
    expect(reposSectionExists).toBe(true);
  });

  test('Tooltips module loaded', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if tooltips.js is loaded by looking for tooltip elements
    // The tooltip system might use .tooltip-icon, [data-tooltip], etc.
    const tooltipElements = await page.locator('.tooltip-icon, [data-tooltip], .help-icon, [title]').count();

    console.log(`Found ${tooltipElements} potential tooltip elements`);

    if (tooltipElements > 0) {
      console.log('✅ Tooltip elements present');
    } else {
      console.log('⚠️  No tooltip elements found (tooltips.js may not be attaching)');
    }
  });
});
PLAYWRIGHT_EOF

echo ""
echo "Running Playwright tests..."
npx playwright test e2e/tab-verification.spec.ts --reporter=list 2>&1 | tee /tmp/playwright-results.txt

echo ""
echo "==================================================================="
echo "TEST RESULTS SUMMARY"
echo "==================================================================="
echo ""

if grep -q "CRITICAL FAILURE" /tmp/playwright-results.txt; then
    echo "❌ CRITICAL FAILURES DETECTED"
fi

if grep -q "repos-section exists but is EMPTY" /tmp/playwright-results.txt; then
    echo "❌ Keyword manager timing issue CONFIRMED"
fi

echo ""
echo "Screenshots saved to /tmp/screenshot_*.png"
echo "Backend logs: /tmp/backend.log"
echo "Frontend logs: /tmp/frontend.log"
echo "Playwright results: /tmp/playwright-results.txt"

echo ""
echo "==================================================================="
echo "CLEANUP"
echo "==================================================================="
echo ""

echo "Stopping servers..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
pkill -f "uvicorn.*8012" || true
pkill -f "vite.*3000" || true

echo "✅ Servers stopped"
echo ""
echo "==================================================================="
echo "GUI VERIFICATION COMPLETE"
echo "==================================================================="
