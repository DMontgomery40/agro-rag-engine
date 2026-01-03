# Code Style

Universal code style guidelines for the project.

## No Stubs or Placeholders

**Never add stubs, TODOs, placeholders, or simulated functionality.**

- All backend must be fully wired to GUI via Pydantic
- All GUI must be fully wired to backend via Pydantic + Zustand
- Every feature must be complete and working

## Fix, Don't Delete

**Never remove broken features or settings—fix them instead.**

- If GUI settings are broken, fix the wiring
- If a component doesn't work, repair it
- All settings MUST appear in the GUI (accessibility requirement)
- Ask user where GUI settings should go if unclear

## No Over-Engineering

Keep solutions simple and focused:
- Only make changes that are directly requested
- Don't add features beyond what was asked
- Don't add unnecessary abstractions
- Don't design for hypothetical future requirements
- Three similar lines > premature abstraction

## Language Standards

- **Backend**: Python 3.11+
- **Frontend**: TypeScript only (no new `.js` files)
- Legacy JS in `/web/modules` is being phased out

## TypeScript Requirements

- Use TypeScript for all new frontend code
- When modifying legacy JS, refactor to TypeScript
- Archive refactored files to `/web/_archived`

## File Organization

- Use relative paths, never hardcoded absolute paths
- Keep imports organized (stdlib → external → internal)
- One component per file (React)

## Comments

- Don't add comments to code you didn't change
- Only add comments where logic isn't self-evident
- Don't add docstrings to unchanged code

## UI Requirements

- New UI elements MUST have tooltips (see `useTooltips.ts`)
- All new settings must appear in GUI
- Don't add features without asking user first
