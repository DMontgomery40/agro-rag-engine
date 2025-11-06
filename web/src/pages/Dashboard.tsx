import { useEffect } from 'react';
import { useHealthStore, useDockerStore } from '@/stores';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { DockerStatusCard } from '@/components/DockerStatusCard';

export default function Dashboard() {
  const { status: healthStatus, loading: healthLoading, error: healthError, checkHealth } = useHealthStore();
  const { status: dockerStatus, loading: dockerLoading, error: dockerError, fetchStatus: fetchDocker } = useDockerStore();

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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>System Dashboard</h2>
        <p className="text-muted">Monitor system health and infrastructure status</p>
      </div>

      <div className="dashboard-grid">
        <HealthStatusCard
          status={healthStatus}
          loading={healthLoading}
          error={healthError}
          onRefresh={checkHealth}
        />

        <DockerStatusCard
          status={dockerStatus}
          loading={dockerLoading}
          error={dockerError}
          onRefresh={fetchDocker}
        />
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 24px;
        }

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

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
      `}</style>
    </div>
  );
}
