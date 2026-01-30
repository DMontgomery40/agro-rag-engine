---
paths: web/src/components/**/*.{ts,tsx}
---

# React Component Conventions

Standards for React components in `/web/src/components/`.

## Organization

Feature-based directory structure:
```
components/
├── Dashboard/      # System status, monitoring
├── RAG/            # Retrieval, reranking, evaluation
├── Settings/       # Configuration UI
├── Admin/          # Administration
├── Chat/           # Chat interface
├── UI/             # Reusable primitives
└── ...
```

## Component Pattern

```typescript
import { useConfig } from '@/hooks/useConfig';
import { TooltipIcon } from '@/components/ui/TooltipIcon';

export function MyComponent() {
  const { get, set } = useConfig();
  const value = get('SETTING_KEY', defaultValue);

  return (
    <div className="subtab-panel">
      <label>
        Setting Name
        <TooltipIcon name="SETTING_KEY" />
      </label>
      <input
        value={value}
        onChange={e => set('SETTING_KEY', e.target.value)}
      />
    </div>
  );
}
```

## Required Elements

1. **Tooltips** - All settings must have `<TooltipIcon name="KEY" />`
2. **Labels** - Clear, descriptive labels for all inputs
3. **Error handling** - Display errors from hooks
4. **Loading states** - Show feedback during async operations

## Error Boundaries

Wrap routes and subtabs in error boundaries:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

<ErrorBoundary>
  <MySubtab />
</ErrorBoundary>
```

## TypeScript Only

**Never create `.js` files in `/web/src/`.**

When modifying legacy JS:
1. Refactor to TypeScript
2. Archive original to `/web/_archived`

## State Management

- **Config values**: Use `useConfigStore` via hooks
- **UI state**: Use `useUIStore` (persisted)
- **Local-only**: `useState` for component-specific state only

## Key Reference

`web/src/components/RAG/RerankerConfigSubtab.tsx` - Gold standard for:
- API key handling
- Mode selection UI
- Form layout patterns
