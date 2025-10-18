// AGRO GUI - VS Code Integration Module
// Manages the embedded VS Code server interface
// Author: AGRO Redesign (Phase 2)

(function() {
    'use strict';

    const { api, $, state, events } = window.CoreUtils || {};

    // Configuration
    const config = {
        defaultPort: 4440,
        defaultHost: '127.0.0.1',
        bindMode: 'local', // 'local' or 'network'
        healthCheckInterval: 30000, // 30 seconds
        healthCheckTimeout: 5000
    };

    // State
    const vsCodeState = {
        isVisible: false,
        isHealthy: false,
        lastHealthCheck: null,
        port: config.defaultPort,
        host: config.defaultHost,
        iframeLoaded: false
    };

    /**
     * Get VS Code server URL
     */
    function getServerUrl() {
        const port = state?.config?.EDITOR_PORT || vsCodeState.port;
        const host = vsCodeState.bindMode === 'network' ? '0.0.0.0' : vsCodeState.host;
        return `http://${host}:${port}`;
    }

    /**
     * Show the VS Code editor
     */
    function showEditor() {
        const container = $('#editor-iframe-container');
        const iframe = $('#editor-iframe');
        const statusBanner = $('#editor-status-banner');
        
        if (!container || !iframe) {
            console.error('[VSCode] Editor container or iframe not found');
            return;
        }

        // Show container
        container.style.display = 'block';
        vsCodeState.isVisible = true;

        // Load iframe if not already loaded
        if (!iframe.src || !vsCodeState.iframeLoaded) {
            const url = getServerUrl();
            console.log(`[VSCode] Loading editor from ${url}`);
            iframe.src = url;
            
            // Handle iframe load events
            iframe.onload = () => {
                console.log('[VSCode] Editor iframe loaded');
                vsCodeState.iframeLoaded = true;
                if (statusBanner) statusBanner.style.display = 'none';
            };
            
            iframe.onerror = () => {
                console.error('[VSCode] Editor iframe failed to load');
                showErrorStatus('Failed to load VS Code editor. It may not be running.');
            };
        }

        // Start health checks
        startHealthChecks();

        // Emit event
        if (events) {
            events.emit('vscode:shown');
        }
    }

    /**
     * Hide the VS Code editor
     */
    function hideEditor() {
        const container = $('#editor-iframe-container');
        
        if (container) {
            container.style.display = 'none';
        }
        
        vsCodeState.isVisible = false;
        stopHealthChecks();

        // Emit event
        if (events) {
            events.emit('vscode:hidden');
        }
    }

    /**
     * Check if editor is visible
     */
    function isVisible() {
        return vsCodeState.isVisible;
    }

    /**
     * Open editor in new window
     */
    function openInNewWindow() {
        const url = getServerUrl();
        console.log(`[VSCode] Opening in new window: ${url}`);
        
        try {
            window.open(url, '_blank');
        } catch (e) {
            console.error('[VSCode] Failed to open in new window:', e);
        }
    }

    /**
     * Copy editor URL to clipboard
     */
    function copyUrl() {
        const url = getServerUrl();
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    console.log('[VSCode] URL copied to clipboard');
                    showNotification('VS Code URL copied to clipboard');
                })
                .catch(err => {
                    console.error('[VSCode] Failed to copy URL:', err);
                    fallbackCopyUrl(url);
                });
        } else {
            fallbackCopyUrl(url);
        }
    }

    /**
     * Fallback method to copy URL
     */
    function fallbackCopyUrl(url) {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            console.log('[VSCode] URL copied to clipboard (fallback)');
            showNotification('VS Code URL copied to clipboard');
        } catch (e) {
            console.error('[VSCode] Fallback copy failed:', e);
            showNotification(`VS Code URL: ${url}`);
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Restart VS Code server
     */
    async function restart() {
        console.log('[VSCode] Restarting editor...');
        showNotification('Restarting VS Code server...');
        
        if (!api) {
            console.error('[VSCode] API not available');
            return;
        }

        try {
            // Call restart endpoint
            const response = await api.post('/api/editor/restart', {});
            
            if (response.success) {
                console.log('[VSCode] Restart initiated');
                
                // Hide iframe during restart
                vsCodeState.iframeLoaded = false;
                const iframe = $('#editor-iframe');
                if (iframe) iframe.src = 'about:blank';
                
                // Wait a bit then reload
                setTimeout(() => {
                    if (vsCodeState.isVisible) {
                        showEditor();
                    }
                }, 3000);
                
                showNotification('VS Code server restarted successfully');
            } else {
                throw new Error(response.error || 'Restart failed');
            }
        } catch (error) {
            console.error('[VSCode] Restart failed:', error);
            showNotification('Failed to restart VS Code server', 'error');
        }
    }

    /**
     * Check editor health
     */
    async function checkHealth() {
        const url = getServerUrl() + '/healthz';
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.healthCheckTimeout);
            
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            vsCodeState.isHealthy = response.ok;
            vsCodeState.lastHealthCheck = Date.now();
            
            return {
                status: vsCodeState.isHealthy ? 'healthy' : 'unhealthy',
                message: vsCodeState.isHealthy ? 'VS Code server is running' : 'VS Code server is not responding'
            };
        } catch (error) {
            vsCodeState.isHealthy = false;
            vsCodeState.lastHealthCheck = Date.now();
            
            return {
                status: 'error',
                message: error.name === 'AbortError' ? 'Health check timed out' : 'Cannot connect to VS Code server'
            };
        }
    }

    /**
     * Start health check interval
     */
    let healthCheckInterval = null;
    function startHealthChecks() {
        if (healthCheckInterval) return;
        
        // Initial check
        checkHealth().then(result => {
            if (!result.status === 'healthy') {
                showErrorStatus(result.message);
            }
        });
        
        // Periodic checks
        healthCheckInterval = setInterval(async () => {
            if (!vsCodeState.isVisible) return;
            
            const result = await checkHealth();
            if (result.status !== 'healthy') {
                showErrorStatus(result.message);
            }
        }, config.healthCheckInterval);
    }

    /**
     * Stop health checks
     */
    function stopHealthChecks() {
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
    }

    /**
     * Show error status banner
     */
    function showErrorStatus(message) {
        const statusBanner = $('#editor-status-banner');
        const statusMessage = $('#editor-status-message');
        
        if (statusBanner && statusMessage) {
            statusMessage.textContent = message;
            statusBanner.style.display = 'block';
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[VSCode] ${type}: ${message}`);
        }
    }

    /**
     * Get/Set configuration
     */
    function getPort() {
        return vsCodeState.port;
    }

    function setPort(port) {
        if (port && !isNaN(port)) {
            vsCodeState.port = parseInt(port);
            console.log(`[VSCode] Port set to ${vsCodeState.port}`);
        }
    }

    function getBindMode() {
        return vsCodeState.bindMode;
    }

    function setBindMode(mode) {
        if (mode === 'local' || mode === 'network') {
            vsCodeState.bindMode = mode;
            console.log(`[VSCode] Bind mode set to ${mode}`);
        }
    }

    /**
     * Initialize the module
     */
    function init() {
        console.log('[VSCode] Initializing VS Code integration');

        // Load saved configuration
        const savedPort = localStorage.getItem('vscode_port');
        const savedBindMode = localStorage.getItem('vscode_bind_mode');
        
        if (savedPort) setPort(savedPort);
        if (savedBindMode) setBindMode(savedBindMode);

        // Register with Navigation if available
        if (window.Navigation) {
            window.Navigation.registerView({
                id: 'vscode',
                title: 'VS Code',
                icon: '📝',
                mount: showEditor,
                unmount: hideEditor,
                canAccess: () => true
            });
        }

        // Bind UI events
        const openBtn = $('#vscode-open-window');
        const copyBtn = $('#vscode-copy-url');
        const restartBtn = $('#vscode-restart');
        
        if (openBtn) openBtn.addEventListener('click', openInNewWindow);
        if (copyBtn) copyBtn.addEventListener('click', copyUrl);
        if (restartBtn) restartBtn.addEventListener('click', restart);

        console.log('[VSCode] VS Code integration initialized');
    }

    // Public API
    window.VSCode = {
        // Editor management
        showEditor,
        hideEditor,
        isVisible,
        
        // Configuration
        getPort,
        setPort,
        getBindMode,
        setBindMode,
        
        // Actions
        openInNewWindow,
        copyUrl,
        restart,
        
        // Health
        checkHealth,
        
        // Initialization
        init,
        
        // State (read-only)
        getState: () => ({ ...vsCodeState })
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[VSCode] Module loaded - use window.VSCode for VS Code integration');
})();

