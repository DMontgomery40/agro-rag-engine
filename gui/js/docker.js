// AGRO GUI - Docker Management Module
// Handles Docker status, containers, and infrastructure services

(function () {
    'use strict';

    const { api, $, state } = window.CoreUtils || {};

    const AGRO_CONTAINER_NAMES = new Set([
        'agro-api',
        'agro-grafana',
        'agro-prometheus',
        'agro-promtail',
        'agro-alertmanager',
        'agro-openvscode',
        'rag-redis',
        'rag-service-mcp-http',
        'rag-service-node',
        'qdrant'
    ]);
    const AGRO_CONTAINER_PREFIXES = ['agro-', 'rag-', 'qdrant', 'redis', 'grafana', 'prometheus', 'promtail', 'alertmanager'];

    const SERVICE_CARD_CONFIG = {
        qdrant: {
            displayName: 'Qdrant',
            names: ['qdrant'],
            statusSelector: '#qdrant-status',
            restartButton: '#btn-qdrant-restart'
        },
        redis: {
            displayName: 'Redis',
            names: ['rag-redis', 'redis', 'agro-redis'],
            statusSelector: '#redis-status',
            restartButton: '#btn-redis-restart'
        },
        prometheus: {
            displayName: 'Prometheus',
            names: ['agro-prometheus', 'prometheus'],
            statusSelector: '#prometheus-status'
        },
        grafana: {
            displayName: 'Grafana',
            names: ['agro-grafana', 'grafana'],
            statusSelector: '#grafana-status'
        }
    };

    let dockerTerminal = null;

    if (!api || !$ || !state) {
        console.error('[docker.js] CoreUtils not loaded!');
        return;
    }

    function ensureDockerTerminal() {
        if (!window.LiveTerminal) {
            console.warn('[docker.js] LiveTerminal not available yet');
            return null;
        }
        if (!dockerTerminal) {
            dockerTerminal = new window.LiveTerminal('docker-terminal-container');
            dockerTerminal.setTitle('Docker Operations');
            dockerTerminal.hide();
        }
        return dockerTerminal;
    }

    function dockerLog(lines, { clear = false } = {}) {
        const terminal = ensureDockerTerminal();
        if (!terminal || !lines || !lines.length) return;
        if (clear) terminal.clear();
        terminal.show();
        lines.forEach(line => terminal.appendLine(line));
    }

    function dockerProgress(percent, label) {
        const terminal = ensureDockerTerminal();
        if (!terminal) return;
        terminal.updateProgress(Math.min(Math.max(percent, 0), 100), label);
    }

    function escapeAttr(text) {
        return String(text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    function isAgroContainer(container) {
        if (!container) return false;
        const name = (container.name || '').toLowerCase();
        const image = (container.image || '').toLowerCase();
        if (AGRO_CONTAINER_NAMES.has(name)) return true;
        return AGRO_CONTAINER_PREFIXES.some(prefix => name.startsWith(prefix) || image.includes(prefix));
    }

    function renderContainerCard(container, scope) {
        const normalizedScope = scope || 'all';
        const containerId = container.id || container.name || 'container';
        const safeDomId = domSafeId(containerId);
        const logsToggleId = `btn-logs-${normalizedScope}-${safeDomId}`;
        const logsContainerId = `logs-${normalizedScope}-${safeDomId}`;
        const logsContentId = `logs-content-${normalizedScope}-${safeDomId}`;

        const stateValue = (container.state || '').toLowerCase();
        const isRunning = stateValue === 'running';
        const isPaused = stateValue === 'paused';
        const isExited = stateValue === 'exited';

        let statusColor = 'var(--fg-muted)';
        let statusIcon = '○';
        if (isRunning) { statusColor = 'var(--ok)'; statusIcon = '●'; }
        else if (isPaused) { statusColor = 'var(--warn)'; statusIcon = '⏸'; }
        else if (isExited) { statusColor = 'var(--err)'; statusIcon = '■'; }

        const safeName = escapeHtml(container.name || containerId);
        const safeImage = escapeHtml(container.image || '');
        const portsText = container.ports ? String(container.ports) : '';
        const safePorts = escapeHtml(portsText || 'No ports exposed');
        const statusText = escapeHtml(container.status || container.raw_state || stateValue || 'unknown');
        const runningFor = escapeHtml(container.running_for || '');

        const badges = [];
        if (container.agro_managed) badges.push('<span style="background: var(--accent); color: var(--accent-contrast); border-radius: 999px; padding: 2px 6px; font-size: 10px;">AGRO</span>');
        if (container.compose_service) badges.push(`<span style="background: var(--bg-elev1); color: var(--fg-muted); border-radius: 999px; padding: 2px 6px; font-size: 10px;">${escapeHtml(container.compose_service)}</span>`);
        const badgesHtml = badges.length ? `<div style="display:flex; gap:6px; margin-top:4px;">${badges.join('')}</div>` : '';

        const detailLines = [];
        if (container.compose_project) detailLines.push(`Project: ${escapeHtml(container.compose_project)}`);
        if (container.compose_service) detailLines.push(`Service: ${escapeHtml(container.compose_service)}`);
        if (runningFor) detailLines.push(`Up ${runningFor}`);
        const detailHtml = detailLines.length ? `<div style="font-size: 10px; color: var(--fg-muted); margin-top: 4px;">${detailLines.join(' • ')}</div>` : '';

        const controlButtons = [];
        if (isRunning) {
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.pauseContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--warn); border: 1px solid var(--warn); padding: 6px; font-size: 10px;">
                    ⏸ Pause
                </button>`);
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.stopContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                    ■ Stop
                </button>`);
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.restartContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--warn); border: 1px solid var(--warn); padding: 6px; font-size: 10px;">
                    ↻ Restart
                </button>`);
        } else if (isPaused) {
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.unpauseContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                    ▶ Unpause
                </button>`);
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.stopContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                    ■ Stop
                </button>`);
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.restartContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--warn); border: 1px solid var(--warn); padding: 6px; font-size: 10px;">
                    ↻ Restart
                </button>`);
        } else {
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.startContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                    ▶ Start
                </button>`);
            controlButtons.push(`
                <button class="small-button" onclick="window.Docker.removeContainer('${normalizedScope}', '${containerId}', '${escapeAttr(container.name)}')"
                    style="flex: 1; background: var(--bg-elev1); color: var(--err); border: 1px solid var(--err); padding: 6px; font-size: 10px;">
                    🗑 Remove
                </button>`);
        }

        controlButtons.push(`
            <button class="small-button" onclick="window.Docker.toggleLogs('${normalizedScope}', '${containerId}')"
                id="${logsToggleId}"
                style="flex: 1; background: var(--bg-elev1); color: var(--link); border: 1px solid var(--link); padding: 6px; font-size: 10px;">
                📄 Logs ▼
            </button>`);

        const controlsHtml = controlButtons.join('');

        return `
            <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px;">
                    <div style="flex:1;">
                        <div style="font-size: 14px; font-weight: 600; color: var(--fg);">${safeName}</div>
                        <div style="font-size: 11px; color: var(--fg-muted);">${safeImage}</div>
                        ${badgesHtml}
                        ${detailHtml}
                    </div>
                    <div style="font-size: 18px; color: ${statusColor}; font-weight: 700;">${statusIcon} ${statusText}</div>
                </div>
                <div style="font-size: 11px; color: var(--fg-muted); margin-bottom: 12px; font-family: 'SF Mono', monospace;">${safePorts}</div>
                <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                    ${controlsHtml}
                </div>
                <div id="${logsContainerId}" style="display: none; margin-top: 12px; border-top: 1px solid var(--line); padding-top: 12px;">
                    <div style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 4px; padding: 12px; max-height: 400px; overflow-y: auto; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; line-height: 1.4;">
                        <div id="${logsContentId}" style="color: var(--code-fg);">
                            Loading logs...
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="small-button" onclick="window.Docker.refreshLogs('${normalizedScope}', '${containerId}')"
                            style="flex: 1; background: var(--bg-elev1); color: var(--link); border: 1px solid var(--link); padding: 6px; font-size: 10px;">
                            ↻ Refresh Logs
                        </button>
                        <button class="small-button" onclick="window.Docker.downloadLogs('${containerId}', '${escapeAttr(container.name)}')"
                            style="flex: 1; background: var(--bg-elev1); color: var(--ok); border: 1px solid var(--ok); padding: 6px; font-size: 10px;">
                            ⬇ Download Full Logs
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderContainerGrid(gridEl, containers, scope) {
        if (!gridEl) return;
        if (!containers || containers.length === 0) {
            const message = scope === 'agro' ? 'No AGRO containers found' : 'No containers found';
            gridEl.innerHTML = `<div style="color: var(--fg-muted); padding: 16px;">${message}</div>`;
            return;
        }
        gridEl.innerHTML = containers.map(container => renderContainerCard(container, scope)).join('');
    }

    function normalizeScopeArgs(scopeOrId, maybeId, maybeName) {
        if (maybeName !== undefined) {
            return {
                scope: scopeOrId || 'all',
                containerId: maybeId,
                label: maybeName || maybeId
            };
        }
        if (maybeId !== undefined) {
            return {
                scope: 'all',
                containerId: scopeOrId,
                label: maybeId || scopeOrId
            };
        }
        return {
            scope: 'all',
            containerId: scopeOrId,
            label: scopeOrId
        };
    }

    function getContainerById(containerId) {
        if (!containerId) return null;
        const map = state.docker?.containerMap || {};
        return map[containerId] || map[containerId.slice(0, 12)] || null;
    }

    function domSafeId(value) {
        return (value || '').replace(/[^a-zA-Z0-9_.-]+/g, '_');
    }

    function containerMatchesConfig(container, cfg) {
        if (!cfg || !container) return false;
        const nameLower = (container.name || '').toLowerCase();
        const serviceLower = (container.compose_service || '').toLowerCase();
        const projectLower = (container.compose_project || '').toLowerCase();
        return cfg.names.some(raw => {
            const target = raw.toLowerCase();
            return (
                nameLower === target ||
                serviceLower === target ||
                projectLower === target ||
                nameLower.startsWith(`${target}-`) ||
                serviceLower.startsWith(`${target}-`)
            );
        });
    }

    function getServiceContainers(serviceKey) {
        const cfg = SERVICE_CARD_CONFIG[serviceKey];
        if (!cfg) return [];
        const containers = state.docker?.containers || [];
        return containers.filter(container => containerMatchesConfig(container, cfg));
    }

    function updateServiceStatusFromContainers(containers) {
        Object.entries(SERVICE_CARD_CONFIG).forEach(([key, cfg]) => {
            const statusEl = cfg.statusSelector ? $(cfg.statusSelector) : null;
            const matchingContainers = (containers || []).filter(container => containerMatchesConfig(container, cfg));
            const running = matchingContainers.some(container => (container.state || '').toLowerCase() === 'running');

            if (statusEl) {
                if (matchingContainers.length === 0) {
                    statusEl.innerHTML = '<span style="color: var(--err);">✗ Not Found</span>';
                } else if (running) {
                    statusEl.innerHTML = '<span style="color: var(--accent);">✓ Running</span>';
                } else {
                    const stateText = escapeHtml(matchingContainers[0].state || 'stopped');
                    statusEl.innerHTML = `<span style="color: var(--warn);">⚠ ${stateText}</span>`;
                }
            }

            if (cfg.restartButton) {
                const btn = $(cfg.restartButton);
                if (btn) {
                    btn.disabled = matchingContainers.length === 0;
                    btn.dataset.serviceKey = key;
                }
            }
        });
    }

    const ACTION_LABELS = {
        pause: 'Pause',
        unpause: 'Unpause',
        stop: 'Stop',
        start: 'Start',
        remove: 'Remove',
        restart: 'Restart'
    };

    async function runContainerAction(action, scopeOrId, maybeId, maybeName) {
        const { scope, containerId, label } = normalizeScopeArgs(scopeOrId, maybeId, maybeName);
        const actionLabel = ACTION_LABELS[action] || action;
        const container = getContainerById(containerId) || {};
        const displayName = label || container.name || containerId;

        dockerLog([`▶ ${actionLabel} ${displayName}`]);
        dockerProgress(20, `${actionLabel} ${displayName}`);

        try {
            const response = await fetch(api(`/api/docker/container/${containerId}/${action}`), { method: 'POST' });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            if (data.output) {
                data.output.split('\n').filter(Boolean).forEach(line => dockerLog([line]));
            }
            dockerProgress(100, `${actionLabel} ${displayName}`);
            if (window.UXFeedback?.toast) {
                window.UXFeedback.toast(`✓ ${actionLabel} ${displayName}`, 'success');
            }
            await listContainers();
            await checkDockerStatus();
            await checkInfraStatus();
        } catch (error) {
            dockerProgress(100, `${actionLabel} failed`);
            dockerLog([`✗ ${actionLabel} ${displayName} failed: ${error.message}`]);
            if (window.UXFeedback?.toast) {
                window.UXFeedback.toast(`✗ ${actionLabel} ${displayName}`, 'error');
            }
        }
    }

    async function restartService(serviceKey) {
        const cfg = SERVICE_CARD_CONFIG[serviceKey];
        if (!cfg) return;
        const containers = getServiceContainers(serviceKey);
        if (!containers.length) {
            dockerLog([`⚠ No containers found for ${cfg.displayName}`]);
            if (window.UXFeedback?.toast) {
                window.UXFeedback.toast(`No containers found for ${cfg.displayName}`, 'warn');
            }
            return;
        }

        for (const container of containers) {
            await runContainerAction('restart', 'agro', container.id, container.name);
        }
        await listContainers();
        await checkInfraStatus();
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

            state.docker = state.docker || {};
            state.docker.status = data;

            if (!data.running && Array.isArray(state.docker?.containers)) {
                const anyRunning = state.docker.containers.some(c => (c.state || '').toLowerCase() === 'running');
                if (anyRunning) {
                    data.running = true;
                    data.runtime = data.runtime && data.runtime !== 'Unknown' ? data.runtime : 'Docker (detected via containers)';
                    data.containers_count = state.docker.containers.length;
                }
            }

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
            const errorHtml = window.ErrorHelpers ? window.ErrorHelpers.createHelpfulError({
                title: 'Failed to check Docker status',
                message: e.message,
                causes: [
                    'Backend server is not running',
                    'Docker daemon is not installed or not running',
                    'Backend lacks permissions to access Docker socket',
                    'Docker API endpoint misconfigured'
                ],
                fixes: [
                    'Start the backend server (check Infrastructure > Services)',
                    'Verify Docker is installed: run "docker --version" in terminal',
                    'Ensure Docker daemon is running: "docker ps" should work',
                    'Check backend logs for Docker connection errors'
                ],
                links: [
                    ['Install Docker', 'https://docs.docker.com/get-docker/'],
                    ['Docker Daemon Setup', 'https://docs.docker.com/config/daemon/'],
                    ['Backend Health', '/api/health']
                ]
            }) : '<div style="color: var(--err); padding: 16px;">Failed to check Docker status: ' + e.message + '</div>';
            display.innerHTML = errorHtml;
            console.error('[docker] Status check failed:', e);
        }
    }

    /**
     * List Docker containers
     */
    async function listContainers() {
        const agroGrid = $('#agro-containers-grid');
        const allGrid = $('#docker-containers-grid');

        try {
            const response = await fetch(api('/api/docker/containers/all'));
            const data = await response.json();
            const containers = Array.isArray(data.containers) ? data.containers : [];

            state.docker = state.docker || {};
            state.docker.containers = containers;
            state.docker.containerMap = {};
            containers.forEach(container => {
                const id = container.id || '';
                if (id) {
                    state.docker.containerMap[id] = container;
                    state.docker.containerMap[id.slice(0, 12)] = container;
                    state.docker.containerMap[domSafeId(id)] = container;
                }
                if (container.name) {
                    state.docker.containerMap[container.name] = container;
                }
            });

            if (agroGrid) {
                renderContainerGrid(agroGrid, containers.filter(isAgroContainer), 'agro');
            }

            if (allGrid) {
                renderContainerGrid(allGrid, containers, 'all');
            }

            updateServiceStatusFromContainers(containers);
            return containers;
        } catch (e) {
            const message = escapeHtml(e.message || 'Unknown error');
            if (agroGrid) {
                agroGrid.innerHTML = `<div style="color: var(--err); padding: 16px;">Failed to load AGRO containers: ${message}</div>`;
            }
            if (allGrid) {
                allGrid.innerHTML = `<div style="color: var(--err); padding: 16px;">Failed to list containers: ${message}</div>`;
            }
            console.error('[docker] Container list failed:', e);
            updateServiceStatusFromContainers([]);
            return [];
        }
    }

    /**
     * Container control functions
     */
    async function pauseContainer(scopeOrId, maybeId, maybeName) {
        await runContainerAction('pause', scopeOrId, maybeId, maybeName);
    }

    async function unpauseContainer(scopeOrId, maybeId, maybeName) {
        await runContainerAction('unpause', scopeOrId, maybeId, maybeName);
    }

    async function stopContainer(scopeOrId, maybeId, maybeName) {
        await runContainerAction('stop', scopeOrId, maybeId, maybeName);
    }

    async function startContainer(scopeOrId, maybeId, maybeName) {
        await runContainerAction('start', scopeOrId, maybeId, maybeName);
    }

    async function removeContainer(scopeOrId, maybeId, maybeName) {
        const { containerId, label } = normalizeScopeArgs(scopeOrId, maybeId, maybeName);
        const displayName = label || containerId;
        if (!confirm(`WARNING: This will permanently delete ${displayName}. Continue?`)) return;
        await runContainerAction('remove', scopeOrId, maybeId, maybeName);
    }

    async function restartContainer(scopeOrId, maybeId, maybeName) {
        await runContainerAction('restart', scopeOrId, maybeId, maybeName);
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
    async function toggleLogs(scopeOrId, maybeId) {
        const { scope, containerId } = normalizeScopeArgs(scopeOrId, maybeId);
        const safeId = domSafeId(containerId);
        const logsDiv = $(`#logs-${scope}-${safeId}`);
        const btn = $(`#btn-logs-${scope}-${safeId}`);

        if (!logsDiv) return;

        if (logsDiv.style.display === 'none') {
            // Show logs
            logsDiv.style.display = 'block';
            if (btn) btn.innerHTML = '📄 Logs ▲';
            // Load logs
            await refreshLogs(scope, containerId);
        } else {
            // Hide logs
            logsDiv.style.display = 'none';
            if (btn) btn.innerHTML = '📄 Logs ▼';
        }
    }

    /**
     * Refresh logs for a container
     */
    async function refreshLogs(scopeOrId, maybeId) {
        const { scope, containerId } = normalizeScopeArgs(scopeOrId, maybeId);
        const safeId = domSafeId(containerId);
        const contentDiv = $(`#logs-content-${scope}-${safeId}`);
        if (!contentDiv) return;

        const container = getContainerById(containerId);
        const displayName = container?.name || containerId;
        dockerLog([`▶ Fetching logs for ${displayName}`]);

        contentDiv.innerHTML = '<span style="color: var(--warn);">Loading logs...</span>';

        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/logs`));
            const d = await r.json();
            
            if (d.success) {
                contentDiv.innerHTML = formatLogs(d.logs);
                const scrollContainer = contentDiv.parentElement;
                if (scrollContainer) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }
                dockerLog([`✓ Logs streamed for ${displayName}`]);
            } else {
                throw new Error(d.error);
            }
        } catch (e) {
            const errorMsg = window.ErrorHelpers ? window.ErrorHelpers.createHelpfulError({
                title: 'Failed to load container logs',
                message: e.message,
                causes: [
                    'Backend logs endpoint is not accessible',
                    'Container has no log output yet',
                    'Docker daemon connection lost while fetching logs',
                    'Log file is corrupted or inaccessible'
                ],
                fixes: [
                    'Verify backend server is running (Infrastructure > Services)',
                    'Wait a moment for the container to produce output',
                    'Refresh the page and try again',
                    'Check Docker permissions for log access'
                ],
                links: [
                    ['Docker Logs Reference', 'https://docs.docker.com/engine/reference/commandline/logs/'],
                    ['Container Logging', 'https://docs.docker.com/config/containers/logging/'],
                    ['API Health', '/api/health']
                ]
            }) : `<span style="color: var(--err);">Failed to load logs: ${escapeHtml(e.message)}</span>`;
            contentDiv.innerHTML = errorMsg;
            dockerLog([`✗ Failed to load logs for ${displayName}: ${e.message}`]);
        }
    }

    /**
     * Download full logs
     */
    async function downloadLogs(containerId, containerName) {
        const container = getContainerById(containerId);
        const displayName = container?.name || containerName || containerId;
        dockerLog([`▶ Download logs for ${displayName}`]);
        try {
            const r = await fetch(api(`/api/docker/container/${containerId}/logs?tail=1000`));
            const d = await r.json();
            
            if (d.success) {
                const blob = new Blob([d.logs], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                const safeName = domSafeId(displayName || 'container');
                const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                a.href = url;
                a.download = `${safeName}-${timestamp}.log`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                if (window.showStatus) window.showStatus('Logs downloaded', 'success');
                dockerLog([`✓ Logs downloaded for ${displayName}`]);
            } else {
                throw new Error(d.error);
            }
        } catch (e) {
            const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to download container logs', {
                message: e.message,
                causes: [
                    'Backend logs endpoint returned an error',
                    'Browser blocked the file download',
                    'Container has no recent logs to download',
                    'Network connection interrupted during download'
                ],
                fixes: [
                    'Check server status: Infrastructure > Services',
                    'Allow downloads in browser settings',
                    'Refresh this page and try again',
                    'Check that container has been running and has log output'
                ],
                links: [
                    ['Docker Logs API', 'https://docs.docker.com/engine/api/v1.24/#get-container-logs'],
                    ['Browser Download Help', 'https://support.google.com/chrome/answer/95759'],
                    ['Docker Log Drivers', 'https://docs.docker.com/config/containers/logging/']
                ]
            }) : `Failed to download logs: ${e.message}`;
            dockerLog([`✗ Log download failed for ${displayName}: ${e.message}`]);
            if (window.showStatus) window.showStatus(msg, 'error');
            else alert(msg);
        }
    }

    /**
     * Check infrastructure service status
     */
    async function checkInfraStatus(forceRefresh = false) {
        if (forceRefresh || !state.docker?.containers) {
            await listContainers();
        } else {
            updateServiceStatusFromContainers(state.docker?.containers || []);
        }

        // Redis health ping (optional)
        const redisContainers = getServiceContainers('redis');
        const redisStatus = $('#redis-status');
        const redisRunning = redisContainers.some(c => (c.state || '').toLowerCase() === 'running');
        if (redisRunning && redisStatus) {
            try {
                const response = await fetch(api('/api/docker/redis/ping'));
                const data = await response.json();
                if (data.success) {
                    redisStatus.innerHTML = '<span style="color: var(--accent);">✓ Running (PONG)</span>';
                } else {
                    redisStatus.innerHTML = '<span style="color: var(--warn);">⚠ Running (no PONG)</span>';
                }
            } catch (e) {
                redisStatus.innerHTML = '<span style="color: var(--warn);">⚠ Running (ping failed)</span>';
            }
        }
    }

    /**
     * Start all infrastructure
     */
    async function startInfra() {
        const btn = $('#btn-infra-up');
        if (btn) btn.disabled = true;

        try {
            dockerLog(['▶ Start infrastructure']);
            dockerProgress(15, 'Starting infrastructure');

            const response = await fetch(api('/api/docker/infra/up'), { method: 'POST' });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to start infrastructure');
            }

            if (data.output) {
                data.output.split('\n').filter(Boolean).forEach(line => dockerLog([line]));
            }

            dockerProgress(100, 'Infrastructure running');
            if (window.showStatus) window.showStatus('Infrastructure started successfully', 'success');
            if (window.UXFeedback?.toast) {
                window.UXFeedback.toast('✓ Infrastructure started', 'success');
            }

            await listContainers();
            await checkInfraStatus();
            await checkDockerStatus();
        } catch (e) {
            dockerProgress(100, 'Infrastructure start failed');
            dockerLog([`✗ Infrastructure start failed: ${e.message}`]);
            const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to start infrastructure', {
                message: e.message,
                causes: [
                    'Docker daemon not running',
                    'Insufficient system resources (memory, disk space)',
                    'Port conflicts with existing services',
                    'Network configuration issues'
                ],
                fixes: [
                    'Verify Docker is running: `docker ps`',
                    'Check system resources: `df -h` for disk, `free -h` for memory',
                    'Check for port conflicts: `lsof -i :6333` (Qdrant), `lsof -i :6379` (Redis)',
                    'Review Docker compose logs: `docker compose logs -f`'
                ],
                links: [
                    ['Docker Getting Started', 'https://docs.docker.com/get-started/'],
                    ['Docker Compose Documentation', 'https://docs.docker.com/compose/']
                ]
            }) : `Failed to start infrastructure: ${e.message}`;
            if (window.showStatus) window.showStatus(msg, 'error');
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
            dockerLog(['▶ Stop infrastructure']);
            dockerProgress(15, 'Stopping infrastructure');

            const response = await fetch(api('/api/docker/infra/down'), { method: 'POST' });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to stop infrastructure');
            }

            if (data.output) {
                data.output.split('\n').filter(Boolean).forEach(line => dockerLog([line]));
            }

            dockerProgress(100, 'Infrastructure stopped');
            if (window.showStatus) window.showStatus('Infrastructure stopped', 'success');
            if (window.UXFeedback?.toast) {
                window.UXFeedback.toast('✓ Infrastructure stopped', 'success');
            }

            await listContainers();
            await checkInfraStatus();
            await checkDockerStatus();
        } catch (e) {
            dockerProgress(100, 'Infrastructure stop failed');
            dockerLog([`✗ Infrastructure stop failed: ${e.message}`]);
            const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to stop infrastructure', {
                message: e.message,
                causes: [
                    'Docker daemon not running',
                    'Container stuck in stopping state',
                    'Network connectivity issues',
                    'Insufficient permissions'
                ],
                fixes: [
                    'Verify Docker is running: `docker ps`',
                    'Force stop stuck containers: `docker compose kill`',
                    'Check network connectivity to Docker daemon',
                    'Ensure you have Docker permissions: `docker info`'
                ],
                links: [
                    ['Docker Compose Stop Command', 'https://docs.docker.com/engine/reference/commandline/compose_stop/'],
                    ['Redis Documentation', 'https://redis.io/docs/']
                ]
            }) : `Failed to stop infrastructure: ${e.message}`;
            if (window.showStatus) window.showStatus(msg, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Initialize Docker UI
     */
    function initDocker() {
        state.docker = state.docker || {};
        ensureDockerTerminal();

        // Bind buttons
        const btnDockerRefresh = $('#btn-docker-refresh');
        const btnContainersRefresh = $('#btn-docker-refresh-containers');
        const btnInfraUp = $('#btn-infra-up');
        const btnInfraDown = $('#btn-infra-down');

        if (btnDockerRefresh) btnDockerRefresh.addEventListener('click', () => {
            checkDockerStatus();
            listContainers().then(() => checkInfraStatus());
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

        Object.entries(SERVICE_CARD_CONFIG).forEach(([key, cfg]) => {
            if (!cfg.restartButton) return;
            const btn = $(cfg.restartButton);
            if (btn && !btn.dataset.bound) {
                btn.dataset.bound = '1';
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    try {
                        await restartService(key);
                    } finally {
                        btn.disabled = false;
                    }
                });
            }
        });

        // Redis ping
        const btnRedisPing = $('#btn-redis-ping');
        if (btnRedisPing) {
            btnRedisPing.addEventListener('click', async () => {
                try {
                    const r = await fetch(api('/api/docker/redis/ping'));
                    const d = await r.json();
                    if (d.success) {
                        if (window.UXFeedback && window.UXFeedback.toast) {
                            window.UXFeedback.toast('✓ Redis PONG!', 'success');
                        } else {
                            alert('✓ Redis PONG!');
                        }
                    } else {
                        const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Redis Not Responding', {
                            message: 'Redis connection test failed',
                            causes: [
                                'Redis container is not running or crashed',
                                'Redis port 6379 is blocked by firewall',
                                'Backend cannot connect to Redis service',
                                'Redis is running but not accepting connections'
                            ],
                            fixes: [
                                'Start Redis container: use Infrastructure tab "Start All" button',
                                'Check Redis container status: docker ps | grep redis',
                                'Verify port 6379 is accessible: telnet localhost 6379',
                                'Review backend logs for Redis connection errors'
                            ],
                            links: [
                                ['Redis Documentation', 'https://redis.io/docs/getting-started/'],
                                ['Docker Redis', 'https://hub.docker.com/_/redis'],
                                ['Troubleshooting', '/docs/TROUBLESHOOTING.md#redis']
                            ]
                        }) : '✗ Redis not responding';
                        alert(msg);
                    }
                } catch (e) {
                    const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Redis Ping Failed', {
                        message: e.message,
                        causes: [
                            'Backend service is not running',
                            'Network connection to backend failed',
                            'Redis API endpoint is not implemented'
                        ],
                        fixes: [
                            'Check Infrastructure tab to verify backend is running',
                            'Verify network connectivity to localhost:8012',
                            'Review backend logs for errors'
                        ],
                        links: [
                            ['Backend Health', '/api/health'],
                            ['Infrastructure Tab', '/docs/INFRASTRUCTURE.md']
                        ]
                    }) : '✗ Failed to ping Redis: ' + e.message;
                    alert(msg);
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
        listContainers().then(() => checkInfraStatus());

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
        restartContainer,
        removeContainer,
        restartService,
        toggleLogs,
        refreshLogs,
        downloadLogs
    };

    // Initialization function called by mcp_server.js when infrastructure view mounts
    // Does NOT register view - mcp_server.js handles that
    window.initDocker = function() {
        console.log('[docker.js] Initializing docker for infrastructure view');
        initDocker();
    };

    // Legacy mode: auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDocker);
    } else {
        initDocker();
    }

    console.log('[docker.js] Module loaded (coordination with mcp_server.js for infrastructure view)');
})();
