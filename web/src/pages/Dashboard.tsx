// AGRO - Dashboard Page
// Complete dashboard matching /gui with all sections, live terminals, and backend data

import React, { useEffect } from 'react';
import { SystemStatusPanel } from '../components/Dashboard/SystemStatusPanel';
import { QuickActions } from '../components/Dashboard/QuickActions';
import { EmbeddingConfigPanel } from '../components/Dashboard/EmbeddingConfigPanel';
import { IndexingCostsPanel } from '../components/Dashboard/IndexingCostsPanel';
import { StorageBreakdownPanel } from '../components/Dashboard/StorageBreakdownPanel';
import { AutoProfilePanel } from '../components/Dashboard/AutoProfilePanel';
import { MonitoringLogsPanel } from '../components/Dashboard/MonitoringLogsPanel';

export function Dashboard() {
  const [gitBranch, setGitBranch] = React.useState('—');

  // Load git branch from backend
  useEffect(() => {
    const loadBranch = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        setGitBranch(data.git_branch || 'development');
      } catch (e) {
        console.error('[Dashboard] Failed to load branch:', e);
      }
    };
    loadBranch();
  }, []);

  // Initialize dashboard LiveTerminal
  useEffect(() => {
    const initTerminal = () => {
      const w = window as any;
      if (w.LiveTerminal && !w._dashboardTerminal) {
        try {
          w._dashboardTerminal = new w.LiveTerminal('dash-operations-terminal');
          console.log('[Dashboard] Operations terminal initialized');
        } catch (e) {
          console.error('[Dashboard] Failed to init terminal:', e);
        }
      }
    };

    // Try immediate init
    initTerminal();

    // Retry after delay if LiveTerminal loads late
    const timeout = setTimeout(initTerminal, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div id="tab-dashboard" className="tab-content active">
      {/* Compact Status + Quick Actions */}
      <div
        className="settings-section"
        style={{
          background: 'var(--panel)',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left: System Status */}
          <SystemStatusPanel />

          {/* Right: Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* agro Repo Info Panel */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ color: 'var(--ok)', fontSize: '16px' }}>●</span>
          <span style={{ color: 'var(--fg)', fontSize: '18px', fontWeight: 600 }}>agro</span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            BRANCH:
          </span>{' '}
          <span style={{ color: 'var(--link)', fontSize: '11px', fontWeight: 600 }}>{gitBranch}</span>
        </div>
        <div style={{ color: 'var(--fg-muted)', fontSize: '11px', fontFamily: "'Monaco', 'Courier New', monospace" }}>
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* Embedding Configuration */}
      <EmbeddingConfigPanel />

      {/* Indexing Costs */}
      <IndexingCostsPanel />

      {/* Storage Requirements */}
      <StorageBreakdownPanel />

      {/* Auto-Profile */}
      <AutoProfilePanel />

      {/* Monitoring Logs */}
      <MonitoringLogsPanel />
    </div>
  );
}

