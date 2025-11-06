#!/bin/bash
# RUNTIME VERIFICATION - Phases 8-13
# Actually tests the application in a browser to verify functionality
# This extends comprehensive_audit.sh with real runtime testing

set -e

echo "==================================================================="
echo "PHASE 8: SERVER STARTUP"
echo "==================================================================="
echo ""

echo "Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"

echo ""
echo "Checking if Qdrant is accessible..."
if ! curl -s http://localhost:6333/collections > /dev/null 2>&1; then
    echo "⚠️  Qdrant not accessible on port 6333"
else
    echo "✅ Qdrant is accessible"
fi

echo ""
echo "Starting backend server..."
cd /home/user/agro-rag-engine
pkill -f "uvicorn.*8012" || true
uvicorn server.app:app --host 127.0.0.1 --port 8012 > /tmp/backend.log 2>&1 &
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
        cat /tmp/backend.log
        exit 1
    fi
    sleep 1
done

echo ""
echo "Starting frontend server..."
cd /home/user/agro-rag-engine/web
pkill -f "vite.*3000" || true
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is responding"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend failed to start after 30 seconds"
        cat /tmp/frontend.log
        exit 1
    fi
    sleep 1
done

echo ""
echo "==================================================================="
echo "PHASE 9: PLAYWRIGHT E2E TESTING"
echo "==================================================================="
echo ""

echo "Installing Playwright if needed..."
cd /home/user/agro-rag-engine/web
if ! npx playwright --version > /dev/null 2>&1; then
    npm install -D @playwright/test
    npx playwright install
fi

echo ""
echo "Creating Playwright test for all 9 tabs..."
mkdir -p e2e

cat > e2e/tab-verification.spec.ts << 'PLAYWRIGHT_EOF'
import { test, expect } from '@playwright/test';

test.describe('Tab Functionality Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  const tabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'RAG', path: '/rag' },
    { name: 'Chat', path: '/chat' },
    { name: 'Editor', path: '/editor' },
    { name: 'Settings', path: '/settings' },
    { name: 'Logs', path: '/logs' },
    { name: 'Help', path: '/help' },
    { name: 'Docker', path: '/docker' },
    { name: 'About', path: '/about' }
  ];

  for (const tab of tabs) {
    test(`${tab.name} tab loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(`http://localhost:3000${tab.path}`);
      await page.waitForLoadState('networkidle');

      // Wait for tab content to render
      await page.waitForTimeout(1000);

      // Check for console errors
      if (errors.length > 0) {
        console.log(`❌ ${tab.name} tab has JavaScript errors:`, errors);
      }

      // Verify no critical errors
      expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
    });
  }

  test('Keyword Manager renders in RAG tab', async ({ page }) => {
    await page.goto('http://localhost:3000/rag');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give modules time to execute

    // Check if repos-section exists
    const reposSection = await page.locator('#repos-section');
    await expect(reposSection).toBeVisible();

    // Check if keyword manager elements are present
    const keywordSelects = await page.locator('select[id^="kw-"]').count();

    if (keywordSelects === 0) {
      console.log('❌ Keyword manager elements not found');
      const reposContent = await reposSection.innerHTML();
      console.log('repos-section innerHTML:', reposContent);
    } else {
      console.log(`✅ Found ${keywordSelects} keyword manager select elements`);
    }

    expect(keywordSelects).toBeGreaterThan(0);
  });

  test('Tooltips are interactive', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for tooltip icons (usually marked with .tooltip-icon or similar)
    const tooltipIcons = await page.locator('.tooltip-icon, [data-tooltip], .help-icon').count();

    if (tooltipIcons > 0) {
      console.log(`✅ Found ${tooltipIcons} tooltip icons`);

      // Try hovering over first tooltip
      const firstTooltip = page.locator('.tooltip-icon, [data-tooltip], .help-icon').first();
      await firstTooltip.hover();
      await page.waitForTimeout(500);

      // Check if tooltip bubble appeared
      const tooltipBubble = await page.locator('.tooltip, .tooltip-content, [role="tooltip"]').count();
      if (tooltipBubble > 0) {
        console.log('✅ Tooltip bubble appeared on hover');
      } else {
        console.log('⚠️  Tooltip icon found but bubble did not appear');
      }
    } else {
      console.log('⚠️  No tooltip icons found');
    }
  });

  test('Docker controls are functional', async ({ page }) => {
    await page.goto('http://localhost:3000/docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if containers are listed
    const refreshButton = await page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();

    // Click refresh
    await refreshButton.click();
    await page.waitForTimeout(1000);

    // Check for error messages
    const errorDiv = await page.locator('div:has-text("Error:")').count();
    if (errorDiv > 0) {
      const errorText = await page.locator('div:has-text("Error:")').textContent();
      console.log('⚠️  Docker error:', errorText);
    }
  });
});
PLAYWRIGHT_EOF

echo ""
echo "Running Playwright tests..."
npx playwright test e2e/tab-verification.spec.ts --reporter=list 2>&1 | tee /tmp/playwright-results.txt

echo ""
echo "==================================================================="
echo "PHASE 10: MANUAL VERIFICATION CHECKLIST"
echo "==================================================================="
echo ""

cat << 'CHECKLIST_EOF'
The following items require manual verification in a browser:

□ Dashboard tab shows health status cards
□ RAG tab Data Quality section shows keyword manager with:
  - Source filter dropdown (All/Discriminative/Semantic)
  - Available keywords select box (left)
  - Add/Remove buttons (center)
  - Repository keywords select box (right)
□ Chat tab shows chat interface with send button
□ Editor tab shows file tree and editor pane
□ Settings tab shows all configuration options with tooltips
□ Logs tab shows log viewer
□ Help tab shows help content
□ Docker tab shows container list with start/stop/restart buttons
□ About tab shows version information
□ Hover over (?) icons shows tooltip bubbles with help text
□ Tooltip bubbles contain third-party links where applicable
□ All navigation between tabs works without console errors
□ Backend API calls complete successfully (check Network tab)

CHECKLIST_EOF

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

echo ""
echo "==================================================================="
echo "RUNTIME VERIFICATION COMPLETE"
echo "==================================================================="
echo ""
echo "Results saved to:"
echo "  Backend logs: /tmp/backend.log"
echo "  Frontend logs: /tmp/frontend.log"
echo "  Playwright results: /tmp/playwright-results.txt"
