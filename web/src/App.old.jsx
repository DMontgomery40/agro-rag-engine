import { useState, useEffect } from 'react'

// Module loading strategy:
// These modules are loaded dynamically after React mounts to ensure DOM is ready
// They attach to window and use traditional DOM manipulation
// Will be progressively refactored to React hooks

// Import tab components
import StartTab from './components/tabs/StartTab'
import DashboardTab from './components/tabs/DashboardTab'
import ChatTab from './components/tabs/ChatTab'
import VSCodeTab from './components/tabs/VSCodeTab'
import GrafanaTab from './components/tabs/GrafanaTab'
import RAGTab from './components/tabs/RAGTab'
import ProfilesTab from './components/tabs/ProfilesTab'
import InfrastructureTab from './components/tabs/InfrastructureTab'
import AdminTab from './components/tabs/AdminTab'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [healthStatus, setHealthStatus] = useState('—')

  useEffect(() => {
    // Load modules after React has mounted and DOM is ready
    const loadModules = async () => {
      console.log('[App] DOM ready, loading modules...')

      try {
        // Load in dependency order
        // 1. Core utilities (must load first)
        await import('./modules/fetch-shim.js')
        await import('./modules/core-utils.js')
        await import('./modules/api-base-override.js')

        // 2. UI helpers and theme (needed by many modules)
        await import('./modules/ui-helpers.js')
        await import('./modules/theme.js')

        // 3. Test instrumentation (for debugging)
        await import('./modules/test-instrumentation.js')

        // 4. Navigation and tabs (core UI structure)
        await import('./modules/navigation.js')
        await import('./modules/tabs.js')
        await import('./modules/rag-navigation.js')

        // 5. Search and tooltips (UI enhancements)
        await import('./modules/search.js')
        await import('./modules/tooltips.js')

        // 6. Configuration and health (backend integration)
        await import('./modules/config.js')
        await import('./modules/health.js')

        // 7. Feature modules (order doesn't matter as much)
        await Promise.all([
          import('./modules/git-hooks.js'),
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
          import('./modules/ux-feedback.js')
        ])

        // 8. Main app coordinator (must load last)
        await import('./modules/app.js')

        console.log('[App] All modules loaded successfully')

        // Dispatch a custom event so modules know React is ready
        window.dispatchEvent(new Event('react-ready'))
      } catch (err) {
        console.error('[App] Error loading modules:', err)
      }
    }

    // Give React a tick to render before loading modules
    setTimeout(loadModules, 100)
  }, [])

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
          <button id="btn-health">Health</button>
          <span id="health-status">{healthStatus}</span>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div className="mobile-nav-overlay" id="mobile-nav-overlay"></div>
      <nav className="mobile-nav-drawer" id="mobile-nav-drawer">
        <button data-tab="start">🚀 Get Started</button>
        <button className="active" data-tab="dashboard">📊 Dashboard</button>
        <button data-tab="chat">💬 Chat</button>
        <button data-tab="vscode">📝 VS Code</button>
        <button data-tab="grafana">📈 Grafana</button>
        <button data-tab="rag">🧠 RAG</button>
        <button data-tab="profiles">💾 Profiles</button>
        <button data-tab="infrastructure">🔧 Infrastructure</button>
        <button data-tab="admin">⚙️ Admin</button>
      </nav>

      {/* Main Layout */}
      <div className="layout">
        <div className="resize-handle"></div>
        <div className="content">
          {/* Tab Bar */}
          <div className="tab-bar">
            <button data-tab="start">🚀 Get Started</button>
            <button className="active" data-tab="dashboard">📊 Dashboard</button>
            <button data-tab="chat">💬 Chat</button>
            <button data-tab="vscode" className="promoted-tab">📝 VS Code</button>
            <button data-tab="grafana" className="promoted-tab">📈 Grafana</button>
            <button data-tab="rag">🧠 RAG</button>
            <button data-tab="profiles">💾 Profiles</button>
            <button data-tab="infrastructure">🔧 Infrastructure</button>
            <button data-tab="admin">⚙️ Admin</button>
          </div>

          {/* Subtab Bars - will be shown/hidden by JS modules */}
          <div id="dashboard-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="overview-dash">Overview</button>
          </div>
          <div id="chat-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="chat-ui" data-parent="chat">Interface</button>
            <button className="subtab-btn" data-subtab="chat-settings" data-parent="chat">Settings</button>
          </div>
          <div id="vscode-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="editor">Editor</button>
            <button className="subtab-btn" data-subtab="editor-settings">Settings</button>
          </div>
          <div id="grafana-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="dashboard">Dashboard</button>
            <button className="subtab-btn" data-subtab="config">Config</button>
          </div>
          <div id="profiles-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="budget">Budget</button>
            <button className="subtab-btn" data-subtab="management">Management</button>
            <button className="subtab-btn" data-subtab="overrides">Overrides</button>
          </div>
          <div id="infrastructure-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="services">Services</button>
            <button className="subtab-btn" data-subtab="mcp">MCP</button>
            <button className="subtab-btn" data-subtab="paths">Paths & Stores</button>
            <button className="subtab-btn" data-subtab="monitoring">Monitoring</button>
          </div>
          <div id="admin-subtabs" className="subtab-bar" style={{display: 'none'}}>
            <button className="subtab-btn active" data-subtab="general">General</button>
            <button className="subtab-btn" data-subtab="git">Git</button>
            <button className="subtab-btn" data-subtab="secrets">Secrets</button>
            <button className="subtab-btn" data-subtab="integrations">Integrations</button>
          </div>

          {/* RAG mega-tab subtabs */}
          <div id="rag-subtabs" className="subtab-bar">
            <button className="subtab-btn active" data-subtab="data-quality">Data Quality</button>
            <button className="subtab-btn" data-subtab="retrieval">Retrieval</button>
            <button className="subtab-btn" data-subtab="external-rerankers">External Rerankers</button>
            <button className="subtab-btn" data-subtab="learning-ranker">Learning Ranker</button>
            <button className="subtab-btn" data-subtab="indexing">Indexing</button>
            <button className="subtab-btn" data-subtab="evaluate">Evaluate</button>
          </div>

          {/* Tab Content Container - This will hold all tab content */}
          <div style={{flex: 1, overflowY: 'auto', overflowX: 'hidden'}}>
            <div id="tab-start" className="tab-content">
              <StartTab />
            </div>

            <div id="tab-dashboard" className="tab-content active">
              <DashboardTab />
            </div>

            <div id="tab-chat" className="tab-content">
              <ChatTab />
            </div>

            <div id="tab-vscode" className="tab-content">
              <VSCodeTab />
            </div>

            <div id="tab-grafana" className="tab-content" style={{padding: 0}}>
              <GrafanaTab />
            </div>

            <div id="tab-rag" className="tab-content">
              <RAGTab />
            </div>

            <div id="tab-profiles" className="tab-content">
              <ProfilesTab />
            </div>

            <div id="tab-infrastructure" className="tab-content">
              <InfrastructureTab />
            </div>

            <div id="tab-admin" className="tab-content">
              <AdminTab />
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="sidepanel" id="sidepanel">
          <div className="sidepanel-header">
            <h3 className="sidepanel-title" id="sidepanel-title">Apply Changes</h3>
          </div>
          <div id="sidepanel-content" style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
            {/* Side panel content - managed by existing JS modules for now */}
          </div>
          <div className="sidepanel-footer">
            <button id="btn-apply" className="btn-apply">Apply Changes</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
