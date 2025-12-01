// AGRO - Infrastructure Services Subtab
// Real React component with full backend wiring

import { useState, useEffect } from 'react';
import { dockerApi } from '@/api/docker';
import { configApi } from '@/api/config';
import { useAPI } from '@/hooks';
import type { DockerStatus, DockerContainer } from '@web/types';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'checking';
  color: string;
  port: number;
  description: string;
}

export function ServicesSubtab() {
  const { api } = useAPI();

  // Core state
  const [dockerStatus, setDockerStatus] = useState<DockerStatus | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [agroContainers, setAgroContainers] = useState<DockerContainer[]>([]);

  // Service status
  const [qdrantStatus, setQdrantStatus] = useState<ServiceStatus>({
    name: 'Qdrant',
    status: 'checking',
    color: 'var(--accent)',
    port: 6333,
    description: 'Vector database'
  });

  const [redisStatus, setRedisStatus] = useState<ServiceStatus>({
    name: 'Redis',
    status: 'checking',
    color: 'var(--err)',
    port: 6379,
    description: 'Memory store'
  });

  const [prometheusStatus, setPrometheusStatus] = useState<ServiceStatus>({
    name: 'Prometheus',
    status: 'checking',
    color: 'var(--warn)',
    port: 9090,
    description: 'Metrics collector'
  });

  const [grafanaStatus, setGrafanaStatus] = useState<ServiceStatus>({
    name: 'Grafana',
    status: 'checking',
    color: 'var(--link)',
    port: 3000,
    description: 'Dashboards'
  });

  const [lokiStatus, setLokiStatus] = useState<ServiceStatus>({
    name: 'Loki',
    status: 'checking',
    color: 'var(--accent)',
    port: 3100,
    description: 'Log aggregation'
  });

  // Action states
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState('0');

  // Logs modal state
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsContent, setLogsContent] = useState('');
  const [logsContainerName, setLogsContainerName] = useState('');
  const [logsContainerId, setLogsContainerId] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchAllStatus();
    loadRuntimeMode();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchAllStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load runtime mode from backend
  const loadRuntimeMode = async () => {
    try {
      const { runtime_mode } = await configApi.getRuntimeMode();
      // Map backend values to UI values: 'development' -> '1', 'production' -> '0'
      setRuntimeMode(runtime_mode === 'development' ? '1' : '0');
    } catch (error) {
      console.error('[ServicesSubtab] Failed to load runtime mode:', error);
      // Default to production (Docker) mode on error
      setRuntimeMode('0');
    }
  };

  const fetchAllStatus = async () => {
    // Fetch Docker status in parallel with containers
    const [, containersList] = await Promise.all([
      fetchDockerStatus(),
      fetchContainers()
    ]);
    // THEN check service status using the returned containers (not stale state)
    await fetchServiceStatus(containersList);
  };

  const fetchDockerStatus = async () => {
    try {
      const status = await dockerApi.getStatus();
      setDockerStatus(status);
    } catch (error) {
      console.error('[ServicesSubtab] Failed to fetch Docker status:', error);
      setDockerStatus({ running: false, runtime: 'Unknown', containers_count: 0 });
    }
  };

  const fetchContainers = async (): Promise<DockerContainer[]> => {
    try {
      const result = await dockerApi.listContainers();
      const allContainers = result.containers || [];
      setContainers(allContainers);

      // Filter AGRO containers
      const agro = allContainers.filter((c: any) => c.agro_managed === true);
      setAgroContainers(agro);

      return allContainers;
    } catch (error) {
      console.error('[ServicesSubtab] Failed to fetch containers:', error);
      setContainers([]);
      setAgroContainers([]);
      return [];
    }
  };

  const fetchServiceStatus = async (containersList: DockerContainer[]) => {
    // Check Qdrant - use passed containersList, not stale state
    const qdrantContainer = containersList.find(c =>
      c.name.toLowerCase().includes('qdrant')
    );
    setQdrantStatus(prev => ({
      ...prev,
      status: qdrantContainer?.state === 'running' ? 'online' : 'offline'
    }));

    // Check Redis via ping endpoint
    try {
      const res = await fetch(api('/api/docker/redis/ping'));
      if (res.ok) {
        const data = await res.json();
        setRedisStatus(prev => ({
          ...prev,
          status: data.success ? 'online' : 'offline'
        }));
      } else {
        setRedisStatus(prev => ({ ...prev, status: 'offline' }));
      }
    } catch {
      setRedisStatus(prev => ({ ...prev, status: 'offline' }));
    }

    // Check Prometheus - use passed containersList
    const prometheusContainer = containersList.find(c =>
      c.name.toLowerCase().includes('prometheus')
    );
    setPrometheusStatus(prev => ({
      ...prev,
      status: prometheusContainer?.state === 'running' ? 'online' : 'offline'
    }));

    // Check Grafana - use passed containersList
    const grafanaContainer = containersList.find(c =>
      c.name.toLowerCase().includes('grafana')
    );
    setGrafanaStatus(prev => ({
      ...prev,
      status: grafanaContainer?.state === 'running' ? 'online' : 'offline'
    }));

    // Check Loki
    try {
      const lokiData = await dockerApi.getLokiStatus();
      setLokiStatus(prev => ({
        ...prev,
        status: lokiData.reachable ? 'online' : 'offline'
      }));
    } catch {
      setLokiStatus(prev => ({ ...prev, status: 'offline' }));
    }
  };

  const handleQdrantOpen = () => {
    window.open('http://localhost:6333/dashboard', '_blank');
  };

  const handleQdrantRestart = async () => {
    const container = containers.find(c => c.name.toLowerCase().includes('qdrant'));
    if (!container) {
      setActionMessage('Qdrant container not found');
      return;
    }

    setLoading(true);
    setActionMessage('Restarting Qdrant...');
    try {
      await dockerApi.restartContainer(container.id);
      setActionMessage('Qdrant restarted successfully');
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      setActionMessage(`Failed to restart Qdrant: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleRedisPing = async () => {
    setLoading(true);
    setActionMessage('Pinging Redis...');
    try {
      const res = await fetch(api('/api/docker/redis/ping'));
      const data = await res.json();
      setActionMessage(data.success ? `Redis: ${data.response}` : `Redis ping failed: ${data.error}`);
    } catch (error) {
      setActionMessage(`Failed to ping Redis: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleRedisRestart = async () => {
    const container = containers.find(c => c.name.toLowerCase().includes('redis'));
    if (!container) {
      setActionMessage('Redis container not found');
      return;
    }

    setLoading(true);
    setActionMessage('Restarting Redis...');
    try {
      await dockerApi.restartContainer(container.id);
      setActionMessage('Redis restarted successfully');
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      setActionMessage(`Failed to restart Redis: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handlePrometheusOpen = () => {
    window.open('http://localhost:9090', '_blank');
  };

  const handleGrafanaOpen = () => {
    window.open('http://localhost:3000', '_blank');
  };

  const handleInfraUp = async () => {
    setLoading(true);
    setActionMessage('Starting infrastructure...');
    try {
      const res = await fetch(api('/api/docker/infra/up'), { method: 'POST' });
      const data = await res.json();
      setActionMessage(data.success ? 'Infrastructure started' : `Failed: ${data.error}`);
      setTimeout(() => fetchAllStatus(), 2000);
    } catch (error) {
      setActionMessage(`Failed to start infrastructure: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleInfraDown = async () => {
    if (!confirm('Stop all infrastructure services?')) return;

    setLoading(true);
    setActionMessage('Stopping infrastructure...');
    try {
      const res = await fetch(api('/api/docker/infra/down'), { method: 'POST' });
      const data = await res.json();
      setActionMessage(data.success ? 'Infrastructure stopped' : `Failed: ${data.error}`);
      setTimeout(() => fetchAllStatus(), 2000);
    } catch (error) {
      setActionMessage(`Failed to stop infrastructure: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleDockerRefresh = () => {
    fetchAllStatus();
    setActionMessage('Refreshing...');
    setTimeout(() => setActionMessage(null), 1000);
  };

  const handleSaveRuntimeMode = async () => {
    setLoading(true);
    setActionMessage('Saving runtime mode...');

    try {
      // Map UI values to backend values: '1' -> 'development', '0' -> 'production'
      const mode = runtimeMode === '1' ? 'development' : 'production';
      const result = await configApi.updateRuntimeMode(mode);

      setActionMessage(`Runtime mode saved: ${mode} (DEV_LOCAL_UVICORN=${runtimeMode})`);
      console.log('[ServicesSubtab] Runtime mode updated:', result);
    } catch (error) {
      console.error('[ServicesSubtab] Failed to save runtime mode:', error);
      setActionMessage(`Failed to save runtime mode: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const renderServiceCard = (service: ServiceStatus, buttons: React.ReactNode) => (
    <div style={{
      background: 'var(--bg-elev2)',
      border: '1px solid var(--line)',
      borderRadius: '6px',
      padding: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ fontWeight: '600', color: service.color }}>{service.name}</div>
        <div id={`${service.name.toLowerCase()}-status`} style={{
          fontSize: '11px',
          color: service.status === 'online' ? 'var(--accent)' :
                 service.status === 'offline' ? 'var(--err)' : 'var(--fg-muted)'
        }}>
          {service.status === 'online' ? '● Online' :
           service.status === 'offline' ? '○ Offline' : 'Checking...'}
        </div>
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--fg-muted)',
        marginBottom: '12px'
      }}>
        {service.description} • Port {service.port}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {buttons}
      </div>
    </div>
  );

  const renderContainer = (container: any) => {
    const isPaused = container.state === 'paused' || container.status?.toLowerCase().includes('paused');
    const statusColor = container.state === 'running' ? 'var(--accent)' :
                       isPaused ? 'var(--warn)' : 'var(--err)';

    return (
      <div key={container.id} style={{
        background: 'var(--bg-elev2)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px'
        }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{container.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '2px' }}>
              {container.image}
            </div>
          </div>
          <div style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: statusColor + '20',
            color: statusColor,
            fontWeight: '600'
          }}>
            {isPaused ? 'paused' : container.state}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
          {container.status}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleViewLogs(container.id, container.name)}
            data-testid="view-logs-btn"
            data-tooltip="infra-view-logs"
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              background: 'var(--bg-elev1)',
              color: 'var(--link)',
              border: '1px solid var(--link)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            View Logs
          </button>
          {container.state === 'running' && !isPaused && (
            <>
              <button
                onClick={() => handlePauseContainer(container.id, container.name)}
                data-testid="pause-container-btn"
                data-tooltip="infra-pause-container"
                style={{
                  fontSize: '10px',
                  padding: '4px 8px',
                  background: 'var(--bg-elev1)',
                  color: 'var(--warn)',
                  border: '1px solid var(--warn)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⏸ Pause
              </button>
              <button
                onClick={() => handleContainerAction('stop', container.id)}
                style={{
                  fontSize: '10px',
                  padding: '4px 8px',
                  background: 'var(--bg-elev1)',
                  color: 'var(--err)',
                  border: '1px solid var(--err)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Stop
              </button>
            </>
          )}
          {isPaused && (
            <button
              onClick={() => handleUnpauseContainer(container.id, container.name)}
              data-testid="unpause-container-btn"
              data-tooltip="infra-unpause-container"
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                background: 'var(--bg-elev1)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ▶ Unpause
            </button>
          )}
          {container.state !== 'running' && !isPaused && (
            <button
              onClick={() => handleContainerAction('start', container.id)}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                background: 'var(--bg-elev1)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Start
            </button>
          )}
          <button
            onClick={() => handleContainerAction('restart', container.id)}
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              background: 'var(--bg-elev1)',
              color: 'var(--warn)',
              border: '1px solid var(--warn)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Restart
          </button>
          <button
            onClick={() => handleRemoveContainer(container.id, container.name)}
            data-testid="remove-container-btn"
            data-tooltip="infra-remove-container"
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              background: 'var(--bg-elev1)',
              color: 'var(--err)',
              border: '1px solid var(--err)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑 Remove
          </button>
        </div>
      </div>
    );
  };

  const handleContainerAction = async (action: string, containerId: string) => {
    setLoading(true);
    setActionMessage(`${action}ing container...`);
    try {
      if (action === 'start') await dockerApi.startContainer(containerId);
      else if (action === 'stop') await dockerApi.stopContainer(containerId);
      else if (action === 'restart') await dockerApi.restartContainer(containerId);

      setActionMessage(`Container ${action}ed successfully`);
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      setActionMessage(`Failed to ${action} container: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleViewLogs = async (containerId: string, containerName: string) => {
    setLogsContainerName(containerName);
    setLogsContainerId(containerId);
    setLogsModalOpen(true);
    setLogsLoading(true);
    setLogsContent('');

    try {
      const response = await dockerApi.getContainerLogs(containerId, 500);
      setLogsContent(response.logs || 'No logs available');
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogsContent('Error loading logs: ' + error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    if (!logsContainerId) return;
    setLogsLoading(true);
    try {
      const response = await dockerApi.getContainerLogs(logsContainerId, 500);
      setLogsContent(response.logs || 'No logs available');
    } catch (error) {
      console.error('Failed to refresh logs:', error);
      setLogsContent('Error loading logs: ' + error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePauseContainer = async (containerId: string, containerName: string) => {
    setLoading(true);
    setActionMessage(`Pausing ${containerName}...`);
    try {
      await dockerApi.pauseContainer(containerId);
      setActionMessage(`Container ${containerName} paused`);
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      console.error('Failed to pause:', error);
      setActionMessage(`Failed to pause container: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleUnpauseContainer = async (containerId: string, containerName: string) => {
    setLoading(true);
    setActionMessage(`Resuming ${containerName}...`);
    try {
      await dockerApi.unpauseContainer(containerId);
      setActionMessage(`Container ${containerName} resumed`);
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      console.error('Failed to unpause:', error);
      setActionMessage(`Failed to unpause container: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleRemoveContainer = async (containerId: string, containerName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove container "${containerName}"?\n\n` +
      `This action cannot be undone. Data volumes may be preserved depending on configuration.`
    );

    if (!confirmed) return;

    setLoading(true);
    setActionMessage(`Removing ${containerName}...`);
    try {
      await dockerApi.removeContainer(containerId);
      setActionMessage(`Container "${containerName}" removed`);
      setTimeout(() => fetchAllStatus(), 1000);
    } catch (error) {
      console.error('Failed to remove:', error);
      setActionMessage(`Failed to remove container: ${error}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Action message */}
      {actionMessage && (
        <div style={{
          padding: '12px',
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12px',
          color: 'var(--fg)'
        }}>
          {actionMessage}
        </div>
      )}

      {/* Infrastructure Services */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>
          <span style={{ color: 'var(--warn)' }}>●</span> Infrastructure Services
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {renderServiceCard(
            qdrantStatus,
            <>
              <button
                id="btn-qdrant-open"
                onClick={handleQdrantOpen}
                className="small-button"
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  color: 'var(--link)',
                  border: '1px solid var(--link)'
                }}
              >
                🌐 Open UI
              </button>
              <button
                id="btn-qdrant-restart"
                onClick={handleQdrantRestart}
                disabled={loading}
                className="small-button"
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  color: 'var(--warn)',
                  border: '1px solid var(--warn)'
                }}
              >
                ↻ Restart
              </button>
            </>
          )}

          {renderServiceCard(
            redisStatus,
            <>
              <button
                id="btn-redis-ping"
                onClick={handleRedisPing}
                disabled={loading}
                className="small-button"
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  color: 'var(--err)',
                  border: '1px solid var(--err)'
                }}
              >
                📡 Ping
              </button>
              <button
                id="btn-redis-restart"
                onClick={handleRedisRestart}
                disabled={loading}
                className="small-button"
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  color: 'var(--warn)',
                  border: '1px solid var(--warn)'
                }}
              >
                ↻ Restart
              </button>
            </>
          )}

          {renderServiceCard(
            prometheusStatus,
            <button
              id="btn-prometheus-open"
              onClick={handlePrometheusOpen}
              className="small-button"
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--warn)',
                border: '1px solid var(--warn)'
              }}
            >
              🌐 Open UI
            </button>
          )}

          {renderServiceCard(
            grafanaStatus,
            <button
              id="btn-grafana-open"
              onClick={handleGrafanaOpen}
              className="small-button"
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--link)',
                border: '1px solid var(--link)'
              }}
            >
              🌐 Open UI
            </button>
          )}

          {renderServiceCard(
            lokiStatus,
            <div data-tooltip="infra-loki-status" style={{
              fontSize: '11px',
              color: 'var(--fg-muted)',
              padding: '4px'
            }}>
              {lokiStatus.status === 'online'
                ? 'Collecting and indexing logs from all services'
                : 'Not reachable - log aggregation unavailable'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="btn-infra-up"
            onClick={handleInfraUp}
            disabled={loading}
            className="small-button"
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              padding: '12px',
              fontWeight: '600'
            }}
          >
            ▶ Start All Infrastructure
          </button>
          <button
            id="btn-infra-down"
            onClick={handleInfraDown}
            disabled={loading}
            className="small-button"
            style={{
              flex: 1,
              background: 'var(--err)',
              color: 'var(--fg)',
              padding: '12px',
              fontWeight: '600'
            }}
          >
            ■ Stop All Infrastructure
          </button>
        </div>
      </div>

      {/* Docker Status */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3 id="infra-docker-anchor">
          <span style={{ color: 'var(--link)' }}>●</span> Docker Status
          <button
            id="btn-docker-refresh"
            onClick={handleDockerRefresh}
            className="small-button"
            style={{
              float: 'right',
              padding: '4px 12px',
              fontSize: '11px'
            }}
          >
            ↻ Refresh All
          </button>
        </h3>

        <div id="docker-status-display" style={{ marginBottom: '16px' }}>
          {dockerStatus ? (
            <div style={{
              padding: '12px',
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Status:</span>
                <span style={{ color: dockerStatus.running ? 'var(--accent)' : 'var(--err)' }}>
                  {dockerStatus.running ? '● Running' : '○ Not Running'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                <span>Runtime:</span>
                <span>{dockerStatus.runtime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                <span>Containers:</span>
                <span>{dockerStatus.containers_count}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>Loading...</div>
          )}
        </div>

        {/* Runtime Mode Toggle */}
        <div className="input-row" style={{ marginTop: '8px' }}>
          <div className="input-group">
            <label>
              Runtime Mode (DEV_LOCAL_UVICORN)
            </label>
            <select
              id="infra-runtime-mode"
              value={runtimeMode}
              onChange={(e) => setRuntimeMode(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              <option value="0">Docker (default)</option>
              <option value="1">Local uvicorn (dev-only)</option>
            </select>
            <div className="small" style={{ color: 'var(--fg-muted)', marginTop: '6px' }}>
              Switch to Local uvicorn for development. In dev launcher, this scales Docker API to 0 and starts uvicorn on your host.
            </div>
            <button
              onClick={handleSaveRuntimeMode}
              disabled={loading}
              className="small-button"
              style={{
                marginTop: '8px',
                background: 'var(--link)',
                color: 'var(--accent-contrast)',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              💾 {loading ? 'Saving...' : 'Save Runtime Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* AGRO Containers */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>
          <span style={{ color: 'var(--accent)' }}>●</span> AGRO Containers
        </h3>
        <p className="small" style={{ color: 'var(--fg-muted)', marginBottom: '12px' }}>
          Core containers managed by docker-compose.services.yml.
        </p>
        <div id="agro-containers-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {agroContainers.length > 0 ? (
            agroContainers.map(renderContainer)
          ) : (
            <div style={{ color: 'var(--fg-muted)', padding: '16px' }}>
              No AGRO containers found
            </div>
          )}
        </div>
      </div>

      {/* All Containers */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> All Containers
          <button
            id="btn-docker-refresh-containers"
            onClick={handleDockerRefresh}
            className="small-button"
            style={{
              float: 'right',
              padding: '4px 12px',
              fontSize: '11px'
            }}
          >
            ↻ Refresh
          </button>
        </h3>
        <p className="small" style={{ color: 'var(--fg-muted)', marginBottom: '12px' }}>
          Every Docker container detected on this host (including AGRO and user projects).
        </p>
        <div id="docker-containers-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {containers.length > 0 ? (
            containers.map(renderContainer)
          ) : (
            <div style={{ color: 'var(--fg-muted)', padding: '16px' }}>
              Loading containers...
            </div>
          )}
        </div>
      </div>

      {/* Logs Modal */}
      {logsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setLogsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '1000px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderBottom: '1px solid var(--line)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                Container Logs: {logsContainerName}
              </h3>
              <button
                onClick={() => setLogsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              background: 'var(--bg-elev1)'
            }}>
              {logsLoading ? (
                <div style={{ color: 'var(--fg-muted)' }}>Loading logs...</div>
              ) : (
                <pre
                  data-testid="logs-content"
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--fg)',
                    lineHeight: '1.4'
                  }}
                >
                  {logsContent}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '16px',
              borderTop: '1px solid var(--line)'
            }}>
              <button
                onClick={handleRefreshLogs}
                disabled={logsLoading}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: 'var(--link)',
                  color: 'var(--fg)',
                  border: '1px solid var(--link)',
                  borderRadius: '4px',
                  cursor: logsLoading ? 'not-allowed' : 'pointer',
                  opacity: logsLoading ? 0.5 : 1
                }}
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setLogsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
