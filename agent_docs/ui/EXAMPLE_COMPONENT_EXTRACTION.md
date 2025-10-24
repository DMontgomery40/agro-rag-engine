# Component Extraction Example
## Real Example: Converting "System Status" Section from HTML to React

This is a **worked example** showing exactly how to extract a component from the current UI and convert it to React while preserving visual appearance.

---

## Step 1: Identify the Component in Original HTML

**Location**: `gui/index.html` around line 3557

**Original HTML**:
```html
<h3>📊 System Status</h3>
<div class="input-row">
    <div class="input-group">
        <label>Reranker Status</label>
        <div id="reranker-enabled-status" 
             style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">
            ...
        </div>
    </div>
    <div class="input-group">
        <label>Logged Queries</label>
        <div id="reranker-query-count" 
             style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">
            ...
        </div>
    </div>
    <div class="input-group">
        <label>Training Triplets</label>
        <div id="reranker-triplet-count" 
             style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">
            ...
        </div>
    </div>
</div>
```

---

## Step 2: Extract CSS Styles

**From `gui/style.css`**:

```css
/* Input rows (from line ~90) */
.input-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-bottom: 16px;
}

/* Input groups (from line ~97) */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**Inline styles** (from HTML above):
```css
padding: 8px;
background: var(--card-bg);
border-radius: 4px;
font-family: 'SF Mono', monospace;
font-size: 13px;
```

---

## Step 3: Visual Description

**What it looks like**:
- Section header with emoji icon
- Grid layout with 3 columns (responsive: might be 1-2 cols on mobile)
- Each item has:
  - Uppercase label (muted color, small font)
  - Value display (monospace font, card background, rounded corners)
- Values are read-only displays (not inputs)

**Colors used**:
- Text: `var(--fg)` (white)
- Labels: `var(--fg-muted)` (blue-gray)
- Value backgrounds: `var(--card-bg)` (dark)

---

## Step 4: Convert to React Component

**New file**: `web/src/components/SystemStatusSection.tsx`

```typescript
import React from 'react'

interface StatusMetric {
  label: string
  value: string | number
}

interface SystemStatusSectionProps {
  metrics: StatusMetric[]
}

export function SystemStatusSection({ metrics }: SystemStatusSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
        📊 System Status
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-muted uppercase tracking-wider">
              {metric.label}
            </label>
            <div className="bg-cardBg border border-line rounded-lg p-2 font-mono text-[13px] text-fg">
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 5: Visual Comparison Checklist

Let's verify we matched every visual detail:

### Layout
- ✅ Grid with responsive columns (1 → 2 → 3 based on screen size)
- ✅ Gap between items: `16px` (`gap-4` in Tailwind)
- ✅ Vertical spacing between label and value: `8px` (`gap-2`)

### Typography
- ✅ H3: `text-lg` (~18px), `font-semibold` (600 weight)
- ✅ Label: `13px`, `font-medium` (500 weight), `uppercase`, `tracking-wider` (letter-spacing)
- ✅ Value: `13px`, `font-mono` (SF Mono/monospace)

### Colors
- ✅ H3 text: `text-fg` (white)
- ✅ Label: `text-muted` (blue-gray)
- ✅ Value background: `bg-cardBg` (dark card background)
- ✅ Value border: `border-line` (subtle)

### Spacing
- ✅ Value padding: `p-2` (8px) matches original `padding: 8px`
- ✅ Border radius: `rounded-lg` (8px) matches original `border-radius: 4px` (close enough)

### Special Details
- ✅ Emoji in header preserved
- ✅ Monospace font for values (technical data aesthetic)
- ✅ Uppercase labels with letter-spacing
- ✅ Responsive grid (collapses on mobile)

---

## Step 6: Usage in Parent Component

**In `web/src/pages/Dashboard.tsx`**:

```typescript
import { SystemStatusSection } from '../components/SystemStatusSection'

export function Dashboard() {
  const systemMetrics = [
    { label: 'Reranker Status', value: 'Enabled' },
    { label: 'Logged Queries', value: '1,234' },
    { label: 'Training Triplets', value: '5,678' }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Other dashboard sections */}
      
      <SystemStatusSection metrics={systemMetrics} />
      
      {/* More sections */}
    </div>
  )
}
```

---

## Step 7: Fine-Tuning (If Needed)

**After visual comparison**, if something looks off:

### Too much/little spacing?
```typescript
// Adjust gap values
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  {/* was gap-4, now gap-3 for tighter spacing */}
```

### Font size slightly off?
```typescript
// More precise font sizing
<label className="text-[12px] ...">  {/* was 13px, now 12px */}
```

### Border radius not matching?
```typescript
// Match exact radius
<div className="... rounded-[4px]">  {/* was rounded-lg (8px), now exactly 4px */}
```

### Value display box looks different?
```typescript
// Add subtle shadow if original has one
<div className="... shadow-sm">
```

---

## What Makes This Work

1. **Small scope**: 20 lines of HTML, not 6000
2. **All context provided**: HTML + CSS + visual description
3. **Exact measurements**: Specific px values, not "looks nice"
4. **Design tokens used**: `text-muted`, `bg-cardBg` from existing system
5. **Iterative refinement**: Build, compare, adjust, repeat

---

## Applying This to Other Components

Use this same process for every component:

### TopBar Component
1. Extract HTML (lines ~22-60 in `gui/index.html`)
2. Extract CSS (`.topbar`, `.brand`, `.tagline` from `style.css`)
3. Convert to React with same styling
4. Verify side-by-side

### Button Component
1. Extract HTML (`<button class="...">` examples)
2. Extract CSS (`.top-actions button`, `.small-button`, etc.)
3. Create `Button.tsx` with variants (primary, secondary, icon)
4. Use throughout app consistently

### Card Component
1. Extract HTML (`.settings-section`, `.result-display`, etc.)
2. Extract CSS (padding, borders, shadows)
3. Create `Card.tsx` with variants
4. Apply everywhere cards appear

### Input Component
1. Extract HTML (`<input>`, `<select>`, etc.)
2. Extract CSS (`.input-group input`, focus states)
3. Create `Input.tsx` with label, error states, etc.
4. Use in all forms

---

## Tools to Help Extract

### Finding HTML sections by ID/class
```bash
# Search for a specific ID
grep -n "id=\"system-status\"" gui/index.html

# Extract lines around it
sed -n '3550,3575p' gui/index.html > /tmp/section.html
```

### Finding CSS for a class
```bash
# Find all styles for .input-group
grep -A 10 "\.input-group" gui/style.css gui/css/*.css
```

### Taking screenshots for comparison
```bash
# In your browser DevTools:
# 1. Right-click component → "Capture node screenshot"
# 2. Save to agent_docs/ui/screenshots/
```

### Visual diffing (optional)
```bash
# If you have ImageMagick
compare old-dashboard.png new-dashboard.png diff.png
```

---

## Red Flags (When Component Doesn't Match)

### Color is wrong
- **Problem**: New component uses default Tailwind colors
- **Fix**: Ensure you're using token-based colors (`text-muted`, `bg-panel`, etc.)
- **Check**: Inspect in DevTools, compare computed colors

### Spacing feels off
- **Problem**: Tailwind defaults (`p-4`, `gap-4`) don't match original
- **Fix**: Use exact px values with bracket notation: `p-[8px]`, `gap-[12px]`
- **Check**: Measure in DevTools with ruler/grid overlay

### Font looks different
- **Problem**: Font family, size, or weight doesn't match
- **Fix**: Specify exact font-family and use `text-[13px]` for precise sizing
- **Check**: Compare computed font styles in DevTools

### Missing hover/focus states
- **Problem**: Original has smooth transitions, new one doesn't
- **Fix**: Add `transition-all duration-200` and hover states with `hover:` prefix
- **Check**: Hover over both versions side-by-side

### Borders/shadows missing
- **Problem**: Original has subtle visual depth, new one looks flat
- **Fix**: Add `border border-line` and `shadow-sm` where appropriate
- **Check**: Turn off/on borders in DevTools to see the difference

---

## Success Criteria

Your component conversion is successful when:

1. ✅ Side-by-side looks identical (or within 2-3px)
2. ✅ All colors match (use DevTools color picker to verify)
3. ✅ Typography is the same (family, size, weight, letter-spacing)
4. ✅ Spacing matches (padding, margin, gap)
5. ✅ Interactive states work (hover, focus, active)
6. ✅ Responsive behavior matches original
7. ✅ User can't tell it's been refactored

---

## Time Estimate Per Component

Based on complexity:

- **Simple** (button, badge): 15-30 min
- **Medium** (card, input group, status section): 30-60 min
- **Complex** (dashboard grid, navigation): 1-2 hours
- **Very complex** (full page with multiple sections): 2-4 hours

**Total refactor estimate**: 
- ~30 components × 45 min average = ~22 hours of focused work
- Spread over multiple sessions with iterative refinement

---

## Next Steps

1. **Create screenshot library** of current UI (all major sections)
2. **List all components** to migrate (inventory)
3. **Start with simplest** (buttons, badges, cards)
4. **Build up to complex** (navigation, dashboard, forms)
5. **Verify each one** before moving to next
6. **Compose into pages** once components are ready

This systematic approach ensures you **don't lose your beautiful UI** during the refactor.

---

**Last Updated**: 2025-10-24  
**Next**: Start with extracting Button and Card components (foundational building blocks)

