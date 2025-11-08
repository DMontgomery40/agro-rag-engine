import { useState, useEffect } from 'react';
import { useHealthStore } from '@/stores/useHealthStore';
import { useConfigStore } from '@/stores/useConfigStore';

interface StatusItemProps {
  label: string;
  value: string;
  color: string;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--card-bg)',
    borderRadius: '4px',
    border: '1px solid var(--line)'
  }}>
    <span style={{
      fontSize: '11px',
      color: 'var(--fg-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {label}
    </span>
    <span className="mono" style={{
      color,
      fontWeight: 600
    }}>
      {value}
    </span>
  </div>
);

export function SystemStatus() {
  // Zustand stores
  const { status: healthStatus } = useHealthStore();
  const { config } = useConfigStore();

  // Local state for API data
  const [cardCount, setCardCount] = useState<string>('—');
  const [mcpStatus, setMcpStatus] = useState<string>('—');
  const [autoTuneStatus, setAutoTuneStatus] = useState<string>('—');

  // Fetch all status data
  const fetchAllStatus = async () => {
    try {
      // Fetch card count
      const cardsRes = await fetch('/api/cards/count');
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setCardCount(cardsData.count?.toString() || '0');
      }
    } catch (err) {
      setCardCount('error');
    }

    try {
      // Fetch MCP status
      const mcpRes = await fetch('/api/mcp/status');
      if (mcpRes.ok) {
        const mcpData = await mcpRes.json();
        setMcpStatus(mcpData.running ? 'running' : 'stopped');
      }
    } catch (err) {
      setMcpStatus('error');
    }

    try {
      // Fetch Auto-Tune status
      const autotuneRes = await fetch('/api/autotune/status');
      if (autotuneRes.ok) {
        const autotuneData = await autotuneRes.json();
        setAutoTuneStatus(autotuneData.enabled ? 'enabled' : 'disabled');
      }
    } catch (err) {
      setAutoTuneStatus('error');
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAllStatus();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAllStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute values and colors
  const healthValue = healthStatus?.status || '—';
  const healthColor =
    healthStatus?.status === 'healthy' ? 'var(--ok)' :
    healthStatus?.status === 'unhealthy' ? 'var(--err)' :
    'var(--fg-muted)';

  const repoValue = config?.env?.REPO || config?.default_repo || '—';
  const repoColor = 'var(--fg)';

  const cardsColor = cardCount === 'error' ? 'var(--err)' : 'var(--link)';

  const mcpColor =
    mcpStatus === 'running' ? 'var(--link)' :
    mcpStatus === 'error' ? 'var(--err)' :
    'var(--fg-muted)';

  const autoTuneColor =
    autoTuneStatus === 'enabled' ? 'var(--ok)' :
    autoTuneStatus === 'error' ? 'var(--err)' :
    'var(--warn)';

  return (
    <div>
      {/* Header with pulsing dot */}
      <h3 style={{
        fontSize: '14px',
        marginBottom: '16px',
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent)',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        System Status
      </h3>

      {/* Status items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <StatusItem label="Health" value={healthValue} color={healthColor} />
        <StatusItem label="Repo" value={repoValue} color={repoColor} />
        <StatusItem label="Cards" value={cardCount} color={cardsColor} />
        <StatusItem label="MCP" value={mcpStatus} color={mcpColor} />
        <StatusItem label="Auto-Tune" value={autoTuneStatus} color={autoTuneColor} />
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default SystemStatus;
