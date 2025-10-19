# AGRO GUI Integration Contracts
## Module APIs and Inter-Component Communication

### Core Window APIs

#### window.Navigation (NEW - to be created)
```javascript
window.Navigation = {
  // Navigate to a tab/subtab
  navigateTo(tabId: string, subtabId?: string): void,
  
  // Register a view with lifecycle hooks
  registerView(config: {
    id: string,
    parentId?: string,  // For subtabs
    title: string,
    icon?: string,
    mount: () => void,
    unmount: () => void,
    canAccess?: () => boolean
  }): void,
  
  // Get current location
  getCurrentTab(): string,
  getCurrentSubtab(): string | null,
  
  // Breadcrumb management
  updateBreadcrumb(items: string[]): void,
  
  // Special panels
  showPanel(panelId: 'vscode' | 'grafana'): void,
  hidePanel(panelId: 'vscode' | 'grafana'): void,
  isPanelVisible(panelId: string): boolean,
  
  // Tab registry for compatibility
  aliasTab(oldId: string, newId: string): void,
  resolveTabId(id: string): string
};
```

#### window.CoreUtils (Existing - Do Not Break)
```javascript
window.CoreUtils = {
  // DOM utilities
  $: (selector: string) => Element | null,
  $$: (selector: string) => NodeList,
  
  // API wrapper
  api: {
    get(url: string): Promise<any>,
    post(url: string, data: any): Promise<any>,
    delete(url: string): Promise<any>
  },
  
  // Shared state
  state: {
    config: object,
    activeRepo: string,
    activeProfile: string
  },
  
  // Event bus
  events: {
    on(event: string, handler: Function): void,
    off(event: string, handler: Function): void,
    emit(event: string, data: any): void
  }
};
```

#### window.Grafana (Existing - Enhance)
```javascript
window.Grafana = {
  // Existing
  buildUrl(): string,
  preview(): void,
  openExternal(): void,
  
  // Add for integration
  showDashboard(): void,
  hideDashboard(): void,
  isVisible(): boolean,
  getConfig(): object,
  setConfig(config: object): void
};
```

#### window.VSCode (NEW - to be created)
```javascript
window.VSCode = {
  // Editor management
  showEditor(): void,
  hideEditor(): void,
  isVisible(): boolean,
  
  // Configuration
  getPort(): number,
  setPort(port: number): void,
  getBindMode(): string,
  setBindMode(mode: 'local' | 'network'): void,
  
  // Actions
  openInNewWindow(): void,
  copyUrl(): string,
  restart(): Promise<void>,
  
  // Health check
  checkHealth(): Promise<{status: string, message?: string}>
};
```

### Module Communication Contracts

#### Settings Management
```javascript
// Single source of truth for each setting
const SETTINGS_OWNERSHIP = {
  // Infrastructure owns these
  'OUT_DIR_BASE': 'infrastructure',
  'QDRANT_URL': 'infrastructure',
  'REDIS_URL': 'infrastructure',
  
  // RAG owns these
  'MODEL_PRIMARY': 'rag.retrieval',
  'MODEL_TEMPERATURE': 'rag.retrieval',
  'MQ_REWRITES': 'rag.retrieval',
  'FINAL_K': 'rag.retrieval',
  'TELEMETRY_PATH': 'rag.learning-ranker',
  
  // Profiles owns these
  'BUDGET_DAILY': 'profiles',
  'BUDGET_MONTHLY': 'profiles',
  'ACTIVE_PROFILE': 'profiles'
};

// Settings API
window.Settings = {
  get(key: string): any,
  set(key: string, value: any): void,
  getOwner(key: string): string,
  isReadOnly(key: string, context: string): boolean,
  subscribe(key: string, callback: Function): void
};
```

#### Event Bus Protocol
```javascript
// Standard events all modules can use
const EVENTS = {
  // Navigation
  'nav:tab-change': { tabId: string },
  'nav:subtab-change': { tabId: string, subtabId: string },
  
  // Configuration
  'config:loaded': { config: object },
  'config:saved': { changes: object },
  'config:error': { error: string },
  
  // Indexing
  'index:started': { repo: string },
  'index:progress': { percent: number, stage: string },
  'index:complete': { stats: object },
  'index:error': { error: string },
  
  // Chat
  'chat:message': { text: string, response: string },
  'chat:feedback': { rating: number, messageId: string },
  
  // Profile
  'profile:applied': { profileName: string },
  'profile:saved': { profileName: string },
  
  // System
  'health:update': { status: string, services: object },
  'theme:change': { theme: 'light' | 'dark' }
};
```

### API Endpoint Contracts

#### Configuration Endpoints
```
GET  /api/config
  Returns: Full configuration object
  Used by: All modules on load

POST /api/config
  Body: Partial config updates
  Returns: Updated config
  Used by: Settings save operations

GET  /api/config/profiles
  Returns: List of saved profiles
  Used by: Profiles tab

POST /api/config/profiles/{name}
  Body: Profile configuration
  Returns: Success status
  Used by: Profile save
```

#### RAG Endpoints
```
POST /api/rag/index
  Body: { repo: string, options: object }
  Returns: { job_id: string }
  Used by: Indexing tab

GET  /api/rag/index/status
  Returns: { running: boolean, progress: number, stage: string }
  Used by: Index status display

POST /api/rag/search
  Body: { query: string, repo: string, top_k: number }
  Returns: Array of results
  Used by: Chat, evaluation

POST /api/reranker/train
  Body: Training configuration
  Returns: { job_id: string }
  Used by: Learning Ranker tab
```

#### Infrastructure Endpoints
```
GET  /api/mcp/status
  Returns: { stdio: object, http: object }
  Used by: Infrastructure, status badges

POST /api/mcp/http/start
  Body: { port: number, host: string }
  Returns: Success status
  Used by: Infrastructure MCP control

GET  /api/services/status
  Returns: Status of all services
  Used by: Infrastructure, Dashboard
```

### Data Flow Rules

#### Settings Persistence
1. All settings changes go through Settings API
2. Settings API checks ownership before allowing writes
3. Read-only contexts can display but not edit
4. Changes trigger 'config:saved' event
5. All modules reload relevant data on this event

#### Profile Application
1. User clicks "Apply Profile" in Profiles tab
2. Profile system reads profile configuration
3. For each setting in profile:
   - Check if owner allows override
   - Apply setting via Settings API
4. Emit 'profile:applied' event
5. All affected modules reload

#### Index Workflow
1. User clicks "Index Now" in RAG > Indexing
2. Indexing module calls POST /api/rag/index
3. Start polling GET /api/rag/index/status
4. Emit 'index:progress' events
5. On completion, emit 'index:complete'
6. Chat and Evaluate tabs reload available indexes

### Compatibility Requirements

#### Backward Compatibility (Phase 1-2)
- Old tab IDs must resolve to new locations
- Old event names must trigger new events
- Old API calls must redirect to new endpoints
- Settings in old locations must read from new source

#### Migration Path
```javascript
// Tab ID resolution
Navigation.aliasTab('tab-devtools-editor', 'tab-vscode');
Navigation.aliasTab('tab-metrics', 'tab-grafana');

// Event forwarding
CoreUtils.events.on('tab-switched', (data) => {
  CoreUtils.events.emit('nav:tab-change', {
    tabId: Navigation.resolveTabId(data.tab)
  });
});

// Settings compatibility
window.getConfigValue = (key) => {
  console.warn(`Deprecated: Use Settings.get('${key}')`);
  return Settings.get(key);
};
```

### Testing Contracts

#### Module Health Checks
Each module must expose:
```javascript
window.{ModuleName} = {
  // Required for health check
  _health: {
    initialized: boolean,
    dependencies: string[],
    criticalFunctions: string[]
  },
  
  // Test helper
  _test: {
    reset(): void,
    mockData: object
  }
};
```

#### Smoke Test Requirements
- Each module must load without errors
- Each module's critical functions must be callable
- Each module must handle missing dependencies gracefully

### Security Contracts

#### Sensitive Data Handling
- API keys must never be logged
- Secrets must use password input types
- Export functions must exclude sensitive fields
- Token refresh must be automatic

#### Input Validation
- All user inputs must be sanitized
- File paths must be validated
- API responses must be schema-validated
- Error messages must not expose internals

### Performance Contracts

#### Loading Requirements
- Core modules load synchronously
- Feature modules load on demand
- Heavy modules use lazy loading
- Initial render < 500ms

#### Memory Management
- Event listeners must be cleaned up
- Intervals/timeouts must be cleared
- Large data must be paginated
- Caches must have size limits

### Rollback Contract

#### Emergency Rollback Procedure
```javascript
// In case of critical failure
window.EmergencyRollback = {
  // Revert to old navigation
  revertNavigation(): void,
  
  // Restore old tab IDs
  restoreCompatibility(): void,
  
  // Clear new features
  disableNewFeatures(): void,
  
  // Validation
  validateRollback(): boolean
};
```

### Version Management

#### Feature Flags
```javascript
window.FeatureFlags = {
  NEW_NAVIGATION: false,  // Enable new nav
  SPLIT_HTML: false,      // Enable HTML splitting
  VS_CODE_TAB: true,      // Show VS Code as tab
  GRAFANA_TAB: true,      // Show Grafana as tab
  DEBUG_MODE: false       // Show debug info
};
```

