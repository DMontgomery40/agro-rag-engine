import { useEffect } from 'react';
import { useHealthStore, useDockerStore } from '@/stores';
import SystemStatus from '@/components/Dashboard/SystemStatus';
import QuickActions from '@/components/Dashboard/QuickActions';

/**
 * Dashboard Tab Content - Team 1 Foundation
 *
 * Renders inside App.tsx tab structure (no standalone header needed)
 * Layout: System Status (left) + Quick Actions (right) + placeholders for Teams 2 & 3
 */
export default function Dashboard() {
  const { checkHealth } = useHealthStore();
  const { fetchStatus: fetchDocker } = useDockerStore();

  useEffect(() => {
    // Initial fetch
    checkHealth();
    fetchDocker();

    // Set up polling intervals
    const healthInterval = setInterval(checkHealth, 30000); // Every 30s
    const dockerInterval = setInterval(fetchDocker, 60000); // Every 60s

    return () => {
      clearInterval(healthInterval);
      clearInterval(dockerInterval);
    };
  }, [checkHealth, fetchDocker]);

  return (
    <>
      {/* Sub-tabs */}
      <div className="subtab-bar">
        <button className="subtab active">Overview</button>
      </div>

      {/* Tab Content */}
      <div className="tab-content active" id="tab-dashboard" style={{ paddingTop: 0 }}>
        {/* Main Dashboard Content - System Status + Quick Actions */}
        <div className="settings-section" style={{
          borderLeft: '3px solid var(--accent)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left: System Status (Sub-Agent 3) */}
            <SystemStatus />

            {/* Right: Quick Actions (Sub-Agent 4) */}
            <QuickActions />
          </div>
        </div>

        {/* Placeholder sections for Teams 2 & 3 */}
        <div id="index-display-container" className="settings-section" style={{
          borderLeft: '3px solid var(--accent)'
        }}>
          <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>
            [Team 2 will add Index Display here]
          </p>
        </div>

        <div id="auto-profile-container" className="settings-section" style={{
          borderLeft: '3px solid var(--accent)'
        }}>
          <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>
            [Team 3 will add Auto-Profile Wizard here]
          </p>
        </div>

        <div id="monitoring-logs-container" className="settings-section" style={{
          borderLeft: '3px solid var(--accent)'
        }}>
          <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>
            [Team 3 will add Monitoring Logs here]
          </p>
        </div>
      </div>
    </>
  );
}
