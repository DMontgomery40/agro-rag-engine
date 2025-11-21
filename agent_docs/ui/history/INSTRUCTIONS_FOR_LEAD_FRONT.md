# Instructions for Lead/Front Agent: Complete Slice 1

**Current Status**: React scaffold complete, just need to build + test

---

## What You've Accomplished ✅

Amazing work! You've:
- ✅ Scaffolded complete Vite/React/TS/Tailwind app
- ✅ Wired Tailwind to existing CSS tokens
- ✅ Created Dashboard component that fetches `/api/pipeline/summary`
- ✅ TypeScript types for API response
- ✅ Error handling + loading states
- ✅ Entry point (`main.tsx`) and app shell (`App.tsx`)

**Backend is ready**: All endpoints you need are extracted and tested.

---

## Next Steps (To Finish Slice 1)

### Step 1: Build the React App

```bash
cd .worktrees/feature-ui-migration/web
npm install
npm run build
```

**Expected output**:
- `web/dist/index.html` (generated)
- `web/dist/assets/*.js` (bundled React app)
- `web/dist/assets/*.css` (Tailwind compiled)

**Verify build**:
```bash
ls -lh dist/
# Should see index.html and assets/ directory
```

### Step 2: Test `/web` Route Manually

```bash
# From UI worktree root
cd .worktrees/feature-ui-migration

# Start server
python -m uvicorn server.app:app --reload --port 8012
```

**In browser**:
1. Go to `http://localhost:8012/web`
2. Should see: "AGRO Dashboard" topbar
3. Should see: "Pipeline Summary" card
4. Should see: Live data (repo name, retrieval mode, health, etc.)

**If you see**:
- ❌ "Loading..." forever → Check browser console for API errors
- ❌ Static placeholder → Build didn't run or dist not updated
- ❌ 404 → Server not finding dist/ (check mount path)

### Step 3: Add Playwright Test

**Install Playwright** (if not already):
```bash
cd .worktrees/feature-ui-migration
npm install -D @playwright/test
npx playwright install chromium
```

**Create test file**: `tests/dashboard.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Assumes server running at 8012
  await page.goto('http://localhost:8012/web')
})

test('dashboard loads and displays pipeline summary', async ({ page }) => {
  // Verify topbar
  await expect(page.locator('.topbar .title')).toContainText('AGRO Dashboard')
  
  // Verify dashboard card heading
  await expect(page.locator('h3')).toContainText('Pipeline Summary')
  
  // Verify repo field is rendered (contains "Repo:")
  const repoLine = page.locator('text=/Repo:/')
  await expect(repoLine).toBeVisible()
  
  // Verify health field is rendered
  await expect(page.locator('text=/Health:/')).toBeVisible()
})

test('dashboard shows loading state initially', async ({ page }) => {
  // Slow down API to catch loading state
  await page.route('**/api/pipeline/summary', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.continue()
  })
  
  await page.goto('http://localhost:8012/web')
  
  // Should briefly show "Loading..."
  await expect(page.locator('text=Loading...')).toBeVisible({ timeout: 200 })
})

test('dashboard handles API errors gracefully', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/pipeline/summary', route => {
    route.fulfill({ 
      status: 500, 
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal error', request_id: 'test123' })
    })
  })
  
  await page.goto('http://localhost:8012/web')
  
  // Should show error message in .text-err class
  await expect(page.locator('.text-err')).toBeVisible()
  await expect(page.locator('.text-err')).toContainText('Failed to load')
})
```

**Run test**:
```bash
# Make sure server is running first!
# In separate terminal: python -m uvicorn server.app:app --reload --port 8012

npx playwright test tests/dashboard.spec.ts --project=chromium
```

**Expected**: All 3 tests pass ✅

### Step 4: Test GUI_CUTOVER Flag

```bash
# Set environment variable
export GUI_CUTOVER=1

# Restart server
python -m uvicorn server.app:app --reload --port 8012
```

**In browser**:
1. Go to `http://localhost:8012/` (root, no `/web`)
2. Should automatically redirect to `/web`
3. Should see Dashboard

**Verify redirect**:
- URL bar changes from `/` to `/web`
- Dashboard loads

**Reset**:
```bash
unset GUI_CUTOVER
# or
export GUI_CUTOVER=0
```

---

## Troubleshooting

### Build Issues

**Problem**: `npm install` fails
**Fix**: Check Node version (need 18+), try `npm ci` instead

**Problem**: Build succeeds but `/web` shows old HTML
**Fix**: Check `dist/` was updated (ls -l web/dist/), clear browser cache

### API Issues

**Problem**: Dashboard shows "Failed to load summary"
**Fix**: 
1. Check browser console for CORS errors
2. Verify API is running: `curl http://localhost:8012/api/pipeline/summary`
3. Check network tab: request to `/api/pipeline/summary` should return 200

**Problem**: API returns 404
**Fix**: 
1. Backend worktree might not have pipeline router wired
2. Check `server/asgi.py` includes `pipeline_router`

### Playwright Issues

**Problem**: Tests timeout
**Fix**: 
1. Increase timeout: `await expect(...).toBeVisible({ timeout: 5000 })`
2. Check server is running on port 8012
3. Check Playwright installed: `npx playwright install`

**Problem**: Can't find elements
**Fix**: 
1. Use Playwright inspector: `PWDEBUG=1 npx playwright test`
2. Check selectors match actual HTML (e.g., `.topbar .title`)
3. Use `page.pause()` to debug

---

## Success Criteria

Before asking to merge:
- ✅ `npm run build` completes successfully
- ✅ `/web` displays live Dashboard (not static HTML)
- ✅ Dashboard shows real data from `/api/pipeline/summary`
- ✅ Playwright test passes (all 3 scenarios)
- ✅ `GUI_CUTOVER=1` redirects `/` → `/web`
- ✅ No console errors in browser

---

## After Slice 1 Complete

Report back:
1. ✅ Build output (show `ls -lh web/dist`)
2. ✅ Playwright test results (screenshot or output)
3. ✅ Screenshot of Dashboard in browser
4. 🚀 Ready to merge!

Then user will merge both worktrees to `development`.

---

## Next Slice (After Merge)

**Slice 2: Search Page**
- Create `/search` route
- Use extracted `/search` endpoint (backend already has it!)
- Display results list
- File links navigate to `/files/*`
- Playwright: search returns results

**You're almost done with Slice 1!** Just build, test, and verify. 🎉

