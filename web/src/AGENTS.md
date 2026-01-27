---
paths: web/src/**/*.{ts,tsx}
---

# Zustand Configuration Flow

All frontend configuration state MUST use Zustand stores.

## Core Principle
**Never use `useState` for configuration values.** Use `useConfigStore` instead.

## Configuration Stack

```
useConfigStore (Zustand)
    ↓
useConfig() hook (debounced saves, type coercion)
    ↓
API client (web/src/api/config.ts)
    ↓
Backend: /api/config endpoints
```

## Reading Config

```typescript
// Option 1: Full config access
import { useConfig } from '@/hooks/useConfig';

function MyComponent() {
  const { config, get, set, loading } = useConfig();
  const value = get('RRF_K_DIV', 60);

  return <input value={value} onChange={e => set('RRF_K_DIV', e.target.value)} />;
}

// Option 2: Single field (simpler)
import { useConfigField } from '@/hooks/useConfig';

function MyComponent() {
  const [value, setValue] = useConfigField('RRF_K_DIV', 60);
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

## Direct Store Access

```typescript
import { useConfigStore } from '@/stores/useConfigStore';

// Selective subscription (prevents unnecessary re-renders)
const env = useConfigStore(state => state.config?.env);
const saveConfig = useConfigStore(state => state.saveConfig);
```

## API Client Resolution

The API client auto-detects environment:
- Dev (port 5173) → `http://127.0.0.1:8012/api`
- Production → `origin/api`

## Debounced Saves

`useConfig()` debounces saves by 300ms to prevent hammering the backend.

```typescript
const { set, saveNow } = useConfig();

set('KEY', value);        // Debounced (300ms)
await saveNow();          // Immediate save
```

## API Key Handling (Gold Standard)

**API keys are NEVER exposed to the frontend.** See `RerankerConfigSubtab.tsx` for reference.

### Pattern:
1. Keys stored in `.env` ONLY - never in agro_config.json
2. Frontend checks existence via backend endpoint:
   ```typescript
   fetch(`/api/secrets/check?keys=${keyName}`)
     .then(r => r.json())
     .then(data => {
       const isConfigured = data[keyName] === true;  // Boolean only!
     });
   ```
3. Display status indicator (configured / not configured)
4. Instruct user to add key directly to `.env` file

### Never:
- Request actual key values from backend
- Store keys in Zustand state
- Display or handle key values in frontend

## Key Files

- `web/src/stores/useConfigStore.ts` - Zustand store
- `web/src/hooks/useConfig.ts` - Config management hook
- `web/src/api/config.ts` - API client
- `web/src/api/client.ts` - Base axios instance
- `web/src/components/RAG/RerankerConfigSubtab.tsx` - API key pattern reference

## Common Mistakes

- Using `useState` for config values (use store instead)
- Not using selective subscriptions (causes re-renders)
- Exposing or handling API keys in frontend
- Direct API calls instead of through store

---

# UI Patterns and Design System

Comprehensive UI standards for `/web/src/`.

## Design Tokens (`tokens.css`)

### Colors (Dark Theme - Default)
```css
--bg: #0a0a0a           /* Base background */
--bg-elev1: #111111     /* Elevation 1 */
--bg-elev2: #1a1a1a     /* Elevation 2 */
--fg: #ffffff           /* Foreground text */
--fg-muted: #9fb1c7     /* Muted text */
--accent: #00ff88       /* Neon green - primary brand */
--accent-contrast: #000 /* Text on accent */
--link: #5b9dff         /* Informational blue */
--ok: #00ff88           /* Success green */
--warn: #ffaa00         /* Warning orange */
--err: #ff6b6b          /* Error red */
--line: var(--bg-elev2) /* Borders */
--ring: rgba(0, 255, 136, 0.18) /* Focus ring */
```

### Typography
```css
--font-sans: 'Inter', system fonts
--font-mono: ui-monospace, SFMono, Menlo, Monaco
```

### Timing
```css
--timing-instant: 0.05s
--timing-fast: 0.15s
--timing-normal: 0.2s
--timing-slow: 0.3s
--ease-out: cubic-bezier(0.4, 0, 0.2, 1)
```

## Form Inputs

### Input Group Pattern
```typescript
<div className="input-group">
  <label>
    Setting Name
    <TooltipIcon name="SETTING_KEY" />
  </label>
  <input
    value={value}
    onChange={e => set('KEY', e.target.value)}
    style={{
      background: 'var(--input-bg)',
      border: '1px solid var(--line)',
      borderRadius: '6px',
      padding: '10px 12px',
      color: 'var(--fg)',
      fontSize: '13px'
    }}
  />
</div>
```

### Input Row (2-column grid)
```typescript
<div className="input-row" style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px'
}}>
  <div className="input-group">...</div>
  <div className="input-group">...</div>
</div>
```

### Select Dropdowns
```typescript
<select
  value={value}
  onChange={e => setValue(e.target.value)}
  style={{
    width: '100%',
    padding: '10px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--line)',
    borderRadius: '6px',
    color: 'var(--fg)',
    fontSize: '13px'
  }}
>
  <option value="">Select...</option>
  {options.map(o => <option key={o} value={o}>{o}</option>)}
</select>
```

## Buttons (Button.tsx)

### Variants
```typescript
<Button variant="primary" size="md">Save</Button>     // Accent bg, black text
<Button variant="secondary" size="sm">Cancel</Button> // Transparent, accent border
<Button variant="ghost">Details</Button>              // No border
```

### Tab Bar Buttons
```css
.tab-bar button {
  background: var(--bg-elev2);
  color: var(--fg-muted);
  border: 1px solid var(--line);
  padding: 9px 16px;
  border-radius: 6px;
  font-size: 13px;
  min-height: 44px;
}

.tab-bar button.active {
  background: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}
```

### Subtab Buttons
```css
.subtab-btn {
  background: transparent;
  color: var(--fg-muted);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.subtab-btn.active {
  color: var(--accent);
}

/* Animated underline */
.subtab-btn::after {
  content: '';
  width: 0;
  height: 2px;
  background: var(--accent);
  transition: width 0.2s ease;
}
.subtab-btn.active::after { width: 100%; }
```

## Cards & Panels

### Settings Section
```typescript
<div style={{
  background: 'var(--card-bg)',
  border: '1px solid var(--line)',
  borderRadius: '12px',
  padding: '24px'
}}>
  <h4 style={{
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--fg)',
    marginBottom: '16px'
  }}>
    Section Title
  </h4>
  {/* Content */}
</div>
```

### Mode Selection Cards (RerankerConfigSubtab pattern)
```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px'
}}>
  {modes.map(mode => (
    <button
      onClick={() => setMode(mode.id)}
      style={{
        padding: '20px 16px',
        background: currentMode === mode.id
          ? 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(var(--accent-rgb), 0.05))'
          : 'var(--card-bg)',
        border: currentMode === mode.id
          ? '2px solid var(--accent)'
          : '1px solid var(--line)',
        borderRadius: '12px',
        textAlign: 'left'
      }}
    >
      <div style={{ fontSize: '28px' }}>{mode.icon}</div>
      <div style={{ fontSize: '14px', fontWeight: 600 }}>{mode.label}</div>
      <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>{mode.description}</div>
    </button>
  ))}
</div>
```

## Status Indicators

### API Key Status (Gold Standard - RerankerConfigSubtab)
```typescript
<div style={{
  padding: '12px 16px',
  background: isConfigured
    ? 'rgba(var(--ok-rgb), 0.1)'
    : 'rgba(var(--warn-rgb), 0.1)',
  border: `1px solid ${isConfigured ? 'var(--ok)' : 'var(--warn)'}`,
  borderRadius: '8px',
  fontSize: '12px'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span>{isConfigured ? '✓' : '⚠'}</span>
    <span style={{ fontWeight: 600 }}>
      {keyName}: {isConfigured ? 'Configured' : 'Not configured'}
    </span>
  </div>
  <div style={{ color: 'var(--fg-muted)' }}>
    {isConfigured
      ? 'Key is set in .env file and ready to use.'
      : <>Add <code>{keyName}=your_key</code> to your <code>.env</code> file.</>
    }
  </div>
</div>
```

### StatusIndicator Component
```typescript
<StatusIndicator
  status="online"      // online|offline|loading|success|warning|error|idle
  label="Service"
  pulse={true}
  size="md"           // sm|md|lg
/>
```

## Loading States

### LoadingSpinner
```typescript
<LoadingSpinner
  variant="circular"   // circular|dots|bars
  size="md"           // sm|md|lg|xl|number
  color="accent"      // accent|primary|secondary|success|warning|error|white
  label="Loading..."
  center={true}
/>
```

### SkeletonLoader
```typescript
<SkeletonLoader variant="text" width="100%" height="20px" count={3} />
<SkeletonLoader variant="circular" width={48} height={48} />
<SkeletonCard />
<SkeletonList items={5} />
```

## Progress Bars

### ProgressBar Component
```typescript
<ProgressBar
  value={65}
  max={100}
  label="Indexing..."
  variant="success"    // default|success|warning|error|info
  showPercentage={true}
  animated={true}
/>
```

### ProgressBarWithShimmer
```typescript
<ProgressBarWithShimmer
  progress={75}
  height="8px"
  showShimmer={true}
/>
```

## Tooltips (Required for all settings)

### TooltipIcon Component (Safe HTML - no dangerouslySetInnerHTML)
```typescript
<label>
  Setting Name
  <TooltipIcon name="SETTING_KEY" />
</label>
```

The TooltipIcon component uses DOMParser to safely convert HTML to React elements. **NEVER use dangerouslySetInnerHTML for tooltips.**

## Modals

### Modal Pattern (RepoSwitcherModal reference)
```typescript
{isOpen && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(2px)'
    }}
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      style={{
        background: 'var(--bg-elev1)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '520px'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Content */}
    </div>
  </div>
)}
```

## Error Display

### Error Banner
```typescript
{error && (
  <div style={{
    background: 'rgba(var(--error-rgb), 0.1)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'var(--error)',
    fontSize: '13px'
  }}>
    {error}
  </div>
)}
```

### ErrorBoundary
```typescript
<ErrorBoundary
  context="ComponentName"
  fallback={({ error, reset }) => (
    <SubtabErrorFallback error={error} onRetry={reset} />
  )}
>
  <Component />
</ErrorBoundary>
```

## Notifications

```typescript
// Fixed position, top-right, aria-live for accessibility
<div
  style={{
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 5000
  }}
  aria-live="polite"
  aria-atomic="true"
>
  {notifications.map(note => (
    <div
      style={{
        background: 'var(--bg-elev1)',
        borderLeft: `4px solid ${colorByType(note.type)}`,
        padding: '10px 12px',
        borderRadius: '6px'
      }}
      role="status"
    >
      {note.message}
    </div>
  ))}
</div>
```

## Micro-interactions

### Hover Effects
```css
transform: translateY(-1px) scale(1.02);
box-shadow: var(--shadow-sm);
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### Focus States
```css
input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
}
```

### Validation Animation
```css
/* Valid input pulse */
input.valid {
  border-color: var(--ok);
  animation: valid-pulse 0.3s ease;
}

/* Invalid input shake */
input.invalid {
  border-color: var(--warn);
  animation: invalid-shake 0.3s ease;
}
```

## Accessibility

### ARIA Patterns
```typescript
<div role="status" aria-label="Loading" aria-busy="true" />
<div role="progressbar" aria-valuenow={value} aria-valuemax={100} />
<div role="dialog" aria-modal="true" />
<div aria-live="polite" aria-atomic="true" />
```

### Focus Visible
```css
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

## Responsive Breakpoints

- **Tablet** (<1024px): Sidepanel stacks below content
- **Mobile** (<768px): Single column, mobile nav drawer
- **Phone** (<480px): Compact spacing, hidden elements

## Key Reference Files

- `web/src/styles/tokens.css` - Design system variables
- `web/src/styles/main.css` - Layout and component styles
- `web/src/styles/micro-interactions.css` - Animations
- `web/src/styles/slider-polish.css` - Range input styling
- `web/src/components/RAG/RerankerConfigSubtab.tsx` - Gold standard for forms, status, mode selection
- `web/src/components/ui/TooltipIcon.tsx` - Safe HTML rendering pattern
- `web/src/components/ui/Button.tsx` - Button variants
- `web/src/components/ui/ErrorBoundary.tsx` - Error handling
