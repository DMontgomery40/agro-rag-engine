import { useState, useEffect } from 'react';
import { useDockerStore } from '@/stores';

interface InfraService {
  name: string;
  displayName: string;
  description: string;
  port: string;
  color: string;
}

const infraServices: InfraService[] = [
  {
    name: 'qdrant',
    displayName: 'Qdrant',
    description: 'Vector database - Port 6333',
    port: '6333',
    color: 'var(--accent)',
  },
  {
    name: 'redis',
    displayName: 'Redis',
    description: 'Memory store - Port 6379',
    port: '6379',
    color: '#ef4444',
  },
  {
    name: 'prometheus',
    displayName: 'Prometheus',
    description: 'Metrics collector - Port 9090',
    port: '9090',
    color: '#f59e0b',
  },
  {
    name: 'grafana',
    displayName: 'Grafana',
    description: 'Dashboard - Port 3000',
    port: '3000',
    color: '#f59e0b',
  },
];

export function Docker() {
  const { status, containers, fetchStatus, fetchContainers, startContainer, stopContainer, restartContainer } = useDockerStore();
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<Record<string, string>>({});
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchContainers()]);
      setLoading(false);
    };

    loadData();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchContainers();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchContainers]);

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    const container = containers.find(c => c.name.includes(serviceName));
    if (!container) {
      alert(`Container for ${serviceName} not found`);
      return;
    }

    setActionInProgress(`${container.id}-${action}`);

    try {
      if (action === 'start') {
        await startContainer(container.id);
      } else if (action === 'stop') {
        await stopContainer(container.id);
      } else if (action === 'restart') {
        await restartContainer(container.id);
      }
    } catch (error) {
      alert(`Failed to ${action} ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStartAllInfrastructure = async () => {
    setActionInProgress('start-all');

    for (const service of infraServices) {
      const container = containers.find(c => c.name.includes(service.name));
      if (container && container.state !== 'running') {
        try {
          await startContainer(container.id);
        } catch (error) {
          console.error(`Failed to start ${service.name}:`, error);
        }
      }
    }

    setActionInProgress(null);
  };

  const handleStopAllInfrastructure = async () => {
    if (!confirm('Are you sure you want to stop all infrastructure services?')) return;

    setActionInProgress('stop-all');

    for (const service of infraServices) {
      const container = containers.find(c => c.name.includes(service.name));
      if (container && container.state === 'running') {
        try {
          await stopContainer(container.id);
        } catch (error) {
          console.error(`Failed to stop ${service.name}:`, error);
        }
      }
    }

    setActionInProgress(null);
  };

  const handleViewLogs = async (containerId: string, containerName: string) => {
    try {
      const response = await fetch(`/api/docker/logs/${containerId}?tail=100`);
      if (response.ok) {
        const data = await response.json();
        setContainerLogs(prev => ({ ...prev, [containerId]: data.logs || 'No logs available' }));
        setShowLogsFor(containerId);
      }
    } catch (error) {
      alert(`Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getContainerForService = (serviceName: string) => {
    return containers.find(c => c.name.includes(serviceName));
  };

  const getContainerStatus = (serviceName: string): 'running' | 'stopped' | 'unknown' => {
    const container = getContainerForService(serviceName);
    if (!container) return 'unknown';
    return container.state === 'running' ? 'running' : 'stopped';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'var(--accent)';
      case 'stopped':
      case 'exited':
        return '#ef4444';
      default:
        return 'var(--fg-muted)';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Infrastructure Services */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          Infrastructure Services
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {infraServices.map(service => {
            const container = getContainerForService(service.name);
            const containerStatus = getContainerStatus(service.name);

            return (
              <div
                key={service.name}
                style={{
                  background: 'var(--bg-elev2)',
                  border: `1px solid ${service.color}`,
                  borderRadius: '6px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: service.color, marginBottom: '4px' }}>
                      {service.displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                      {service.description}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: getStatusColor(containerStatus),
                      fontWeight: 500,
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(containerStatus),
                        marginRight: '6px',
                      }}
                    />
                    {containerStatus === 'running' ? 'Running' : containerStatus === 'stopped' ? 'Stopped' : 'Unknown'}
                  </div>
                </div>

                {container && (
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
                    {container.status}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {containerStatus === 'running' ? (
                    <>
                      <button
                        onClick={() => handleServiceAction(service.name, 'restart')}
                        disabled={actionInProgress !== null}
                        style={{
                          background: 'var(--bg-elev1)',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Restart
                      </button>
                      <button
                        onClick={() => handleServiceAction(service.name, 'stop')}
                        disabled={actionInProgress !== null}
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => container && handleViewLogs(container.id, container.name)}
                        style={{
                          background: 'var(--bg-elev1)',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Logs
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleServiceAction(service.name, 'start')}
                      disabled={actionInProgress !== null}
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        border: 'none',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                        gridColumn: '1 / -1',
                      }}
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleStartAllInfrastructure}
            disabled={actionInProgress !== null}
            style={{
              flex: 1,
              background: actionInProgress ? 'var(--bg-elev2)' : 'var(--accent)',
              color: actionInProgress ? 'var(--fg-muted)' : 'var(--accent-contrast)',
              border: 'none',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: actionInProgress ? 'not-allowed' : 'pointer',
            }}
          >
            ▶ START ALL INFRASTRUCTURE
          </button>
          <button
            onClick={handleStopAllInfrastructure}
            disabled={actionInProgress !== null}
            style={{
              flex: 1,
              background: actionInProgress ? 'var(--bg-elev2)' : '#ef4444',
              color: actionInProgress ? 'var(--fg-muted)' : '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: actionInProgress ? 'not-allowed' : 'pointer',
            }}
          >
            ⏹ STOP ALL INFRASTRUCTURE
          </button>
        </div>
      </div>

      {/* Docker Status */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--fg)' }}>
            Docker Status
          </h3>
          <button
            onClick={() => {
              fetchStatus();
              fetchContainers();
            }}
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ↻ REFRESH ALL
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              DOCKER STATUS
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: status?.running ? 'var(--accent)' : '#ef4444',
                  marginRight: '8px',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 600, color: status?.running ? 'var(--accent)' : '#ef4444' }}>
                {status?.running ? 'Running' : 'Not Running'}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              RUNTIME
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
              {status?.runtime || 'Unknown'}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              CONTAINERS
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
              {status?.containers_count || 0}
            </div>
          </div>
        </div>
      </div>

      {/* All Containers */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          All Containers
        </h3>

        {containers.length === 0 ? (
          <div style={{ color: 'var(--fg-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            No containers found
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {containers.map(container => (
              <div
                key={container.id}
                style={{
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(container.state),
                          marginRight: '8px',
                        }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
                        {container.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                      {container.image}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                      {container.status}
                    </div>
                    {container.ports.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>
                        Ports: {container.ports.map(p => `${p.PublicPort || p.PrivatePort}/${p.Type}`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {container.state === 'running' ? (
                      <>
                        <button
                          onClick={() => restartContainer(container.id)}
                          disabled={actionInProgress !== null}
                          style={{
                            background: 'var(--bg-elev1)',
                            color: 'var(--fg)',
                            border: '1px solid var(--line)',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: actionInProgress ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Restart
                        </button>
                        <button
                          onClick={() => stopContainer(container.id)}
                          disabled={actionInProgress !== null}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: actionInProgress ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => handleViewLogs(container.id, container.name)}
                          style={{
                            background: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Logs
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startContainer(container.id)}
                        disabled={actionInProgress !== null}
                        style={{
                          background: 'var(--accent)',
                          color: 'var(--accent-contrast)',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: actionInProgress ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {showLogsFor && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
            }}
            onClick={() => setShowLogsFor(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-elev1)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '20px',
              zIndex: 10000,
              width: '80%',
              maxWidth: '800px',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--fg)' }}>
                Container Logs
              </h3>
              <button
                onClick={() => setShowLogsFor(null)}
                style={{
                  background: 'transparent',
                  color: 'var(--fg)',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: '#000',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '12px',
                borderRadius: '4px',
                flex: 1,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {containerLogs[showLogsFor] || 'Loading logs...'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
