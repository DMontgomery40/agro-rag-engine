# Valid Documentation Files ONLY

## These are the ONLY docs files that actually exist in /docs/

Use ONLY these filenames. All other references are BROKEN.

### Existing Docs (18 files)
- `ALERTING.md`
- `API_GUI.md`
- `API_REFERENCE.md` ✅ (Main API docs - USE THIS for API-related errors)
- `CLI_CHAT.md`
- `CODEX_MCP_SETUP.md`
- `CONTRIBUTING.md`
- `GEN_MODEL_COMPARISON.md`
- `LANGSMITH_SETUP.md`
- `LEARNING_RERANKER.md`
- `MCP_README.md` ✅ (USE THIS for MCP errors, not /docs/MCP.md)
- `MODEL_RECOMMENDATIONS.md`
- `PERFORMANCE_AND_COST.md`
- `QUICKSTART_MCP.md`
- `README_INDEX.md`
- `REMOTE_MCP.md`
- `SETTINGS_UI_PROMPT.md`
- `TELEMETRY_SETUP.md`
- `TOOLTIP_TODO.md`

## DO NOT USE - These are BROKEN (were hallucinated)
- ❌ `/docs/INFRASTRUCTURE.md` - DOES NOT EXIST
- ❌ `/docs/EVALUATION.md` - DOES NOT EXIST
- ❌ `/docs/INDEXING.md` - DOES NOT EXIST
- ❌ `/docs/CONFIGURATION.md` - DOES NOT EXIST
- ❌ `/docs/TROUBLESHOOTING.md` - DOES NOT EXIST
- ❌ `/docs/MONITORING.md` - DOES NOT EXIST
- ❌ `/docs/WEBHOOKS.md` - DOES NOT EXIST
- ❌ `/docs/REPOSITORIES.md` - DOES NOT EXIST
... (80+ more broken docs)

## Strategy Going Forward

### SAFE Link Types (Always OK):
1. **External links** (https://docs.docker.com, https://redis.io, etc.) - Verified official docs
2. **API endpoints** (/api/health, /api/config, etc.) - Internal API endpoints
3. **Verified internal docs** - ONLY from the 18 files above

### FORBIDDEN Link Types:
- ANY `/docs/` reference NOT in the list of 18 valid files
- Speculative documentation paths
- Features that haven't been documented yet

## Error Message Structure (Going Forward)

Each error should have:
1. **Title** - Clear problem statement
2. **Message** - Technical details
3. **Causes** - 3-4 common reasons (no links needed)
4. **Fixes** - 3-4 actionable steps (no links needed)
5. **Links** - OPTIONAL and ONLY if truly helpful:
   - External link to official third-party docs (https://...)
   - OR verified internal doc from the 18 valid files
   - OR API endpoint reference
   - DO NOT include a link if you're not 100% sure it exists

## Verification Checklist Before Adding Any Link:
```
- [ ] Is this an https:// external link to official docs? (SAFE)
- [ ] Is this an /api/ endpoint? (SAFE)
- [ ] Is this a /docs/ link? If yes:
  - [ ] Does it match EXACTLY one of the 18 valid files?
  - [ ] Does the file exist? (Verify with `ls /docs/`)
  - [ ] Have I checked /docs/API_REFERENCE.md for API-related content?
  - [ ] Have I checked /docs/MCP_README.md for MCP-related content?
```

## How to Check if a Doc Exists:
```bash
ls /Users/davidmontgomery/agro-rag-engine/docs/FILENAME.md
```

If it returns the file, it's VALID. If it says "No such file", it's BROKEN.

## This Is Critical
Users clicking broken links will:
- Get 404 errors
- Lose trust in the system
- Think the application is broken
- Get frustrated

**ONLY use links you have personally verified exist.**
