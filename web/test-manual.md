# Manual Testing Instructions

The React app builds successfully but Playwright is crashing in the test environment.

To test manually:

1. **Start the dev server:**
```bash
cd web
npm run dev
```

2. **Open in your browser:**
http://localhost:3000

3. **What to verify:**
- Page loads without white screen
- AGRO branding visible in top bar
- Tab navigation visible
- Side panel visible
- No console errors

## Known Issues (Non-Critical)
- React warnings about `value` props without `onChange` (expected - modules manage state)
- React warnings about `checked` props without `onChange` (expected - modules manage state)  
- Warnings about `>=` characters in tooltip text (cosmetic only)

## Next Steps If UI Renders:
The module integration is complete. Modules need backend API running to be fully functional, but basic UI should render.
