import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useHealthStore } from '@/stores';

// Pages
import Dashboard from './pages/Dashboard';
import Docker from './pages/Docker';

// Placeholder components for other tabs (to be refactored)
import ChatTab from './components/tabs/ChatTab';
import VSCodeTab from './components/tabs/VSCodeTab';
import GrafanaTab from './components/tabs/GrafanaTab';
import RAGTab from './components/tabs/RAGTab';
import ProfilesTab from './components/tabs/ProfilesTab';
import InfrastructureTab from './components/tabs/InfrastructureTab';
import AdminTab from './components/tabs/AdminTab';

function App() {
  const [healthDisplay, setHealthDisplay] = useState('—');
  const { status, checkHealth } = useHealthStore();

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
      console.log('[App] MODULES DISABLED FOR DEBUGGING');
      return; // TEMP: Skip all module loading to test if React works

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

        // 4. Navigation and tabs (core UI structure)
        await import('./modules/navigation.js');
        await import('./modules/tabs.js');
        await import('./modules/rag-navigation.js');

        // 5. Search and tooltips (UI enhancements)
        await import('./modules/search.js');
        await import('./modules/tooltips.js');

        // 6. Configuration and health (backend integration)
        await import('./modules/config.js');
        await import('./modules/health.js');

        // 7. Feature modules (order doesn't matter as much)
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
          import('./modules/golden_questions.js'),
          import('./modules/eval_runner.js'),
          import('./modules/eval_history.js'),
          import('./modules/chat.js'),
          import('./modules/error-helpers.js'),
          import('./modules/layout_fix.js'),
          import('./modules/live-terminal.js'),
          import('./modules/reranker.js'),
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
          {/* Tab Bar - Using NavLink for proper routing */}
          <div className="tab-bar">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              📊 Dashboard
            </NavLink>
            <NavLink
              to="/docker"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              🐳 Docker
            </NavLink>
            <NavLink
              to="/chat"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              💬 Chat
            </NavLink>
            <NavLink
              to="/vscode"
              className={({ isActive }) => isActive ? 'active promoted-tab' : 'promoted-tab'}
            >
              📝 VS Code
            </NavLink>
            <NavLink
              to="/grafana"
              className={({ isActive }) => isActive ? 'active promoted-tab' : 'promoted-tab'}
            >
              📈 Grafana
            </NavLink>
            <NavLink
              to="/rag"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              🧠 RAG
            </NavLink>
            <NavLink
              to="/profiles"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              💾 Profiles
            </NavLink>
            <NavLink
              to="/infrastructure"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              🔧 Infrastructure
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              ⚙️ Admin
            </NavLink>
          </div>

          {/* Routes */}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/docker" element={<Docker />} />
            <Route path="/chat" element={<div className="tab-content active"><ChatTab /></div>} />
            <Route path="/vscode" element={<div className="tab-content active"><VSCodeTab /></div>} />
            <Route path="/grafana" element={<div className="tab-content active" style={{ padding: 0 }}><GrafanaTab /></div>} />
            <Route path="/rag" element={<div className="tab-content active"><RAGTab /></div>} />
            <Route path="/profiles" element={<div className="tab-content active"><ProfilesTab /></div>} />
            <Route path="/infrastructure" element={<div className="tab-content active"><InfrastructureTab /></div>} />
            <Route path="/admin" element={<div className="tab-content active"><AdminTab /></div>} />
          </Routes>
        </div>

        {/* Sidepanel */}
        <div className="sidepanel" id="sidepanel">
          <div className="sidepanel-section">
            <h4>Quick Actions</h4>
            <button className="small-button" onClick={checkHealth}>
              Check Health
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
