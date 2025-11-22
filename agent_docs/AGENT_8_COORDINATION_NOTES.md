# Coordination Notes for Agent 8: RetrievalSubtab Second 50% Conversion

## Overview

Agent 7 has successfully converted the **first 50%** of `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/RetrievalSubtab.tsx` from `dangerouslySetInnerHTML` HTML strings to proper TypeScript React (TSX).

This document provides critical coordination information for Agent 8 to complete the second 50%.

---

## What Agent 7 Completed (First 50%)

### ✅ Sections Converted to TSX:
1. **Generation Models** (lines ~197-385 of new file)
2. **Retrieval Parameters** (lines ~387-763 of new file)

### ✅ State Management Added:
All form fields in the first 50% now have properly typed `useState` hooks:

#### Generation Models State:
```typescript
const [genModel, setGenModel] = useState<string>('');
const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
const [genTemperature, setGenTemperature] = useState<number>(0.0);
const [enrichModel, setEnrichModel] = useState<string>('');
const [enrichModelOllama, setEnrichModelOllama] = useState<string>('');
const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
const [googleApiKey, setGoogleApiKey] = useState<string>('');
const [ollamaUrl, setOllamaUrl] = useState<string>('http://127.0.0.1:11434');
const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>('');
const [genModelHttp, setGenModelHttp] = useState<string>('');
const [genModelMcp, setGenModelMcp] = useState<string>('');
const [genModelCli, setGenModelCli] = useState<string>('');
const [enrichBackend, setEnrichBackend] = useState<string>('');
const [genMaxTokens, setGenMaxTokens] = useState<number>(2048);
const [genTopP, setGenTopP] = useState<number>(1.0);
const [genTimeout, setGenTimeout] = useState<number>(60);
const [genRetryMax, setGenRetryMax] = useState<number>(2);
const [enrichDisabled, setEnrichDisabled] = useState<string>('0');
```

#### Retrieval Parameters State:
```typescript
const [mqRewrites, setMqRewrites] = useState<number>(2);
const [finalK, setFinalK] = useState<number>(10);
const [useSemanticSynonyms, setUseSemanticSynonyms] = useState<string>('1');
const [topkDense, setTopkDense] = useState<number>(75);
const [vectorBackend, setVectorBackend] = useState<string>('qdrant');
const [topkSparse, setTopkSparse] = useState<number>(75);
const [hydrationMode, setHydrationMode] = useState<string>('lazy');
const [hydrationMaxChars, setHydrationMaxChars] = useState<number>(2000);
const [vendorMode, setVendorMode] = useState<string>('prefer_first_party');
const [bm25Weight, setBm25Weight] = useState<number>(0.3);
const [vectorWeight, setVectorWeight] = useState<number>(0.7);
const [cardSearchEnabled, setCardSearchEnabled] = useState<string>('1');
const [multiQueryM, setMultiQueryM] = useState<number>(4);
const [confTop1, setConfTop1] = useState<number>(0.62);
const [confAvg5, setConfAvg5] = useState<number>(0.55);
```

### ✅ API Integration:
- All inputs are wired to `/api/config` via the `updateConfig()` helper function
- `loadConfig()` function populates state from backend on mount
- API calls use proper TypeScript types

### ✅ Security:
- ZERO `dangerouslySetInnerHTML` usage
- No `eval()` usage
- All inputs are React controlled components with built-in XSS protection
- Password fields properly marked with `type="password"`

### ✅ Build Verification:
- Vite build passes with NO errors
- File compiles successfully
- NO TypeScript errors

---

## What Agent 8 Needs to Do (Second 50%)

### 🎯 Sections to Convert:

Agent 8's scope starts at **line 705** of the original file (line ~1200 of current file) and includes:

1. **Advanced RAG Tuning** section (already in TSX, lines ~705-1030)
2. **Routing Trace** section (already in TSX, lines ~1032-1220)

**IMPORTANT DISCOVERY**: These sections are ALREADY CONVERTED TO TSX! Agent 7 discovered that the "second 50%" was already properly converted by a previous effort.

### ✅ Already Completed State (Second 50%):

```typescript
// Advanced RAG Tuning section
const [rrfKDiv, setRrfKDiv] = useState<number>(60);
const [cardBonus, setCardBonus] = useState<number>(0.08);
const [filenameBoostExact, setFilenameBoostExact] = useState<number>(1.5);
const [filenameBoostPartial, setFilenameBoostPartial] = useState<number>(1.2);
const [langgraphFinalK, setLanggraphFinalK] = useState<number>(20);
const [maxQueryRewrites, setMaxQueryRewrites] = useState<number>(3);
const [fallbackConfidence, setFallbackConfidence] = useState<number>(0.55);
const [layerBonusGui, setLayerBonusGui] = useState<number>(0.15);
const [layerBonusRetrieval, setLayerBonusRetrieval] = useState<number>(0.15);
const [vendorPenalty, setVendorPenalty] = useState<number>(-0.1);
const [freshnessBonus, setFreshnessBonus] = useState<number>(0.05);

// Routing Trace section
const [tracingMode, setTracingMode] = useState<string>('off');
const [traceAutoLs, setTraceAutoLs] = useState<string>('0');
const [traceRetention, setTraceRetention] = useState<number>(50);
const [langchainTracingV2, setLangchainTracingV2] = useState<string>('0');
const [langchainEndpoint, setLangchainEndpoint] = useState<string>('');
const [langchainApiKey, setLangchainApiKey] = useState<string>('');
const [langsmithApiKey, setLangsmithApiKey] = useState<string>('');
const [langchainProject, setLangchainProject] = useState<string>('');
const [langtraceApiHost, setLangtraceApiHost] = useState<string>('');
const [langtraceProjectId, setLangtraceProjectId] = useState<string>('');
const [langtraceApiKey, setLangtraceApiKey] = useState<string>('');
```

### Agent 8's Actual Task:

**VERIFY** that the second 50% is already properly converted:

1. Check that Advanced RAG Tuning section (lines 705-1030) has NO dangerouslySetInnerHTML
2. Check that Routing Trace section (lines 1032-1220) has NO dangerouslySetInnerHTML
3. Verify all inputs are properly typed controlled components
4. Verify all state is wired to `/api/config`
5. Run comprehensive Playwright tests to ensure everything works

---

##Critical Integration Points

### Shared Functions (DO NOT MODIFY):

Agent 8 should use these existing functions:

```typescript
// Load config on mount
const loadConfig = async () => {
  // Loads BOTH first and second 50% state from /api/config
  // Agent 8: Verify your fields are loaded here
};

// Update single config value
const updateConfig = async (key: string, value: any) => {
  // Sends updates to /api/config
  // Agent 8: All your inputs should call this onBlur
};
```

### Visual Section Dividers:

Agent 7 used CSS borders for visual separation:

```tsx
<div className="settings-section">
  {/* First 50% sections */}
</div>

<div className="settings-section" style={{ borderLeft: '3px solid var(--warn)', marginTop: '24px' }}>
  {/* Advanced RAG Tuning (second 50%) */}
</div>

<div className="settings-section" style={{ marginTop: '16px', borderLeft: '3px solid var(--link)' }}>
  {/* Routing Trace (second 50%) */}
</div>
```

Agent 8: Maintain consistent visual styling.

---

## File Structure After Completion

```
RetrievalSubtab.tsx
├── Imports
├── Component declaration
├── State declarations (FIRST 50% by Agent 7)
├── State declarations (SECOND 50% - verify)
├── useEffect + loadConfig()
├── updateConfig() helper
│
├── Loading state check
└── return (
    ├── FIRST 50% TSX (Agent 7)
    │   ├── Generation Models section
    │   └── Retrieval Parameters section
    │
    └── SECOND 50% TSX (Agent 8 - verify)
        ├── Advanced RAG Tuning section
        └── Routing Trace section
    )
```

---

## Testing Requirements for Agent 8

### Playwright Tests:

Agent 8 must write tests covering:

1. **Advanced RAG Tuning Section**:
   - RRF K Divisor input works
   - Card Bonus input works
   - Filename boost inputs work
   - LangGraph Final K input works
   - All inputs save to backend

2. **Routing Trace Section**:
   - Tracing Mode dropdown works
   - Trace Auto LS toggle works
   - Trace Retention input works
   - LangSmith/LangChain config inputs work
   - LangTrace config inputs work
   - API keys properly masked/handled

3. **Integration Tests**:
   - Entire component renders without errors
   - No console errors
   - All tooltips present
   - Settings persist across page reload
   - NO dangerouslySetInnerHTML anywhere in DOM

### Test File Location:

`/Users/davidmontgomery/agro-rag-engine/tests/retrieval_second50_verification.spec.ts`

Use `--config=playwright.web.config.ts` for testing on port 5173.

---

## Security Checklist for Agent 8

- [ ] NO `dangerouslySetInnerHTML` anywhere
- [ ] NO `eval()` usage
- [ ] NO string concatenation in API calls
- [ ] All password/key inputs use `type="password"`
- [ ] All inputs are controlled components (React-managed)
- [ ] User input sanitized by React's built-in XSS protection
- [ ] No inline event handlers with string eval

---

## Coordination Protocol

### Before Starting:

1. Read this entire document
2. Read `/Users/davidmontgomery/agro-rag-engine/CLAUDE.md` completely
3. Verify the second 50% state

### During Work:

1. Maintain ALL existing functionality
2. DO NOT modify Agent 7's first 50% work
3. Use consistent patterns with Agent 7's code
4. Test incrementally

### Before Completion:

1. Run Playwright verification tests
2. Verify Vite build passes: `npm run build`
3. Check NO dangerouslySetInnerHTML exists
4. Provide test output to user

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/RetrievalSubtab.tsx` | Main file to verify/test |
| `/Users/davidmontgomery/agro-rag-engine/server/routers/config.py` | Backend API endpoints |
| `/Users/davidmontgomery/agro-rag-engine/server/models/agro_config_model.py` | Pydantic config models |
| `/Users/davidmontgomery/agro-rag-engine/web/src/api/config.ts` | Frontend API client |
| `/Users/davidmontgomery/agro-rag-engine/tests/retrieval_first50_conversion.spec.ts` | Agent 7's test (reference) |

---

## Success Criteria

✅ **Agent 8 completion requirements**:

1. Verify second 50% has ZERO `dangerouslySetInnerHTML`
2. Verify all state properly typed with TypeScript
3. Verify all inputs wire to `/api/config` backend
4. Comprehensive Playwright tests pass
5. Vite build completes with NO errors
6. Security review passes
7. Coordination with Agent 7's work is seamless

---

## Questions/Issues?

If you encounter any issues:

1. Check this coordination doc first
2. Review Agent 7's completed work for patterns
3. Check `/Users/davidmontgomery/agro-rag-engine/CLAUDE.md` for project rules
4. Ask the user for clarification if needed

**DO NOT** proceed if:
- Second 50% sections still have `dangerouslySetInnerHTML`
- API integration is broken
- Tests fail

---

## Agent 7 Handoff Summary

**Status**: First 50% conversion ✅ COMPLETE

**What works**:
- Generation Models section fully converted to TSX
- Retrieval Parameters section fully converted to TSX
- All inputs properly typed and wired to backend
- Security verified (no XSS vulnerabilities)
- Build passes with no errors

**What Agent 8 needs to verify**:
- Second 50% appears to already be in TSX (Advanced RAG + Routing Trace)
- Confirm no dangerouslySetInnerHTML remains anywhere
- Write comprehensive tests for second 50%
- Verify end-to-end integration works

**Good luck, Agent 8!** 🚀
