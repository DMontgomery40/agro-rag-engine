// AGRO - Services Subtab Component
// Docker container management and infrastructure services

import { useState, useEffect } from 'react';

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
  cpu?: number;
  memory?: number;
}

interface ServiceStatus {
  status: 'running' | 'stopped' | 'unknown';
  message?: string;
}

export function ServicesSubtab() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({
    qdrant: { status: 'unknown' },
    redis: { status: 'unknown' },
    prometheus: { status: 'unknown' },
    grafana: { status: 'unknown' }
  });
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [containerLogs, setContainerLogs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContainers();
    checkServiceStatuses();
    const interval = setInterval(() => {
      loadContainers();
      checkServiceStatuses();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const api = (path: string) => {
    const base = (window as any).API_BASE_URL || '';
    return `${base}${path}`;
  };

  async function loadContainers() {
    try {
      const response = await fetch(api('/api/docker/containers/all'));
      const data = await response.json();
      if (data.containers) {
        setContainers(data.containers);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load containers:', error);
      setLoading(false);
    }
  }

  async function checkServiceStatuses() {
    // Check Qdrant
    try {
      await fetch('http://127.0.0.1:6333/collections', { mode: 'no-cors' });
      setServiceStatuses(prev => ({ ...prev, qdrant: { status: 'running' } }));
    } catch {
      setServiceStatuses(prev => ({ ...prev, qdrant: { status: 'stopped' } }));
    }

    // Check Redis
    try {
      const response = await fetch(api('/api/docker/redis/ping'));
      const data = await response.json();
      setServiceStatuses(prev => ({
        ...prev,
        redis: { status: data.success ? 'running' : 'stopped' }
      }));
    } catch {
      setServiceStatuses(prev => ({ ...prev, redis: { status: 'stopped' } }));
    }

    // Check Prometheus
    try {
      await fetch('http://127.0.0.1:9090/-/ready', { mode: 'no-cors' });
      setServiceStatuses(prev => ({ ...prev, prometheus: { status: 'running' } }));
    } catch {
      setServiceStatuses(prev => ({ ...prev, prometheus: { status: 'stopped' } }));
    }

    // Check Grafana
    try {
      await fetch('http://127.0.0.1:3000/api/health', { mode: 'no-cors' });
      setServiceStatuses(prev => ({ ...prev, grafana: { status: 'running' } }));
    } catch {
      setServiceStatuses(prev => ({ ...prev, grafana: { status: 'stopped' } }));
    }
  }

  async function startInfrastructure() {
    try {
      const response = await fetch(api('/api/docker/infra/up'), { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert('Infrastructure started successfully');
        loadContainers();
        checkServiceStatuses();
      } else {
        alert(`Failed to start infrastructure: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error starting infrastructure: ${error.message}`);
    }
  }

  async function stopInfrastructure() {
    if (!confirm('Are you sure you want to stop all infrastructure services?')) return;
    try {
      const response = await fetch(api('/api/docker/infra/down'), { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert('Infrastructure stopped');
        loadContainers();
        checkServiceStatuses();
      } else {
        alert(`Failed to stop infrastructure: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error stopping infrastructure: ${error.message}`);
    }
  }

  async function containerAction(containerId: string, action: string) {
    try {
      const response = await fetch(api(`/api/docker/container/${containerId}/${action}`), {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        loadContainers();
      } else {
        alert(`Failed to ${action} container: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function toggleLogs(containerId: string) {
    if (expandedLogs[containerId]) {
      setExpandedLogs(prev => ({ ...prev, [containerId]: false }));
    } else {
      setExpandedLogs(prev => ({ ...prev, [containerId]: true }));
      if (!containerLogs[containerId]) {
        await loadLogs(containerId);
      }
    }
  }

  async function loadLogs(containerId: string) {
    try {
      const response = await fetch(api(`/api/docker/container/${containerId}/logs`));
      const data = await response.json();
      if (data.success) {
        setContainerLogs(prev => ({ ...prev, [containerId]: data.logs }));
      }
    } catch (error) {
      setContainerLogs(prev => ({ ...prev, [containerId]: 'Failed to load logs' }));
    }
  }

  const statusColor = (status: string) => {
    if (status === 'running') return 'var(--accent)';
    if (status === 'stopped') return 'var(--err)';
    return 'var(--fg-muted)';
  };

  const statusIcon = (status: string) => {
    if (status === 'running') return '●';
    if (status === 'stopped') return '○';
    return '?';
  };

  return (
    <div className="settings-section">
      <h2>Infrastructure Services</h2>

      {/* Core Services Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {/* Qdrant */}
        <div style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--accent)' }}>Qdrant</div>
            <div style={{ fontSize: '11px', color: statusColor(serviceStatuses.qdrant.status) }}>
              {statusIcon(serviceStatuses.qdrant.status)} {serviceStatuses.qdrant.status.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
            Vector database • Port 6333
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="small-button"
              onClick={() => window.open('http://127.0.0.1:6333/dashboard', '_blank')}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
            >
              Open UI
            </button>
            <button
              className="small-button"
              onClick={() => alert('Restart feature coming soon')}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)' }}
            >
              Restart
            </button>
          </div>
        </div>

        {/* Redis */}
        <div style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--err)' }}>Redis</div>
            <div style={{ fontSize: '11px', color: statusColor(serviceStatuses.redis.status) }}>
              {statusIcon(serviceStatuses.redis.status)} {serviceStatuses.redis.status.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
            Memory store • Port 6379
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="small-button"
              onClick={async () => {
                try {
                  const r = await fetch(api('/api/docker/redis/ping'));
                  const d = await r.json();
                  alert(d.success ? 'Redis PONG!' : 'Redis not responding');
                } catch {
                  alert('Failed to ping Redis');
                }
              }}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)' }}
            >
              Ping
            </button>
            <button
              className="small-button"
              onClick={() => alert('Restart feature coming soon')}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)' }}
            >
              Restart
            </button>
          </div>
        </div>

        {/* Prometheus */}
        <div style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--warn)' }}>Prometheus</div>
            <div style={{ fontSize: '11px', color: statusColor(serviceStatuses.prometheus.status) }}>
              {statusIcon(serviceStatuses.prometheus.status)} {serviceStatuses.prometheus.status.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
            Metrics collector • Port 9090
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="small-button"
              onClick={() => window.open('http://127.0.0.1:9090', '_blank')}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)' }}
            >
              Open UI
            </button>
          </div>
        </div>

        {/* Grafana */}
        <div style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--link)' }}>Grafana</div>
            <div style={{ fontSize: '11px', color: statusColor(serviceStatuses.grafana.status) }}>
              {statusIcon(serviceStatuses.grafana.status)} {serviceStatuses.grafana.status.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
            Dashboards • Port 3000
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="small-button"
              onClick={() => window.open('http://127.0.0.1:3000', '_blank')}
              style={{ flex: '1', background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
            >
              Open UI
            </button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--fg-muted)', marginTop: '8px' }}>
            Login: admin / ********
          </div>
        </div>
      </div>

      {/* Infrastructure Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className="small-button"
          onClick={startInfrastructure}
          style={{ flex: '1', background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '12px', fontWeight: '600' }}
        >
          Start All Infrastructure
        </button>
        <button
          className="small-button"
          onClick={stopInfrastructure}
          style={{ flex: '1', background: 'var(--err)', color: 'var(--fg)', padding: '12px', fontWeight: '600' }}
        >
          Stop All Infrastructure
        </button>
      </div>

      {/* All Containers Section */}
      <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>
        All Containers
        <button
          className="small-button"
          onClick={loadContainers}
          style={{ float: 'right', padding: '4px 12px', fontSize: '11px' }}
        >
          Refresh
        </button>
      </h3>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
          Loading containers...
        </div>
      ) : containers.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
          No containers found
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {containers.map(container => {
            const isRunning = container.state === 'running';
            const isPaused = container.state === 'paused';
            const isExited = container.state === 'exited';

            let statusColor = 'var(--fg-muted)';
            let statusIcon = '○';
            if (isRunning) { statusColor = 'var(--ok)'; statusIcon = '●'; }
            else if (isPaused) { statusColor = 'var(--warn)'; statusIcon = '⏸'; }
            else if (isExited) { statusColor = 'var(--err)'; statusIcon = '■'; }

            return (
              <div key={container.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--fg)' }}>{container.name}</div>
                  <div style={{ fontSize: '10px', color: statusColor }}>{statusIcon} {container.state.toUpperCase()}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: 'monospace', marginBottom: '8px' }}>
                  {container.image}
                </div>
                {container.ports && (
                  <div style={{ fontSize: '10px', color: 'var(--link)', marginBottom: '8px' }}>{container.ports}</div>
                )}

                <div style={{ display: 'flex', gap: '4px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {isRunning && (
                    <>
                      <button
                        className="small-button"
                        onClick={() => containerAction(container.id, 'pause')}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--warn)', border: '1px solid var(--warn)', padding: '6px', fontSize: '10px' }}
                      >
                        Pause
                      </button>
                      <button
                        className="small-button"
                        onClick={() => containerAction(container.id, 'stop')}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--err)', border: '1px solid var(--err)', padding: '6px', fontSize: '10px' }}
                      >
                        Stop
                      </button>
                    </>
                  )}
                  {isPaused && (
                    <>
                      <button
                        className="small-button"
                        onClick={() => containerAction(container.id, 'unpause')}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--ok)', border: '1px solid var(--ok)', padding: '6px', fontSize: '10px' }}
                      >
                        Unpause
                      </button>
                      <button
                        className="small-button"
                        onClick={() => containerAction(container.id, 'stop')}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--err)', border: '1px solid var(--err)', padding: '6px', fontSize: '10px' }}
                      >
                        Stop
                      </button>
                    </>
                  )}
                  {isExited && (
                    <>
                      <button
                        className="small-button"
                        onClick={() => containerAction(container.id, 'start')}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--ok)', border: '1px solid var(--ok)', padding: '6px', fontSize: '10px' }}
                      >
                        Start
                      </button>
                      <button
                        className="small-button"
                        onClick={() => {
                          if (confirm('WARNING: This will permanently delete the container. Are you sure?')) {
                            containerAction(container.id, 'remove');
                          }
                        }}
                        style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--err)', border: '1px solid var(--err)', padding: '6px', fontSize: '10px' }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  <button
                    className="small-button"
                    onClick={() => toggleLogs(container.id)}
                    style={{ flex: '1', background: 'var(--bg-elev1)', color: 'var(--link)', border: '1px solid var(--link)', padding: '6px', fontSize: '10px' }}
                  >
                    {expandedLogs[container.id] ? 'Hide Logs' : 'View Logs'}
                  </button>
                </div>

                {/* Logs Section */}
                {expandedLogs[container.id] && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                    <div style={{ background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '4px', padding: '12px', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {containerLogs[container.id] || 'Loading logs...'}
                      </pre>
                    </div>
                    <button
                      className="small-button"
                      onClick={() => loadLogs(container.id)}
                      style={{ marginTop: '8px', background: 'var(--bg-elev1)', color: 'var(--link)', border: '1px solid var(--link)', padding: '6px', fontSize: '10px' }}
                    >
                      Refresh Logs
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
