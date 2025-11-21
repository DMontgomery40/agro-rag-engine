# Agent Docs Structure

**Rule**: Use `current/` and `history/` subfolders to keep docs organized!

---

## Directory Structure

```
agent_docs/
├── backend/
│   ├── README.md (start here)
│   ├── current/          ← ACTIVE assignments & current work
│   └── history/          ← Completed work, past incidents, reference guides
├── ui/
│   ├── README.md (start here)
│   ├── current/          ← ACTIVE assignments & current work
│   └── history/          ← Completed slices, past instructions
├── shared/
│   ├── README.md (start here)
│   ├── current/          ← Active status, coordination, standards
│   └── history/          ← Merge incidents, worktree status, completed strategies
└── runbooks/             ← Step-by-step guides (no current/history split needed)
```

---

## What Goes Where

### `/current/` - Active work ONLY
- Current slice assignments
- Active coordination instructions
- Live status updates
- Standards being enforced NOW

**When slice completes**: Move to `/history/`

### `/history/` - Completed & reference
- Completed slice instructions
- Resolved incidents
- Past status reports
- Reference guides (still useful for patterns)

**Purpose**: New agents can see what was done and why

---

## Example (Current State)

**backend/current/**:
- `SLICE_3_ASSIGNMENT.md` ← Backend agent starts here

**backend/history/**:
- `SLICE_1_2_INSTRUCTIONS.md` (completed)
- `search_rag_extraction_guide.md` (reference)
- Incident reports (resolved)

**ui/current/**:
- `SLICE_2_ASSIGNMENT.md` ← Frontend agent starts here
- `design_tokens.md` (active standard)

**ui/history/**:
- `SLICE_1_INSTRUCTIONS.md` (completed)
- Past incident reports

**shared/current/**:
- `DELEGATION_INSTRUCTIONS_2025_10_24.md` (active coordination)
- `STATUS_2025_10_24_READY_FOR_SLICES_2_3.md` (current status)
- `PROGRESS_UI_BACKEND_MIGRATION.md` (update as we go)
- `logging_and_error_handling.md` (active standard)
- `ARCHITECTURE_DECISION_2025_10_24.md` (still relevant)

**shared/history/**:
- Merge incident docs (resolved but good reference)
- Worktree status (completed)
- Pre-merge checklists (done)

---

## When to Move Docs

**current/ → history/**:
- Slice completes
- Incident resolves
- Status becomes outdated

**Keep in current/**:
- Active assignments
- Enforced standards
- Live coordination

---

**This keeps each directory clean with ~5-10 files in `current/` instead of 20+**

