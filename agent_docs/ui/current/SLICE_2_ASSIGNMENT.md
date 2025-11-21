# Frontend Agent: Slice 2 - Config Management UI

**Assigned by**: Opus Architect via Sonnet  
**Priority**: HIGH  
**Estimated Time**: 4-5 hours  
**Status**: Ready to start

---

## Your Mission

Build the **Config Management** page in React that renders a schema-driven form from `/api/config-schema` and allows users to update all system settings.

**Critical**: Wire to EXISTING backend APIs - do not modify backend code.

---

## Target Features

### Settings to Expose:

**Generation**:
- Model selection (dropdown)
- Temperature (slider 0-2)
- Max tokens (number input)

**Retrieval**:
- Top-K (FINAL_K) (number input)
- Multi-query rewrites (number input)
- Skip dense (checkbox)

**Reranker**:
- Enabled (checkbox)
- Backend selection (dropdown: cloud/hf/local/learning)
- Model (conditional dropdowns based on backend)

**Enrichment**:
- Enabled (checkbox)
- Backend (dropdown: mlx/ollama/openai)
- Model (conditional based on backend)

**Repository**:
- Active repo (dropdown)
- Git branch hint (text input)

**Secrets** (masked):
- API keys (password inputs with show/hide)
- Import from file via `/api/secrets/ingest`

---

## Implementation Guide

### 1. Create API Client (`web/src/services/api.ts`)

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type ConfigSchema = {
  schema: any  // JSON Schema
  ui: any      // UI metadata
  values: Record<string, any>  // Current values
}

export async function fetchConfigSchema(): Promise<ConfigSchema> {
  const res = await fetch(`${API_BASE}/config-schema`)
  if (!res.ok) throw new Error('Failed to fetch config schema')
  return res.json()
}

export async function updateConfig(updates: Record<string, any>): Promise<void> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) throw new Error('Failed to update config')
}
```

### 2. Create Config Page (`web/src/pages/Config.tsx`)

```typescript
import React, { useEffect, useState } from 'react'
import { fetchConfigSchema, updateConfig } from '../services/api'
import { ConfigForm } from '../components/ConfigForm'

export function Config() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchConfigSchema()
      .then(setSchema)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (values: Record<string, any>) => {
    try {
      await updateConfig(values)
      alert('Settings saved!')
      // Optionally reload schema to show updated values
    } catch (e) {
      alert(`Error: ${e.message}`)
    }
  }

  if (loading) return <div className="container"><div>Loading settings...</div></div>
  if (error) return <div className="container"><div className="text-err">{error}</div></div>

  return (
    <div className="container">
      <h2>Configuration</h2>
      <ConfigForm schema={schema} onSave={handleSave} />
    </div>
  )
}
```

### 3. Create Config Form Component (`web/src/components/ConfigForm.tsx`)

Use existing CSS tokens from `web/src/styles/tokens.css`:
- `bg-panel`, `bg-input`, `text-fg`, `text-muted`
- `border-line`, `ring-ring`

**For each field group** (generation, retrieval, reranker, etc.):
- Render a card with title
- Map JSON Schema types to inputs:
  - `type: "string"` + `enum` → `<select>`
  - `type: "number"` → `<input type="number">`
  - `type: "boolean"` → `<input type="checkbox">`
- Apply min/max from schema
- Show help text from `ui.titles`

**For secrets**:
- Mask value: `type="password"`
- Add show/hide toggle
- Indicate with `••••••••` if already set

### 4. Add Navigation

Update `web/src/App.tsx` to add routing:

```typescript
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Config } from './pages/Config'

export function App() {
  return (
    <BrowserRouter basename="/web">
      <div>
        <nav className="topbar">
          <div className="title">AGRO</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/">Dashboard</Link>
            <Link to="/config">Config</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
```

**Install router**: `npm install react-router-dom`

### 5. Add Playwright Test (`tests/config-ui.spec.ts`)

```typescript
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8012'

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/web/config`)
})

test('config page loads and displays settings', async ({ page }) => {
  await expect(page.locator('h2')).toContainText('Configuration')
  
  // Verify groups render
  await expect(page.locator('text=Generation')).toBeVisible()
  await expect(page.locator('text=Retrieval')).toBeVisible()
  await expect(page.locator('text=Reranker')).toBeVisible()
})

test('can change a setting and save', async ({ page }) => {
  // Find a numeric input (e.g., Temperature)
  const tempInput = page.locator('input[type="number"]').first()
  await tempInput.fill('0.5')
  
  // Click save button
  await page.locator('button:has-text("Save")').click()
  
  // Should show success (alert or toast)
  // Note: May need to adjust based on your UI
})

test('secrets are masked by default', async ({ page }) => {
  // Find secret field (if present)
  const secretField = page.locator('input[type="password"]').first()
  if (await secretField.count() > 0) {
    await expect(secretField).toHaveAttribute('type', 'password')
  }
})
```

---

## Docker Integration

**Your code will work in Docker because**:
- ✅ You're only calling `/api/config-schema` and `/api/config` (already Docker-compatible)
- ✅ All paths in React are relative (`/api/*`)
- ✅ Vite build is environment-agnostic

**After build**:
- Your `web/dist/` is bind-mounted to `/app/web/dist` in Docker
- Static files served by FastAPI from container

**No special Docker handling needed on your end!**

---

## Success Criteria

Before reporting "done":
- ✅ Config page renders from schema
- ✅ All setting groups visible (generation, retrieval, reranker, enrichment, repo)
- ✅ Can change a value and save via API
- ✅ Secrets are masked (password type)
- ✅ Built to `web/dist/`: `npm run build`
- ✅ Playwright test passes
- ✅ Production bundle size reasonable (< 200KB for this page)

---

## Testing Steps

### Local Development:
```bash
# Build
cd web
npm install react-router-dom
npm run build

# Verify
ls -lh dist/  # Should show updated bundle

# Manual test in browser
# http://localhost:8012/web/config
```

### Playwright:
```bash
# Server must be running
docker ps | grep agro-api  # Verify running

# Run test
npx playwright test tests/config-ui.spec.ts
```

---

## What to Report Back

1. ✅ Files created: `pages/Config.tsx`, `components/ConfigForm.tsx`, `services/api.ts`
2. ✅ Build output: `npm run build` size
3. ✅ Test results: Playwright screenshot or output
4. ⚠️ Any issues: Backend schema missing fields? API errors?

---

## Notes from Architect

- **Backend already has `/api/config-schema`** - use it as-is
- **Design tokens already wired** - use Tailwind classes: `bg-panel`, `text-fg`, etc.
- **Dashboard pattern works** - follow same fetch/render approach
- **Next slice after this**: Search & Chat interfaces (Slice 3)

**Get started with Config UI!** This is a key piece - all settings must be accessible per ADA requirements.

