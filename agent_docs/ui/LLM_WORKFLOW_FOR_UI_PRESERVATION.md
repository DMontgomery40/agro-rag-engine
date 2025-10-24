# LLM Workflow for UI Preservation During Refactor
## How to Get LLMs to Preserve Your Beautiful UI (When They Can't Read 6000 Lines)

---

## The Problem

You have:
- ✅ Beautiful, polished UI (6000+ lines HTML + 30+ JS modules)
- ✅ Design tokens already extracted (`tokens.css`)
- ❌ **But**: No LLM can read the entire thing at once
- ❌ **Result**: New React components are plain/unstyled

---

## The Solution: Chunked Component Migration

Break the migration into **small, visual-focused prompts** that give the LLM everything it needs to match styling.

---

## Step-by-Step Workflow

### Phase 1: Inventory & Screenshot Library

**Do this yourself (one-time setup)**:

1. **Take screenshots of every major section** of your current UI:
   ```bash
   mkdir agent_docs/ui/screenshots
   
   # Open your current dashboard and take screenshots:
   # - Overview/Dashboard
   # - System Status section
   # - Quick Actions grid
   # - Each tab/panel
   # - Modals/dialogs
   # - Forms/inputs
   ```

2. **Create a component manifest**:
   ```markdown
   # Component Inventory
   
   ## Dashboard Components
   - [ ] TopBar (brand, search, actions, health)
   - [ ] StatusCard (system health indicators)
   - [ ] QuickActionsGrid (button grid with icons)
   - [ ] PipelineSummaryCard (labeled rows with values)
   - [ ] RecentActivityFeed
   
   ## Shared Components
   - [ ] Button (primary, secondary, icon)
   - [ ] Card (basic container)
   - [ ] Input (text, select, checkbox)
   - [ ] StatusBadge (health indicators)
   - [ ] MetricChip (small pills)
   - [ ] NavigationTabs
   ```

### Phase 2: Extract Component HTML/CSS (Per Component)

**For EACH component you want to migrate**:

1. **Find it in the original HTML** (search for ID or class)
2. **Extract just that section** (20-50 lines, not 6000)
3. **Extract associated CSS** (from `style.css` or inline styles)

**Example**: TopBar component

```bash
# Find the topbar in index.html
grep -A 30 'class="topbar"' gui/index.html > /tmp/topbar.html

# Find topbar styles
grep -A 20 '.topbar' gui/style.css > /tmp/topbar.css
```

### Phase 3: Give LLM Focused Prompts

**Template prompt for building a component**:

````markdown
I need to build a React component that EXACTLY matches the visual style of our current UI.

**Current HTML** (from `gui/index.html`):
```html
<div class="topbar">
  <h1>
    <span class="brand">AGRO</span>
    <span class="tagline">Another Good RAG Option</span>
  </h1>
  <div class="top-actions">
    <span id="health-status">healthy</span>
    <input id="global-search" type="text" placeholder="Search settings (Ctrl+K)" />
    <button onclick="window.open('/gui/calc.html')">💰 Cost Calc</button>
  </div>
</div>
```

**Current CSS** (from `gui/style.css` and inline):
```css
.topbar {
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar .brand {
  font-weight: 800;
  color: var(--accent);
  font-size: 28px;
  letter-spacing: 0.5px;
}

.topbar .tagline {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--fg-muted);
  opacity: 0.6;
}

.top-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.top-actions button {
  background: var(--accent);
  color: var(--accent-contrast);
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  transition: all 0.2s;
}

#global-search {
  width: 320px;
  height: 38px;
  background: var(--input-bg);
  color: var(--fg);
  border: 1px solid var(--line);
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
}
```

**Screenshot**: [Attach screenshot of TopBar]

**Requirements**:
1. Create a `TopBar.tsx` React component
2. Use Tailwind classes (our config has all the token colors)
3. Match the visual appearance EXACTLY:
   - Same spacing, colors, typography
   - Same hover states
   - Same responsive behavior
4. Props: `healthStatus: string`, `onSearch: (query: string) => void`
5. The component should look identical to the screenshot

**Visual Design System**: See `agent_docs/ui/VISUAL_DESIGN_SYSTEM.md` for color tokens and patterns.
````

### Phase 4: Verify Visual Parity

**After LLM generates the component**:

1. **Build and run**: `npm run dev`
2. **Open side-by-side**: Old UI (`:8012/gui`) and new UI (`:8012/web`)
3. **Compare visually**:
   - Colors match?
   - Spacing match?
   - Typography match?
   - Hover states work?
   - Responsive behavior match?

4. **If not exact**: Give LLM feedback:
   ```
   The button padding is wrong. In the original it's `8px 14px` (vertical, horizontal),
   but yours looks like `12px 16px`. Please fix to match exactly.
   ```

5. **Iterate until pixel-perfect** (or close enough)

---

## Pro Tips for Working with LLMs

### ✅ DO:

1. **Provide screenshots** - Visual reference is critical
2. **Show exact HTML + CSS** - Don't make LLM guess
3. **Give small chunks** - One component at a time
4. **Reference the design system doc** - Point to `VISUAL_DESIGN_SYSTEM.md`
5. **Specify Tailwind usage** - "Use `bg-panel` and `text-fg` classes"
6. **Ask for exact matches** - "Match the visual appearance EXACTLY"
7. **Provide feedback** - "The spacing is off, increase padding"

### ❌ DON'T:

1. **Don't dump 6000 lines** - LLM will miss details
2. **Don't say "make it pretty"** - Too vague
3. **Don't skip screenshots** - Text alone isn't enough
4. **Don't assume LLM knows your design system** - Spell it out
5. **Don't accept "close enough"** - Insist on exact matches
6. **Don't forget hover/focus states** - Explicitly ask for them

---

## Prompt Templates

### Building a New Component

```
Build a React component for [COMPONENT_NAME] that matches our current UI exactly.

**Original HTML**: [paste 20-50 lines]
**Original CSS**: [paste relevant styles]
**Screenshot**: [attach image]
**Design tokens**: Use variables from `web/src/styles/tokens.css`
**Requirements**:
- Match colors, spacing, typography exactly
- Include hover/focus states
- Make it accessible (ARIA labels, keyboard nav)
- Use TypeScript with proper types
- Props: [list expected props]

**Reference**: `agent_docs/ui/VISUAL_DESIGN_SYSTEM.md`
```

### Fixing Style Mismatches

```
The [COMPONENT_NAME] component doesn't match the original styling.

**Current (wrong)**: [screenshot or description]
**Expected (correct)**: [screenshot or description]

**Specific issues**:
1. Button padding should be `8px 14px` not `12px 16px`
2. Font size should be `13px` not `14px`
3. Border radius should be `6px` not `8px`
4. Missing hover state (should have `brightness(0.95)` filter)

Please fix these issues to match the original exactly.
```

### Converting Existing HTML Section to React

```
Convert this HTML section to a React component with the same visual appearance.

**HTML** (from `gui/index.html` lines X-Y):
```html
[paste section]
```

**CSS** (relevant styles):
```css
[paste styles]
```

**Instructions**:
- Convert to React/TypeScript
- Use Tailwind classes where possible
- Fall back to custom CSS (in component or global) when needed
- Maintain exact same visual appearance
- Extract dynamic parts as props
- Add proper TypeScript types

**Design tokens**: Available in Tailwind config (bg-panel, text-fg, etc.)
```

---

## Strategy for Large Sections

If a section is complex (like the Dashboard with multiple cards):

### Option A: Divide into Sub-Components

```
Dashboard (parent)
├── TopBar
├── StatusCard
├── QuickActionsGrid
│   └── ActionButton (repeated)
├── PipelineSummaryCard
│   └── SummaryRow (repeated)
└── Footer
```

Build bottom-up: Smallest components first, then compose.

### Option B: Scaffold Then Style

1. **First prompt**: "Build the component structure with placeholder styling"
2. **Second prompt**: "Now add exact styling to match the original"
3. **Third prompt**: "Fix these specific differences: [list]"

---

## Tracking Progress

Use a checklist (in `agent_docs/ui/MIGRATION_PROGRESS.md`):

```markdown
# UI Migration Progress

## Components Built ✅
- [x] TopBar
- [x] Button (primary variant)
- [x] Card (basic)

## Components In Progress 🚧
- [ ] StatusCard (50% - needs icons)
- [ ] NavigationTabs (needs hover states)

## Components Not Started 📋
- [ ] QuickActionsGrid
- [ ] PipelineSummaryCard
- [ ] SearchInterface
- [ ] SettingsPanel

## Styling Debt 🎨
- TopBar: Search input focus state is slightly off
- Button: Hover transition timing should be 0.2s not 0.3s
```

---

## Example Workflow Session

**You (to LLM)**:
```
I'm migrating our UI from HTML to React. I need to preserve the exact look and feel.

First component: Build a `StatusCard` that shows system health.

**Original HTML** (from gui/index.html lines 234-256):
[paste HTML]

**Original CSS**:
[paste CSS]

**Screenshot**: [attach image showing the card with green/red indicators]

**Requirements**:
- Props: `status: { qdrant: string, redis: string, api: string }`
- Use color coding: green for "healthy", red for "down", orange for "degraded"
- Match exact spacing and typography from screenshot
- Use tokens from `web/src/styles/tokens.css`

See `agent_docs/ui/VISUAL_DESIGN_SYSTEM.md` for our design patterns.
```

**LLM**: [Generates component]

**You**:
```
Good start! But the spacing is off. In the original:
- Card padding is `20px` not `16px`
- Gap between status items is `12px` not `8px`
- Status text is `13px` monospace font, not `14px` sans-serif

Please fix these to match the original exactly.
```

**LLM**: [Generates corrected version]

**You**:
```
Perfect! Now add hover state: when you hover over the card, the border should change from `var(--line)` to a slightly brighter color.
```

**LLM**: [Adds hover state]

**You**: Test, verify, commit ✅

---

## Key Insight

**The secret to getting LLMs to preserve your UI**:

> Don't give them 6000 lines and hope for the best.
> Give them 50 lines + a screenshot + explicit instructions for EACH component.
> Build your app component-by-component with visual parity verification at each step.

This is slower upfront but ensures you don't end up with a bland, generic UI that requires massive rework later.

---

## Tools That Can Help

### Screenshot Diffing
```bash
# Take reference screenshots
npm run build
npm run preview
# Screenshot each page → screenshots/old/

# After building new component
# Screenshot again → screenshots/new/

# Use ImageMagick to diff
compare screenshots/old/dashboard.png screenshots/new/dashboard.png screenshots/diff/dashboard.png
```

### CSS Extraction
```bash
# Extract all CSS for a specific class
grep -A 20 "\.topbar" gui/style.css gui/css/*.css

# Find all styles for an element
# (Open browser DevTools, inspect element, copy computed styles)
```

### HTML Extraction
```bash
# Extract section by ID
sed -n '/<div id="dashboard-section"/,/<\/div>/p' gui/index.html

# Extract section by line numbers
sed -n '234,256p' gui/index.html
```

---

## Success Metrics

You know you're doing it right when:
- ✅ Each new component looks identical to the original (side-by-side)
- ✅ Users can't tell the difference between old and new UI
- ✅ Color tokens are used consistently
- ✅ Spacing/typography match the design system
- ✅ Interactive states (hover/focus) are preserved
- ✅ The refactor doesn't change the aesthetic at all

---

**Bottom Line**: 

**You CAN preserve your gorgeous UI during a refactor, even though LLMs can't read your entire codebase. The key is: component-by-component migration with visual verification at each step.**

Don't try to do it all at once. Build systematically, compare obsessively, and insist on exact matches.

Your future self (and your users) will thank you.

---

**Last Updated**: 2025-10-24

