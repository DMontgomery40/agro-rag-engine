// AGRO - System Status Panel Component
// 5 status boxes: Health, Repo, Cards, MCP, Auto-Tune

import React, { useEffect, useState } from 'react';

interface SystemStats {
  health: string;
  repo: string;
  branch: string;
  cards: string;
  mcp: string;
  autotune: string;
}

export function SystemStatusPanel() {
  const [stats, setStats] = useState<SystemStats>({
    health: '—',
    repo: '—',
    branch: '—',
    cards: '—',
    mcp: '—',
    autotune: '—',
  });

  const loadStats = async () => {
    try {
      // Health
      const healthResp = await fetch('/api/health');
      const health = await healthResp.json();

      // Index stats
      const indexResp = await fetch('/api/index/stats');
      const indexData = await indexResp.json();

      // Config
      const configResp = await fetch('/api/config');
      const config = await configResp.json();

      setStats({
        health: health.status === 'healthy' ? 'healthy (graph ready)' : 'degraded',
        repo: `${config.env?.REPO || 'agro'} (1 repos)`,
        branch: config.git_branch || 'development',
        cards: `${indexData.total_chunks || 0} cards`,
        mcp: '0.0.0.0:8013/mcp',
        autotune: config.env?.AUTOTUNE_ENABLED === '1' ? 'enabled' : 'disabled',
      });
    } catch (e) {
      console.error('[SystemStatus] Failed to load stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    
    // Listen for refresh events
    const handleRefresh = () => loadStats();
    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  return (
    <div>
      <h3
        style={{
          fontSize: '14px',
          marginBottom: '16px',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        />
        System Status
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Health */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Health
          </span>
          <span id="dash-health" className="mono" style={{ color: 'var(--ok)', fontWeight: 600 }}>
            {stats.health}
          </span>
        </div>

        {/* Repo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Repo
          </span>
          <span id="dash-repo" className="mono" style={{ color: 'var(--fg)', fontWeight: 600 }}>
            {stats.repo}
          </span>
        </div>

        {/* Branch */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Branch
          </span>
          <span id="dash-branch" className="mono" style={{ color: 'var(--link)', fontWeight: 600 }}>
            {stats.branch}
          </span>
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cards
          </span>
          <span id="dash-cards" className="mono" style={{ color: 'var(--link)', fontWeight: 600 }}>
            {stats.cards}
          </span>
        </div>

        {/* MCP */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            MCP
          </span>
          <div
            id="dash-mcp"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '10px',
              fontFamily: "'SF Mono', monospace",
              color: 'var(--link)',
            }}
          >
            {stats.mcp}
          </div>
        </div>

        {/* Auto-Tune */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            border: '1px solid var(--line)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Auto-Tune
          </span>
          <span id="dash-autotune" className="mono" style={{ color: 'var(--warn)', fontWeight: 600 }}>
            {stats.autotune}
          </span>
        </div>
      </div>
    </div>
  );
}

