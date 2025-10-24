# AGRO Visual Design System
## Reference Guide for UI Refactor - Preserving Current Aesthetics

**Purpose**: This document captures the visual design language of the current AGRO dashboard to ensure the React/Vite/TS migration maintains the same look and feel.

---

## Core Visual Identity

### Brand Aesthetic
- **Style**: Cyberpunk / Developer-focused / Terminal-inspired
- **Mood**: High-tech, precise, fast, reliable
- **Key visual elements**: Neon accent colors, dark backgrounds, subtle glows, monospace fonts for data

### Color Palette (from tokens.css)

**Primary Colors**:
- Background: `#0a0a0a` (near-black)
- Panel: `#111111` (slightly lighter black)
- Accent: `#00ff88` (neon green - brand color)
- Text: `#ffffff` (white)
- Text Muted: `#9fb1c7` (blue-gray)

**Status Colors**:
- Success: `#00ff88` (same as accent)
- Warning: `#ffaa00` (orange)
- Error: `#ff6b6b` (red)
- Info: `#5b9dff` (blue)

**Visual Effects**:
- Border/Line: `#2a2a2a` (subtle)
- Ring/Focus: `rgba(0, 255, 136, 0.18)` (green glow)
- Shadows: Subtle, used sparingly for depth

---

## Typography

### Font Families
- **Sans-serif** (UI text): `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace** (data/code): `'SF Mono', 'Monaco', 'Consolas', monospace`

### Text Styles

**Headers**:
- H1 (Brand): `28px`, `800 weight`, `0.5px letter-spacing`, green accent color
- H2 (Section): `20px`, `600 weight`, `-0.01em letter-spacing`
- H3 (Card titles): `16px`, `600 weight`

**Body**:
- Regular: `14px`, `400 weight`, `1.6 line-height`
- Small: `13px`
- Tiny/Labels: `11px`, `uppercase`, `3px letter-spacing`, `600 weight`, muted color

**Special**:
- Monospace data: `13px`, `'SF Mono'`, used for values, status, metrics
- Links: Blue `#5b9dff`, no underline, subtle hover brightness change

---

## Layout Patterns

### Top Bar (Sticky)
- Height: `56px`
- Background: Panel color
- Border: `1px solid var(--line)` on bottom
- Padding: `14px 24px`
- Content: Left (brand + tagline), Right (actions + health status)
- z-index: 100 (stays on top)

### Navigation
- **Primary**: Horizontal tabs/pills, centered or left-aligned
- Active tab: Green accent background, white text
- Inactive tab: Transparent, muted text, hover effect
- Pills: `6px border-radius`, `8px 14px padding`

### Cards
- Background: `var(--card-bg)` (slightly different from panel)
- Border: `1px solid var(--line)`
- Border-radius: `12px`
- Padding: `20px`
- Margin: `16px` between cards
- Box-shadow: None (or very subtle)

### Spacing System
- Base unit: `4px`
- Common gaps: `8px`, `12px`, `16px`, `20px`, `24px`
- Section spacing: `32px` or `40px`

---

## Interactive Elements

### Buttons

**Primary Button**:
```css
background: var(--accent);  /* neon green */
color: var(--accent-contrast);  /* black */
border: none;
padding: 8px 14px;
border-radius: 6px;
font-weight: 600;
font-size: 13px;
text-transform: uppercase;
letter-spacing: 0.3px;
min-height: 44px;  /* accessibility touch target */
transition: all 0.2s;
```
- Hover: `filter: brightness(0.95)`
- Active: `transform: scale(0.98)`

**Secondary Button**:
- Same size/shape as primary
- Background: Transparent or `var(--panel)`
- Border: `1px solid var(--line)`
- Color: `var(--fg)`

**Icon Button**:
- Square or circular
- 36px × 36px minimum
- Icon centered
- Subtle background on hover

### Inputs

**Text Input**:
```css
width: 320px;  /* or as needed */
height: 38px;
background: var(--input-bg);  /* #1a1a1a */
color: var(--fg);
border: 1px solid var(--line);
padding: 0 14px;
border-radius: 8px;
font-size: 14px;
```
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`
- Placeholder: Muted color

**Select/Dropdown**:
- Same styling as text input
- Arrow icon on right
- Dropdown menu: Panel background, line border, 8px border-radius

### Status Indicators

**Health Badge**:
- Text: Monospace, 13px
- Colors: 
  - `healthy` → green
  - `degraded` → orange
  - `down` → red
  - `unknown` → gray
- Format: `healthy (graph ready)`
- Often displayed inline with icon

**Metric Chips**:
- Small pill-shaped containers
- Background: `var(--chip-bg)`
- Border: `1px solid var(--line)`
- Padding: `4px 10px`
- Border-radius: `12px` (fully rounded ends)
- Font: 12px, medium weight

---

## Iconography

### Style
- **Line icons** (not filled/solid)
- Stroke width: `2px`
- Size: Usually `18px` or `20px`
- Color: Matches text color (white or muted)
- Library: Could use Lucide React, Heroicons, or similar

### Common Icons
- ⚡ Quick Actions
- 🔧 Settings/Config
- 📊 Dashboard/Metrics
- 🔍 Search
- 💬 Chat
- 📝 Logs/Traces
- ⚠️ Warnings/Alerts
- ✓ Success/OK
- 🔗 Links/External
- 📦 Repositories
- 🚀 Launch/Start/Run

### Icon Usage
- Usually paired with text (icon on left)
- Can be standalone in tight spaces
- Consistent sizing within a section

---

## Micro-Interactions & Animations

### Hover States
- Buttons: Slight brightness change + subtle scale
- Cards: Very subtle border color shift or shadow
- Links: Brightness filter `1.1`
- Icons: Slight opacity change or color shift

### Transitions
- Duration: `0.2s` for most interactions
- Easing: `ease-out` or `cubic-bezier(0.4, 0, 0.2, 1)`
- Properties: `background`, `color`, `transform`, `opacity`, `filter`

### Loading States
- Skeleton screens (pulse animation)
- Spinner: Circular, green accent color
- Progress bars: Green accent fill on dark background

### Focus States (Accessibility)
- Visible outline: `2px solid var(--ring)` (green glow)
- Offset: `2px`
- Never remove focus outlines

---

## Special Components

### Pipeline Summary Card (Dashboard)
**Current Implementation** (from screenshot):
- Large card on dashboard
- Title: "Pipeline Summary" or similar
- Content organized in labeled rows:
  - **HEALTH**: Shows status with color and text
  - **REPO**: Shows repo name with repos count
  - **BRANCH**: Shows current branch name
  - **CARDS**: Shows count with color indicator
  - **MCP SERVERS**: Lists server addresses
  - **AUTO-TUNE**: Shows status (enabled/disabled)
- Each row:
  - Label on left (muted, uppercase small)
  - Value on right (prominent, often with color coding)
  - Monospace font for technical values
  - Icon indicators where appropriate

### System Status Section
- Real-time indicators
- Color-coded health checks
- Monospace for technical details
- Refresh timestamp

### Quick Actions Grid
- Button grid layout
- Icons + labels
- Consistent sizing
- Hover states with slight lift effect

---

## Component Library Checklist

When building React components, ensure each has:
- ✅ Uses CSS variables from `tokens.css`
- ✅ Tailwind classes OR custom CSS that matches original
- ✅ Correct typography (font family, size, weight)
- ✅ Proper spacing (padding, margin, gaps)
- ✅ Hover/focus states
- ✅ Accessibility (ARIA labels, keyboard nav, focus outlines)
- ✅ Loading states
- ✅ Error states
- ✅ Icons (if original had them)
- ✅ Color-coded status indicators

---

## Migration Anti-Patterns (AVOID)

❌ **DON'T**:
- Use default browser styling
- Remove hover states to "simplify"
- Skip focus outlines
- Use different colors than tokens
- Change spacing dramatically
- Remove icons that aid comprehension
- Make text too small (13px minimum for body)
- Use only Tailwind defaults without customization

✅ **DO**:
- Reference original HTML/CSS for each component
- Take screenshots before/after
- Use same color tokens
- Maintain same spacing rhythm
- Keep micro-interactions
- Preserve accessibility features
- Test in dark theme (primary theme)

---

## Testing Visual Parity

### Manual Checks
1. **Side-by-side comparison**: Open old and new UI in split screen
2. **Color accuracy**: Use browser DevTools to verify colors match tokens
3. **Spacing verification**: Use DevTools ruler/grid to check padding/margins
4. **Typography check**: Verify font family, size, weight, letter-spacing
5. **Interactive states**: Test hover, focus, active states
6. **Responsive behavior**: Test at different viewport sizes

### Automated Options (Future)
- Visual regression testing (Percy, Chromatic)
- Accessibility testing (axe-core, Playwright)
- Contrast checking (WCAG AA compliance)

---

## Quick Reference: Key Visual Elements

| Element | Original Style | Must Preserve |
|---------|---------------|---------------|
| Background | Near-black `#0a0a0a` | Yes - brand identity |
| Accent | Neon green `#00ff88` | **Critical** - brand color |
| Cards | Dark with subtle border | Yes - depth hierarchy |
| Buttons | Green, uppercase, bold | Yes - call-to-action style |
| Status | Color-coded (green/orange/red) | Yes - at-a-glance info |
| Monospace | Technical data | Yes - developer aesthetic |
| Spacing | Generous, 16px+ between elements | Yes - readability |
| Hover states | Subtle brightness/scale | Yes - interactivity feedback |

---

## Next Steps for Refactor

1. **Before building any component**, find its equivalent in the original HTML
2. **Extract its styles** (inline styles + CSS classes)
3. **Convert to Tailwind + CSS variables** while matching visuals exactly
4. **Test side-by-side** with original
5. **Add to component library** with documented props/variants

This approach ensures we **preserve the gorgeous UI** while modernizing the codebase.

---

**Last Updated**: 2025-10-24  
**Maintained By**: Refactor team  
**Status**: Living document - update as patterns emerge

