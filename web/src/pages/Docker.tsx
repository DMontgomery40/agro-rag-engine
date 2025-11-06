import { useEffect } from 'react';
import { useDockerStore } from '@/stores';
import { DockerContainer } from '@/components/DockerContainer';

export default function Docker() {
  const {
    containers,
    loading,
    error,
    fetchContainers,
    startContainer,
    stopContainer,
    restartContainer
  } = useDockerStore();

  useEffect(() => {
    fetchContainers();

    // Poll every 10 seconds
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  return (
    <div style={{ padding: '24px' }}>
      <div className="dashboard-header">
        <h2>Docker Containers</h2>
        <p className="text-muted">Manage and monitor Docker containers</p>
      </div>

      {error && (
        <div style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--err)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '20px',
          color: 'var(--err)'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="action-buttons" style={{ marginBottom: '20px' }}>
        <button onClick={fetchContainers} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {containers.length === 0 && !loading && (
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--fg-muted)'
        }}>
          <p>No containers found</p>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '16px'
      }}>
        {containers.map((container) => (
          <DockerContainer
            key={container.id}
            container={container}
            onStart={() => startContainer(container.id)}
            onStop={() => stopContainer(container.id)}
            onRestart={() => restartContainer(container.id)}
          />
        ))}
      </div>

      <style jsx>{`
        .dashboard-header {
          margin-bottom: 24px;
        }

        .dashboard-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--fg);
          margin-bottom: 8px;
        }

        .dashboard-header .text-muted {
          color: var(--fg-muted);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
