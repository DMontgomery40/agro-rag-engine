// AGRO GUI - MCP Server Management Module
// Handles MCP HTTP server management and stdio testing

(function () {
    'use strict';

    // Import utilities
    const { api, $, state } = window.CoreUtils || {};

    if (!api || !$ || !state) {
        console.error('[mcp_server.js] CoreUtils not loaded!');
        return;
    }

    /**
     * Update HTTP MCP server status
     */
    async function updateHTTPStatus() {
        const statusEl = $('#mcp-http-status');
        if (!statusEl) return;

        try {
            const response = await fetch(api('/api/mcp/http/status'));
            const data = await response.json();

            if (data.running) {
                statusEl.innerHTML = `
                    <span style="color: var(--accent);">✓ Running</span>
                    <div style="font-size: 10px; color: var(--fg-muted); margin-top: 4px;">
                        Port: ${data.port} | Mode: ${data.mode} | URL: ${data.url || 'N/A'}
                    </div>
                `;
                statusEl.style.borderColor = 'var(--accent)';
            } else {
                statusEl.innerHTML = `<span style="color: var(--err);">✗ Not Running</span>`;
                statusEl.style.borderColor = 'var(--err)';
            }
        } catch (e) {
            statusEl.innerHTML = `<span style="color: var(--warn);">⚠ Cannot check status</span>`;
            statusEl.style.borderColor = 'var(--warn)';
            console.error('Failed to check HTTP MCP status:', e);
        }
    }

    /**
     * Start HTTP MCP server
     */
    async function startHTTPServer() {
        const btn = $('#btn-mcp-http-start');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch(api('/api/mcp/http/start'), { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                if (window.showStatus) {
                    window.showStatus(`HTTP MCP started on port ${data.port}`, 'success');
                } else {
                    alert(`HTTP MCP started on port ${data.port}!`);
                }
                await updateHTTPStatus();
            } else {
                throw new Error(data.error || 'Failed to start HTTP MCP server');
            }
        } catch (e) {
            if (window.showStatus) {
                window.showStatus(`Failed to start HTTP MCP: ${e.message}`, 'error');
            } else {
                alert(`Error: ${e.message}`);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Stop HTTP MCP server
     */
    async function stopHTTPServer() {
        const btn = $('#btn-mcp-http-stop');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch(api('/api/mcp/http/stop'), { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                if (window.showStatus) {
                    window.showStatus('HTTP MCP stopped', 'success');
                } else {
                    alert('HTTP MCP stopped!');
                }
                await updateHTTPStatus();
            } else {
                throw new Error(data.error || 'Failed to stop HTTP MCP server');
            }
        } catch (e) {
            if (window.showStatus) {
                window.showStatus(`Failed to stop HTTP MCP: ${e.message}`, 'error');
            } else {
                alert(`Error: ${e.message}`);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Restart HTTP MCP server
     */
    async function restartHTTPServer() {
        const btn = $('#btn-mcp-http-restart');
        if (btn) btn.disabled = true;

        try {
            const response = await fetch(api('/api/mcp/http/restart'), { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                if (window.showStatus) {
                    window.showStatus('HTTP MCP restarted successfully', 'success');
                } else {
                    alert('HTTP MCP restarted!');
                }
                await updateHTTPStatus();
            } else {
                throw new Error(data.error || 'Failed to restart HTTP MCP server');
            }
        } catch (e) {
            if (window.showStatus) {
                window.showStatus(`Failed to restart HTTP MCP: ${e.message}`, 'error');
            } else {
                alert(`Error: ${e.message}`);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Test stdio MCP server
     */
    async function testStdioServer() {
        const btn = $('#btn-mcp-test');
        const outputEl = $('#mcp-test-output');
        
        if (btn) btn.disabled = true;
        if (outputEl) {
            outputEl.style.display = 'block';
            outputEl.textContent = 'Testing stdio MCP server...';
        }

        try {
            const response = await fetch(api('/api/mcp/test'));
            const data = await response.json();

            if (data.success) {
                const toolsList = data.tools ? data.tools.join(', ') : 'None';
                const output = `✓ stdio MCP Test Passed!\n\nTools (${data.tools_count || 0}): ${toolsList}\n\n${data.output || ''}`;
                
                if (outputEl) outputEl.textContent = output;
                
                if (window.showStatus) {
                    window.showStatus(`stdio MCP test passed! ${data.tools_count || 0} tools available`, 'success');
                }
            } else {
                const output = `✗ stdio MCP Test Failed\n\nError: ${data.error || 'Unknown error'}\n\n${data.output || ''}`;
                if (outputEl) outputEl.textContent = output;
                
                if (window.showStatus) {
                    window.showStatus(`stdio MCP test failed: ${data.error}`, 'error');
                }
            }
        } catch (e) {
            if (outputEl) outputEl.textContent = `✗ Error: ${e.message}`;
            
            if (window.showStatus) {
                window.showStatus(`stdio MCP test failed: ${e.message}`, 'error');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Initialize MCP server management UI
     */
    function initMCPServerUI() {
        // Bind HTTP server buttons
        const btnHTTPStart = $('#btn-mcp-http-start');
        const btnHTTPStop = $('#btn-mcp-http-stop');
        const btnHTTPRestart = $('#btn-mcp-http-restart');
        const btnHTTPCheck = $('#btn-mcp-http-check');

        if (btnHTTPStart) btnHTTPStart.addEventListener('click', startHTTPServer);
        if (btnHTTPStop) btnHTTPStop.addEventListener('click', stopHTTPServer);
        if (btnHTTPRestart) btnHTTPRestart.addEventListener('click', restartHTTPServer);
        if (btnHTTPCheck) btnHTTPCheck.addEventListener('click', updateHTTPStatus);

        // Bind stdio test button
        const btnTest = $('#btn-mcp-test');
        if (btnTest) btnTest.addEventListener('click', testStdioServer);

        // Initial status check
        updateHTTPStatus();

        // Auto-refresh status every 10 seconds if on debug tab
        setInterval(() => {
            const debugTab = $('#tab-devtools-debug');
            if (debugTab && debugTab.classList.contains('active')) {
                updateHTTPStatus();
            }
        }, 10000);
    }

    // Export to window
    window.MCPServer = {
        updateHTTPStatus,
        startHTTPServer,
        stopHTTPServer,
        restartHTTPServer,
        testStdioServer,
        initMCPServerUI
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMCPServerUI);
    } else {
        initMCPServerUI();
    }

    console.log('[mcp_server.js] Module loaded');
})();
