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
