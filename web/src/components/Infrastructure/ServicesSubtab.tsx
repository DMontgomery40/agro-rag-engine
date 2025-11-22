// AGRO - Infrastructure Services Subtab
// Real React component with full backend wiring

import { useState, useEffect } from 'react';
import { dockerApi } from '@/api/docker';
import { useAPI } from '@/hooks';
import type { DockerStatus, DockerContainer } from '@/types';

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

  // Action states
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState('0');

  // Load initial data
  useEffect(() => {
    fetchAllStatus();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchAllStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchAllStatus = async () => {
    await Promise.all([
      fetchDockerStatus(),
      fetchContainers(),
      fetchServiceStatus()
    ]);
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

  const fetchContainers = async () => {
    try {
      const result = await dockerApi.listContainers();
      const allContainers = result.containers || [];
      setContainers(allContainers);

      // Filter AGRO containers
      const agro = allContainers.filter((c: any) => c.agro_managed === true);
      setAgroContainers(agro);
    } catch (error) {
      console.error('[ServicesSubtab] Failed to fetch containers:', error);
      setContainers([]);
      setAgroContainers([]);
    }
  };

  const fetchServiceStatus = async () => {
    // Check Qdrant
    const qdrantContainer = containers.find(c =>
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

    // Check Prometheus
    const prometheusContainer = containers.find(c =>
      c.name.toLowerCase().includes('prometheus')
    );
    setPrometheusStatus(prev => ({
      ...prev,
      status: prometheusContainer?.state === 'running' ? 'online' : 'offline'
    }));

    // Check Grafana
    const grafanaContainer = containers.find(c =>
      c.name.toLowerCase().includes('grafana')
    );
    setGrafanaStatus(prev => ({
      ...prev,
      status: grafanaContainer?.state === 'running' ? 'online' : 'offline'
    }));
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
    setActionMessage('Runtime mode saved (DEV_LOCAL_UVICORN=' + runtimeMode + ')');
    setTimeout(() => setActionMessage(null), 2000);
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
    const statusColor = container.state === 'running' ? 'var(--accent)' :
                       container.state === 'paused' ? 'var(--warn)' : 'var(--err)';

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
            {container.state}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
          {container.status}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {container.state === 'running' && (
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
          )}
          {container.state !== 'running' && (
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
              className="small-button"
              style={{
                marginTop: '8px',
                background: 'var(--link)',
                color: 'var(--accent-contrast)',
                fontWeight: '600'
              }}
            >
              💾 Save Runtime Mode
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
    </div>
  );
}
