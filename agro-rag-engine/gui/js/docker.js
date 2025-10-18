// AGRO GUI - Docker Management Module
// Handles Docker status, containers, and infrastructure services

(function () {
    'use strict';

    const { api, $, state } = window.CoreUtils || {};

    if (!api || !$ || !state) {
        console.error('[docker.js] CoreUtils not loaded!');
        return;
    }

    /**
     * Check Docker status
     */
    async function checkDockerStatus() {
        const display = $('#docker-status-display');
        if (!display) return;

        try {
            const response = await fetch(api('/api/docker/status'));
            const data = await response.json();

            let html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="background: var(--card-bg); border: 1px solid ${data.running ? 'var(--ok)' : 'var(--err)'}; border-radius: 6px; padding: 16px;">
                        <div style="color: var(--fg-muted); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">Docker Status</div>
                        <div style="color: ${data.running ? 'var(--ok)' : 'var(--err)'}; font-size: 20px; font-weight: 700;">
                            ${data.running ? '✓ Running' : '✗ Not Running'}
                        </div>
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                        <div style="color: var(--fg-muted); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">Runtime</div>
                        <div style="color: var(--link); font-size: 16px; font-weight: 600;">
                            ${data.runtime || 'Unknown'}
                        </div>
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                        <div style="color: var(--fg-muted); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">Containers</div>
                        <div style="color: var(--warn); font-size: 20px; font-weight: 700;">
                            ${data.containers_count || 0}
                        </div>
                    </div>
                </div>
            `;

            display.innerHTML = html;
        } catch (e) {
            display.innerHTML = '<div style="color: var(--err); padding: 16px;">Failed to check Docker status</div>';
            console.error('[docker] Status check failed:', e);
        }
    }

    /**
     * List Docker containers
     */
    async function listContainers() {
        const grid = $('#docker-containers-grid');
        if (!grid) return;

        try {
            const response = await fetch(api('/api/docker/containers/all'));
            const data = await response.json();

            if (!data.containers || data.containers.length === 0) {
                grid.innerHTML = '<div style="color: var(--fg-muted); padding: 16px;">No containers found</div>';
                return;
            }

            let html = '';
            data.containers.forEach(container => {
                const isRunning = container.state === 'running';
                const isPaused = container.state === 'paused';
                const isExited = container.state === 'exited';
                
                let statusColor = 'var(--fg-muted)';
                let statusIcon = '○';
                if (isRunning) { statusColor = 'var(--ok)'; statusIcon = '●'; }
                else if (isPaused) { statusColor = 'var(--warn)'; statusIcon = '⏸'; }
                else if (isExited) { statusColor = 'var(--err)'; statusIcon = '■'; }

                html += `
                    <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-weight: 600; color: var(--fg);">${container.name}</div>
                            <div style="font-size: 10px; color: ${statusColor};">${statusIcon} ${container.state.toUpperCase()}</div>
                        </div>
                        <div style="font-size: 11px; color: var(--fg-muted); font-family: 'SF Mono', monospace; margin-bottom: 8px;">
                            ${container.image}
                        </div>
                        ${container.ports ? `<div style="font-size: 10px; color: var(--link); margin-bottom: 8px;">${container.ports}</div>` : ''}
                        
                        <div style="display: flex; gap: 4px; margin-top: 12px;">
                            ${isRunning ? `
                                <button class="small-button" onclick="window.Docker.pauseContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--warn); border: 1px solid var(--warn); padding: 6px; font-size: 10px;">
                                    ⏸ Pause
                                </button>
                                <button class="small-button" onclick="window.Docker.stopContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                                    ■ Stop
                                </button>
                            ` : ''}
                            ${isPaused ? `
                                <button class="small-button" onclick="window.Docker.unpauseContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                                    ▶ Unpause
                                </button>
                                <button class="small-button" onclick="window.Docker.stopContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                                    ■ Stop
                                </button>
                            ` : ''}
                            ${isExited ? `
                                <button class="small-button" onclick="window.Docker.startContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                                    ▶ Start
                                </button>
                                <button class="small-button" onclick="window.Docker.removeContainer('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                                    🗑 Remove
                                </button>
                            ` : ''}
                            <button class="small-button" onclick="window.Docker.toggleLogs('${container.id}', '${container.name}')" 
                                id="btn-logs-${container.id}"
                                style="flex: 1; background: var(--bg-elev1); color: var(--link); border: 1px solid var(--link, var(--link)); padding: 6px; font-size: 10px;">
                                📄 Logs ▼
                            </button>
                        </div>

                        <!-- Collapsible Logs Section -->
                        <div id="logs-${container.id}" style="display: none; margin-top: 12px; border-top: 1px solid var(--line); padding-top: 12px;">
                            <div style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 4px; padding: 12px; max-height: 400px; overflow-y: auto; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; line-height: 1.4;">
                                <div id="logs-content-${container.id}" style="color: var(--code-fg);">
                                    Loading logs...
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <button class="small-button" onclick="window.Docker.refreshLogs('${container.id}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--link); border: 1px solid var(--link, var(--link)); padding: 6px; font-size: 10px;">
                                    ↻ Refresh Logs
                                </button>
                                <button class="small-button" onclick="window.Docker.downloadLogs('${container.id}', '${container.name}')" 
                                    style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                                    ⬇ Download Full Logs
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            grid.innerHTML = html;
        } catch (e) {
            grid.innerHTML = '<div style="color: var(--err); padding: 16px;">Failed to list containers</div>';
            console.error('[docker] Container list failed:', e);
        }
    }

    /**
     * Container control functions
     */
    async function pauseContainer(containerId) {
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/pause`), { method: 'POST' });
            const d = await r.json();
            if (d.success) {
                if (window.showStatus) window.showStatus('Container paused', 'success');
                await listContainers();
            } else throw new Error(d.error);
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to pause: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    async function unpauseContainer(containerId) {
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/unpause`), { method: 'POST' });
            const d = await r.json();
            if (d.success) {
                if (window.showStatus) window.showStatus('Container unpaused', 'success');
                await listContainers();
            } else throw new Error(d.error);
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to unpause: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    async function stopContainer(containerId) {
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/stop`), { method: 'POST' });
            const d = await r.json();
            if (d.success) {
                if (window.showStatus) window.showStatus('Container stopped', 'success');
                await listContainers();
            } else throw new Error(d.error);
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to stop: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    async function startContainer(containerId) {
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/start`), { method: 'POST' });
            const d = await r.json();
            if (d.success) {
                if (window.showStatus) window.showStatus('Container started', 'success');
                await listContainers();
            } else throw new Error(d.error);
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to start: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    async function removeContainer(containerId) {
        if (!confirm('Are you sure you want to remove this container?')) return;
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/remove`), { method: 'POST' });
            const d = await r.json();
            if (d.success) {
                if (window.showStatus) window.showStatus('Container removed', 'success');
                await listContainers();
            } else throw new Error(d.error);
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to remove: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    /**
     * Format and colorize log lines
     */
    function formatLogs(rawLogs) {
        if (!rawLogs) return '<span style="color: var(--fg-muted);">No logs available</span>';
        
        const lines = rawLogs.split('\n');
        let formatted = '';
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            // Try to extract timestamp (common formats: ISO8601, unix timestamp, etc)
            let timestamp = '';
            let logContent = line;
            
            // ISO timestamp pattern (2024-01-15T10:30:45.123Z or similar)
            const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/);
            if (isoMatch) {
                const date = new Date(isoMatch[1]);
                timestamp = date.toLocaleString('en-US', { 
                    hour12: false,
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                logContent = line.substring(isoMatch[0].length).trim();
            }
            // Docker timestamp pattern ([timestamp])
            else if (line.match(/^\[?\d{4}-\d{2}-\d{2}/)) {
                const parts = line.split(/\s+/, 2);
                timestamp = parts[0].replace(/[\[\]]/g, '');
                logContent = line.substring(parts[0].length).trim();
            }
            
            // Determine color based on log level
            let color = 'var(--accent)'; // default green
            const upperLine = line.toUpperCase();
            
            if (upperLine.includes('ERROR') || upperLine.includes('FATAL') || upperLine.includes('CRITICAL')) {
                color = 'var(--err)'; // red for errors
            } else if (upperLine.includes('WARN') || upperLine.includes('WARNING')) {
                color = 'var(--warn)'; // orange for warnings
            } else if (upperLine.includes('INFO')) {
                color = 'var(--link)'; // blue for info
            } else if (upperLine.includes('DEBUG') || upperLine.includes('TRACE')) {
                color = 'var(--fg-muted)'; // gray for debug
            }
            
            // Build formatted line
            if (timestamp) {
                formatted += `<div style="color: ${color}; margin-bottom: 2px;">`;
                formatted += `<span style="color: var(--fg-muted);">[${timestamp}]</span> `;
                formatted += `${escapeHtml(logContent)}`;
                formatted += `</div>`;
            } else {
                formatted += `<div style="color: ${color}; margin-bottom: 2px;">${escapeHtml(line)}</div>`;
            }
        });
        
        return formatted || '<span style="color: var(--fg-muted);">No logs available</span>';
    }

    /**
     * Escape HTML to prevent injection
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle logs visibility
     */
    async function toggleLogs(containerId, containerName) {
        const logsDiv = $(`#logs-${containerId}`);
        const btn = $(`#btn-logs-${containerId}`);
        
        if (!logsDiv) return;
        
        if (logsDiv.style.display === 'none') {
            // Show logs
            logsDiv.style.display = 'block';
            if (btn) btn.innerHTML = '📄 Logs ▲';
            // Load logs
            await refreshLogs(containerId);
        } else {
            // Hide logs
            logsDiv.style.display = 'none';
            if (btn) btn.innerHTML = '📄 Logs ▼';
        }
    }

    /**
     * Refresh logs for a container
     */
    async function refreshLogs(containerId) {
        const contentDiv = $(`#logs-content-${containerId}`);
        if (!contentDiv) return;
        
        contentDiv.innerHTML = '<span style="color: var(--warn);">Loading logs...</span>';
        
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/logs`));
            const d = await r.json();
            
            if (d.success) {
                contentDiv.innerHTML = formatLogs(d.logs);
                // Auto-scroll to bottom
                contentDiv.parentElement.scrollTop = contentDiv.parentElement.scrollHeight;
            } else {
                throw new Error(d.error);
            }
        } catch (e) {
            contentDiv.innerHTML = `<span style="color: var(--err);">Failed to load logs: ${escapeHtml(e.message)}</span>`;
        }
    }

    /**
     * Download full logs
     */
    async function downloadLogs(containerId, containerName) {
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/logs?tail=1000`));
            const d = await r.json();
            
            if (d.success) {
                // Create blob and download
                const blob = new Blob([d.logs], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${containerName}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.log`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                if (window.showStatus) window.showStatus('Logs downloaded', 'success');
            } else {
                throw new Error(d.error);
            }
        } catch (e) {
            if (window.showStatus) window.showStatus(`Failed to download logs: ${e.message}`, 'error');
            else alert(`Error: ${e.message}`);
        }
    }

    /**
     * Check infrastructure service status
     */
    async function checkInfraStatus() {
        // Check Qdrant
        try {
            const qdrantStatus = $('#qdrant-status');
            const r = await fetch('http://127.0.0.1:6333/collections', { mode: 'no-cors' });
            if (qdrantStatus) qdrantStatus.innerHTML = '<span style="color: var(--accent);">✓ Running</span>';
        } catch {
            const qdrantStatus = $('#qdrant-status');
            if (qdrantStatus) qdrantStatus.innerHTML = '<span style="color: var(--err);">✗ Not Running</span>';
        }

        // Check Redis
        try {
            const response = await fetch(api('/api/docker/redis/ping'));
            const data = await response.json();
            const redisStatus = $('#redis-status');
            if (redisStatus) {
                redisStatus.innerHTML = data.success ? 
                    '<span style="color: var(--accent);">✓ Running</span>' : 
                    '<span style="color: var(--err);">✗ Not Running</span>';
            }
        } catch {
            const redisStatus = $('#redis-status');
            if (redisStatus) redisStatus.innerHTML = '<span style="color: var(--err);">✗ Not Running</span>';
        }

        // Check Prometheus
        try {
            await fetch('http://127.0.0.1:9090/-/ready', { mode: 'no-cors' });
            const prometheusStatus = $('#prometheus-status');
            if (prometheusStatus) prometheusStatus.innerHTML = '<span style="color: var(--accent);">✓ Running</span>';
        } catch {
            const prometheusStatus = $('#prometheus-status');
            if (prometheusStatus) prometheusStatus.innerHTML = '<span style="color: var(--err);">✗ Not Running</span>';
        }

        // Check Grafana
        try {
            await fetch('http://127.0.0.1:3000/api/health', { mode: 'no-cors' });
            const grafanaStatus = $('#grafana-status');
            if (grafanaStatus) grafanaStatus.innerHTML = '<span style="color: var(--accent);">✓ Running</span>';
        } catch {
            const grafanaStatus = $('#grafana-status');
            if (grafanaStatus) grafanaStatus.innerHTML = '<span style="color: var(--err);">✗ Not Running</span>';
        }
    }

    /**
     * Start all infrastructure
     */
    async function startInfra() {
        const btn = $('#btn-infra-up');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch(api('/api/docker/infra/up'), { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                if (window.showStatus) {
                    window.showStatus('Infrastructure started successfully', 'success');
                } else {
                    alert('Infrastructure started!');
                }
                await checkInfraStatus();
                await checkDockerStatus();
                await listContainers();
            } else {
                throw new Error(data.error || 'Failed to start infrastructure');
            }
        } catch (e) {
            if (window.showStatus) {
                window.showStatus(`Failed to start infrastructure: ${e.message}`, 'error');
            } else {
                alert(`Error: ${e.message}`);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Stop all infrastructure
     */
    async function stopInfra() {
        const btn = $('#btn-infra-down');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch(api('/api/docker/infra/down'), { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                if (window.showStatus) {
                    window.showStatus('Infrastructure stopped', 'success');
                } else {
                    alert('Infrastructure stopped!');
                }
                await checkInfraStatus();
                await checkDockerStatus();
                await listContainers();
            } else {
                throw new Error(data.error || 'Failed to stop infrastructure');
            }
        } catch (e) {
            if (window.showStatus) {
                window.showStatus(`Failed to stop infrastructure: ${e.message}`, 'error');
            } else {
                alert(`Error: ${e.message}`);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Initialize Docker UI
     */
    function initDocker() {
        // Bind buttons
        const btnDockerRefresh = $('#btn-docker-refresh');
        const btnContainersRefresh = $('#btn-docker-refresh-containers');
        const btnInfraUp = $('#btn-infra-up');
        const btnInfraDown = $('#btn-infra-down');

        if (btnDockerRefresh) btnDockerRefresh.addEventListener('click', () => {
            checkDockerStatus();
            listContainers();
            checkInfraStatus();
        });
        
        if (btnContainersRefresh) btnContainersRefresh.addEventListener('click', listContainers);
        if (btnInfraUp) btnInfraUp.addEventListener('click', startInfra);
        if (btnInfraDown) btnInfraDown.addEventListener('click', stopInfra);

        // Service UI open buttons
        const btnQdrantOpen = $('#btn-qdrant-open');
        const btnPrometheusOpen = $('#btn-prometheus-open');
        const btnGrafanaOpen = $('#btn-grafana-open');

        if (btnQdrantOpen) btnQdrantOpen.addEventListener('click', () => window.open('http://127.0.0.1:6333/dashboard', '_blank'));
        if (btnPrometheusOpen) btnPrometheusOpen.addEventListener('click', () => window.open('http://127.0.0.1:9090', '_blank'));
        if (btnGrafanaOpen) btnGrafanaOpen.addEventListener('click', () => window.open('http://127.0.0.1:3000', '_blank'));

        // Redis ping
        const btnRedisPing = $('#btn-redis-ping');
        if (btnRedisPing) {
            btnRedisPing.addEventListener('click', async () => {
                try {
                    const r = await fetch(api('/api/docker/redis/ping'));
                    const d = await r.json();
                    alert(d.success ? '✓ Redis PONG!' : '✗ Redis not responding');
                } catch (e) {
                    alert('✗ Failed to ping Redis');
                }
            });
        }

        // Save docker settings
        const btnSaveSettings = $('#btn-save-docker-settings');
        if (btnSaveSettings && window.Config) {
            btnSaveSettings.addEventListener('click', async () => {
                if (window.Config.saveConfig) {
                    await window.Config.saveConfig();
                }
            });
        }

        // Initial load
        checkDockerStatus();
        listContainers();
        checkInfraStatus();

        console.log('[docker] Initialized');
    }

    // Export to window
    window.Docker = {
        initDocker,
        checkDockerStatus,
        listContainers,
        checkInfraStatus,
        startInfra,
        stopInfra,
        pauseContainer,
        unpauseContainer,
        stopContainer,
        startContainer,
        removeContainer,
        toggleLogs,
        refreshLogs,
        downloadLogs
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDocker);
    } else {
        initDocker();
    }

    console.log('[docker.js] Module loaded');
})();

