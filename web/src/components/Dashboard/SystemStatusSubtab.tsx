// AGRO - System Status Subtab
// Real-time system health, status, and quick overview

import { useState, useEffect } from 'react';
import * as DashAPI from '@/api/dashboard';
import { QuickActions } from './QuickActions';

export function SystemStatusSubtab() {
  const [health, setHealth] = useState<string>('—');
  const [repo, setRepo] = useState<string>('—');
  const [branch, setBranch] = useState<string>('—');
  const [cards, setCards] = useState<string>('—');
  const [mcp, setMcp] = useState<string>('—');
  // const [autotune, setAutotune] = useState<string>('—'); // HIDDEN - Pro feature
  const [docker, setDocker] = useState<string>('—');
  const [gitHooks, setGitHooks] = useState<string>('—');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all status data in parallel
      const [
        healthData,
        configData,
        cardsData,
        mcpData,
        // autotuneData, // HIDDEN - Pro feature
        dockerData,
        gitData,
        indexData
      ] = await Promise.allSettled([
        DashAPI.getHealth(),
        DashAPI.getConfig(),
        DashAPI.getCards(),
        DashAPI.getMCPStatus(),
        // DashAPI.getAutotuneStatus(), // HIDDEN - Pro feature
        DashAPI.getDockerStatus(),
        DashAPI.getGitHookStatus(),
        DashAPI.getIndexStatus()
      ]);

      // Health
      if (healthData.status === 'fulfilled') {
        const h = healthData.value;
        setHealth(`${h.status}${h.graph_loaded ? ' (graph ready)' : ''}`);
      }

      // Config (repo, branch)
      if (configData.status === 'fulfilled') {
        const c = configData.value;
        const repoName = (c.env?.REPO || c.default_repo || '(none)');
        const reposCount = (c.repos || []).length;
        setRepo(`${repoName} (${reposCount} repos)`);
      }

      if (indexData.status === 'fulfilled' && indexData.value.metadata) {
        setBranch(indexData.value.metadata.current_branch);
      }

      // Cards
      if (cardsData.status === 'fulfilled') {
        const cardCount = cardsData.value.count || 0;
        setCards(`${cardCount} cards`);
      }

      // MCP
      if (mcpData.status === 'fulfilled') {
        const m = mcpData.value;
        const parts = [];
        if (m.python_http) {
          const ph = m.python_http;
          parts.push(`py-http:${ph.host}:${ph.port} ${ph.running ? '✓' : '✗'}`);
        }
        if (m.node_http) {
          const nh = m.node_http;
          parts.push(`node-http:${nh.host}:${nh.port} ${nh.running ? '✓' : '✗'}`);
        }
        if (m.python_stdio_available !== undefined) {
          parts.push(`py-stdio:${m.python_stdio_available ? 'available' : 'missing'}`);
        }
        setMcp(parts.length > 0 ? parts.join(' | ') : 'unknown');
      }

      // Autotune - HIDDEN (Pro feature, implementing hardware-idle training)
      // if (autotuneData.status === 'fulfilled') {
      //   const a = autotuneData.value;
      //   setAutotune(a.enabled ? (a.current_mode || 'enabled') : 'disabled');
      // } else {
      //   setAutotune('Pro required');
      // }

      // Docker
      if (dockerData.status === 'fulfilled') {
        const d = dockerData.value;
        if (d.available && d.containers) {
          const running = d.containers.filter(c => c.state === 'running').length;
          setDocker(`${running}/${d.containers.length} running`);
        } else {
          setDocker('unavailable');
        }
      }

      // Git Hooks
      if (gitData.status === 'fulfilled') {
        const g = gitData.value;
        setGitHooks(g.installed ? `installed (${g.hooks?.length || 0})` : 'not installed');
      }

      setLoading(false);
    } catch (err) {
      console.error('[SystemStatusSubtab] Error refreshing status:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();

    // Poll status every 10 seconds
    const interval = setInterval(refreshStatus, 10000);

    // Listen for manual refresh events
    const handleRefresh = () => refreshStatus();
    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  return (
    <div
      id="tab-dashboard-system"
      className="dashboard-subtab active"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Compact Status + Quick Actions */}
      <div className="settings-section" style={{ background: 'var(--panel)', borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: System Status */}
          <div>
            <h3
              style={{
                fontSize: '14px',
                marginBottom: '16px',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)'
                }}
              />
              System Status
            </h3>

            {loading && !health ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
                Loading status...
              </div>
            ) : error ? (
              <div style={{ color: 'var(--err)', fontSize: '12px', padding: '20px' }}>
                Error: {error}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <StatusItem label="Health" value={health} id="dash-health" color="var(--ok)" />
                <StatusItem label="Repo" value={repo} id="dash-repo" color="var(--fg)" />
                <StatusItem label="Branch" value={branch} id="dash-branch" color="var(--link)" />
                <StatusItem label="Cards" value={cards} id="dash-cards" color="var(--link)" />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'var(--card-bg)',
                    borderRadius: '4px',
                    border: '1px solid var(--line)'
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    MCP Servers
                  </span>
                  <div
                    id="dash-mcp"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '10px',
                      fontFamily: "'SF Mono', monospace",
                      color: 'var(--link)'
                    }}
                  >
                    <span>{mcp}</span>
                  </div>
                </div>

                {/* HIDDEN: Auto-Tune feature - Pro feature, implementing hardware-idle training detection
                    Backend stub remains at /api/autotune/status for future implementation
                    Re-enable when feature is complete */}
                {/* <StatusItem label="Auto-Tune" value={autotune} id="dash-autotune" color="var(--warn)" /> */}
                <StatusItem label="Docker" value={docker} id="dash-docker" color="var(--link)" />
                <StatusItem label="Git Hooks" value={gitHooks} id="dash-git-hooks" color="var(--ok)" />
              </div>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={refreshStatus}
              disabled={loading}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '8px',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)',
                fontSize: '12px',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Refreshing...' : '↻ Refresh Status'}
            </button>
          </div>

          {/* Right: Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* Top Accessed Folders Section */}
      <div className="settings-section" style={{ background: 'var(--panel)', borderLeft: '3px solid var(--warn)' }}>
        <h3
          style={{
            fontSize: '14px',
            marginBottom: '16px',
            color: 'var(--warn)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Top Folders (Last 5 Days)
        </h3>
        <div id="dash-top-folders-metrics" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
          Analytics endpoint not yet available. This will show most frequently accessed code folders.
        </div>
      </div>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  value: string;
  id?: string;
  color: string;
}

function StatusItem({ label, value, id, color }: StatusItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'var(--card-bg)',
        borderRadius: '4px',
        border: '1px solid var(--line)'
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: 'var(--fg-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </span>
      <span id={id} className="mono" style={{ color, fontWeight: '600', fontSize: '12px' }}>
        {value}
      </span>
    </div>
  );
}
