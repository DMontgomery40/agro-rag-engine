# Agent 5: Quick Test Guide
**Demo File:** `/Users/davidmontgomery/agro-rag-engine/MICRO_INTERACTIONS_DEMO.html`

## Open Demo
```bash
open /Users/davidmontgomery/agro-rag-engine/MICRO_INTERACTIONS_DEMO.html
```

---

## 60-Second Test Checklist

### Visual Check (10 seconds)
- [ ] Page has colors and styling (not plain HTML)
- [ ] Fonts look good (not just Times New Roman)

### Button Test (10 seconds)
- [ ] Hover button → lifts up slightly
- [ ] Click button → presses down, ripple appears

### Tab Test (10 seconds)
- [ ] Click Tab 2 → content slides in from right (NOT instant)
- [ ] Click Tab 3 → same smooth animation

### Input Test (10 seconds)
- [ ] Click in text input → blue glow ring appears
- [ ] Click "Mark Invalid" → input shakes and turns yellow

### Progress Test (20 seconds)
- [ ] Click "Simulate Progress"
- [ ] Watch: Container bounces? Bar has gradient? Shine moves?
- [ ] Bar fills to 100%?

### DevTools Check (10 seconds)
- [ ] Press F12 → Console tab
- [ ] Any red errors? (If yes, copy error message)

---

## What To Report Back

**If everything works:**
"All features work as claimed. [Attach screenshot of progress bar with gradient]"

**If something's broken:**
"Feature X doesn't work. Here's what I see: [Description]
DevTools Console shows: [Error message]
Screenshot: [Attach]"

---

## Quick Screenshot Locations

Take these 3 screenshots if all works:
1. Button hover state (mouse over button, showing lift)
2. Progress bar mid-fill (showing gradient + shine)
3. DevTools Console (showing no errors)

---

## Common Issues & Quick Fixes

**Issue:** Page is unstyled (plain HTML)
**Cause:** tokens.css didn't load
**Check:** DevTools Network tab → Look for 404 on tokens.css

**Issue:** Animations don't happen
**Cause:** CSS not loading or JavaScript error
**Check:** DevTools Console → Look for red errors

**Issue:** Colors are wrong/missing
**Cause:** CSS variables not defined in tokens.css
**Check:** DevTools Elements → Computed styles → Look for `var(--accent)`

---

## Performance Test (Optional)

1. Open DevTools → Performance tab
2. Click red record button
3. Interact with page (click buttons, switch tabs)
4. Stop recording (10 seconds total)
5. Look at FPS counter → Should show 60fps
6. Screenshot the timeline

---

**Time Required:** 1-2 minutes for basic test, 5 minutes for thorough test
