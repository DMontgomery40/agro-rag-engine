import { useState, useEffect } from 'react';
import { useHealthStore } from '@/stores';

// Navigation components
import { TabBar } from './components/Navigation/TabBar';
import { TabRouter } from './components/Navigation/TabRouter';

// Sidepanel component
import { Sidepanel } from './components/Sidepanel';

// Hooks
import { useAppInit, useModuleLoader, useApplyButton } from '@/hooks';

function App() {
  const [healthDisplay, setHealthDisplay] = useState('—');
  const { status, checkHealth } = useHealthStore();

  // Initialize hooks
  const { isInitialized, initError } = useAppInit();
  const { modulesLoaded, loadError, loadProgress } = useModuleLoader();
  const { handleApply, isDirty, isSaving, saveError } = useApplyButton();

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Poll health status
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  useEffect(() => {
    if (status) {
      const isOk = status.ok || status.status === 'healthy';
      const timestamp = status.ts ? new Date(status.ts).toLocaleTimeString() : new Date().toLocaleTimeString();
      setHealthDisplay(isOk ? `OK @ ${timestamp}` : 'Not OK');
    }
  }, [status]);

  // Load legacy modules for backward compatibility with existing tabs
  // This ensures window.* globals are available for tabs that haven't been refactored yet
  useEffect(() => {
    const loadModules = async () => {
      console.log('[App] DOM ready, loading legacy modules...');

      try {
        // Load in dependency order
        // 1. Core utilities (must load first)
        await import('./modules/fetch-shim.js');
        await import('./modules/core-utils.js');
        await import('./modules/api-base-override.js');

        // 2. UI helpers and theme (needed by many modules)
        await import('./modules/ui-helpers.js');
        await import('./modules/theme.js');

        // 3. Test instrumentation (for debugging)
        await import('./modules/test-instrumentation.js');

        // 4. Navigation and tabs - REMOVED, now using React Router
        // Legacy navigation modules replaced by TabBar/TabRouter components

        // 5. Search and tooltips (UI enhancements)
        await import('./modules/search.js');
        await import('./modules/tooltips.js');

        // 6. Configuration and health (backend integration)
        await import('./modules/config.js');
        await import('./modules/health.js');

        // 7. Feature modules (ensure feedback tools load before chat)
        await import('./modules/reranker.js');
        await Promise.all([
          import('./modules/git-hooks.js'),
          import('./modules/git-commit-meta.js'),
          import('./modules/keywords.js'),
          import('./modules/autotune.js'),
          import('./modules/editor.js'),
          import('./modules/editor-settings.js'),
          import('./modules/secrets.js'),
          import('./modules/model_flows.js'),
          import('./modules/index_status.js'),
          import('./modules/mcp_rag.js'),
          import('./modules/mcp_server.js'),
          import('./modules/index_profiles.js'),
          import('./modules/indexing.js'),
          import('./modules/simple_index.js'),
          import('./modules/docker.js'),
          import('./modules/grafana.js'),
          import('./modules/vscode.js'),
          import('./modules/onboarding.js'),
          import('./modules/index-display.js'),
          import('./modules/cards.js'),
          import('./modules/cards_builder.js'),
          import('./modules/cost_logic.js'),
          import('./modules/storage-calculator-template.js'),
          import('./modules/storage-calculator.js'),
          import('./modules/profile_logic.js'),
          import('./modules/profile_renderer.js'),
          import('./modules/autoprofile_v2.js'),
          // Temporarily disabled: golden_questions.js has bindGoldenQuestions error
          // React components in EvaluateSubtab.tsx provide full UI functionality
          // import('./modules/golden_questions.js'),
          // import('./modules/eval_runner.js'),
          import('./modules/eval_history.js'),
          // Chat is React-native now; keep legacy reranker feedback only
          import('./modules/error-helpers.js'),
          import('./modules/layout_fix.js'),
          import('./modules/live-terminal.js'),
          import('./modules/trace.js'),
          import('./modules/alerts.js'),
          import('./modules/ux-feedback.js'),
          import('./modules/langsmith.js'),
          import('./modules/dino.js')
        ]);

        // 8. Main app coordinator (must load last)
        await import('./modules/app.js');

        console.log('[App] All legacy modules loaded successfully');

        // Dispatch a custom event so modules know React is ready
        window.dispatchEvent(new Event('react-ready'));
      } catch (err) {
        console.error('[App] Error loading modules:', err);
      }
    };

    // Give React a tick to render before loading modules
    setTimeout(loadModules, 100);
  }, []);

  // Show loading screen while modules are loading
  // TEMPORARY: Skip loading check to debug
  if (false && (!modulesLoaded || !isInitialized)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--fg)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--line)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <div style={{ fontSize: '14px', color: 'var(--fg-muted)' }}>
          {loadProgress || 'Loading application...'}
        </div>
        {(loadError || initError) && (
          <div style={{ color: 'var(--err)', fontSize: '12px', marginTop: '12px', maxWidth: '400px', textAlign: 'center' }}>
            {loadError || initError}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <button className="mobile-nav-toggle" id="mobile-nav-toggle" aria-label="Toggle navigation">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1>
          <span className="brand">AGRO</span>
          <span className="tagline">Another Good RAG Option</span>
        </h1>
        <div className="top-actions">
          <button
            id="btn-learn"
            title="Open Help & Glossary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.location.hash = '#/dashboard?subtab=help'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Learn</span>
          </button>
          <input id="global-search" type="search" placeholder="Search settings (Ctrl+K)" />
          <div id="search-results"></div>
          <select
            id="theme-mode"
            name="THEME_MODE"
            title="Theme Mode"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '6px 8px',
              borderRadius: '6px'
            }}
          >
            <option value="auto">Auto</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <button id="btn-health" onClick={checkHealth}>Health</button>
          <span id="health-status">{healthDisplay}</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="layout">
        <div className="resize-handle"></div>
        <div className="content">
          {/* Tab Bar - React Router navigation */}
          <TabBar />

          {/* Routes - All tab routing */}
          <TabRouter />
        </div>

        {/* Sidepanel */}
        <div className="sidepanel" id="sidepanel">
          <div className="sidepanel-header">
            <h3 className="sidepanel-title" id="sidepanel-title">Settings</h3>
          </div>
          <div id="sidepanel-content" style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
            {/* React Sidepanel component with all widgets */}
            <Sidepanel />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
