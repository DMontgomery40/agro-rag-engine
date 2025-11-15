# ___REAL_STUBS_AND_ISSUES___.md

**Generated:** 2025-11-14
**Purpose:** Identify ACTUAL incomplete/stub code (not just file size)
**Priority:** HIGH - These must be fixed for production

---

## React Components with Clicks but No Backend Calls

### 🔴 CRITICAL - Interactive but Not Functional

1. **AdminSubtabs.tsx**
   - Has click handlers
   - NO fetch calls
   - Status: Navigation only, may be OK

2. **GitIntegrationSubtab.tsx**  
   - Has buttons/inputs
   - NO backend integration
   - Status: STUB - needs /api/git/* endpoints

3. **CardDisplay.tsx**
   - Has card click handlers
   - NO backend calls
   - Status: Display only component, may be OK

4. **ContainerCard.tsx + DockerContainerCard.tsx**
   - Have start/stop/restart buttons
   - NO fetch to Docker API
   - Status: STUB - needs /api/docker/* endpoints

5. **EditorPanel.tsx**
   - Has 3 buttons: Open Window, Copy URL, Restart
   - NO backend calls for health check or restart
   - Status: PARTIALLY STUB - needs /api/editor/* endpoints

6. **EditorSettings.tsx**
   - Has save button
   - NO backend call
   - Status: STUB

7. **EvaluationRunner.tsx**
   - Has run evaluation button
   - NO /api/eval/* calls
   - Status: STUB - critical functionality missing

8. **HistoryViewer.tsx**
   - Has view/clear buttons
   - NO backend calls
   - Status: STUB

---

## Hardcoded Values That Should Come From Config

### 🟡 MEDIUM PRIORITY - Accessibility Issues

1. **ChatInterface.tsx**
   ```typescript
   const [model, setModel] = useState('gpt-4o-mini');
   ```
   - Should load from /api/config → GEN_MODEL
   - Should update when config changes
   - User has no way to see actual model in use

2. **Sidepanel.tsx (2 models)**
   ```typescript
   const [costModel, setCostModel] = useState('gpt-4o-mini');
   const [costEmbeddingModel, setCostEmbeddingModel] = useState('text-embedding-3-small');
   ```
   - Should load from /api/config
   - Cost calculations would be wrong with hardcoded models

3. **Layout/Sidepanel.tsx (2 models)**
   ```typescript
   const [model, setModel] = useState('gpt-4o-mini');
   const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
   ```
   - Duplicates of above - code duplication issue

---

## Backend Hardcoded Values

### 🔴 CRITICAL - Must Be Configurable

1. **indexer/index_repo.py**
   - Line 200: `model='text-embedding-3-large'` (HARDCODED)
   - Line 400: `model='text-embedding-3-large'` (HARDCODED)
   - Should read from env: EMBEDDING_MODEL
   - Blocks support for other models (Voyage, BGE, etc.)

2. **indexer/index_repo.py - Vector DB**
   - Qdrant client hardcoded throughout
   - No abstraction for ChromaDB, Weaviate, etc.
   - Would require major refactor to add new DB

3. **retrieval/rerank.py**
   - Line 32: `DEFAULT_MODEL = 'cross-encoder/ms-marco-MiniLM-L-12-v2'`
   - Hardcoded default (though overridable by env)
   - Should be in config, not code

---

## Missing Configuration UIs

### 🔴 CRITICAL - No Way To Configure

1. **Embedding Configuration**
   - NO UI to choose embedding model
   - NO UI to set dimensions
   - NO UI to set precision (float32/float16/int8)
   - Dashboard SHOWS these but you can't CHANGE them
   - Violates ADA accessibility

2. **Vector Database Selection**
   - Qdrant is only option
   - NO UI to switch to Chroma/Weaviate
   - NO backend abstraction layer

3. **Docker Container Management**
   - Buttons exist in UI
   - NO /api/docker/* endpoints in backend
   - Can't actually start/stop containers from UI

---

## Code Duplication Issues

### 🟡 MAINTAINABILITY

1. **Two Sidepanel components**
   - `web/src/components/Sidepanel.tsx` (782 lines)
   - `web/src/components/Layout/Sidepanel.tsx` (different impl)
   - Which one is used?
   - Why two implementations?

2. **Multiple Dashboard components**
   - `web/src/pages/Dashboard.tsx` (new modular)
   - `web/src/pages/Dashboard-old.tsx` (backup)
   - `web/src/components/Dashboard/SystemStatus.tsx`
   - `web/src/components/Dashboard/SystemStatusPanel.tsx`
   - Cleanup needed

---

## Recommended Actions

### Immediate (Break production if not fixed)
1. Wire EditorPanel to /api/editor/* for health/restart
2. Load all model names from /api/config, not hardcoded
3. Fix duplicate Sidepanel components

### High Priority (ADA compliance)
4. Add embedding model/dimension/precision UI to Indexing tab
5. Make Dashboard embedding values link to Indexing (not Retrieval)
6. Add tooltips explaining dimension/precision tradeoffs
7. Wire Docker buttons to actual backend

### Medium Priority (Future-proofing)
8. Add vector DB abstraction layer
9. Make embedding model configurable in indexer
10. Add support for alternative embedding providers

---

**Status:** 37 commits to development
**Next:** Systematically fix all real stubs and hardcoded values
