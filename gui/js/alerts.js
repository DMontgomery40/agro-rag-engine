// AGRO GUI - Alerts & Webhooks Module
// Handles alert thresholds, webhook configuration, and status display

(function () {
    'use strict';

    // Import utilities
    const { api, $, $$, state } = window.CoreUtils || {};

    if (!api || !$ || !$$ || !state) {
        console.error('[alerts.js] CoreUtils not loaded!');
        return;
    }

    // Alert threshold field mapping (HTML ID -> backend key)
    const THRESHOLD_FIELDS = {
        // Cost & Token Burn
        'alert_cost_burn_spike_usd_per_hour': 'cost_burn_spike_usd_per_hour',
        'alert_token_burn_spike_per_minute': 'token_burn_spike_per_minute',
        'alert_token_burn_sustained_per_minute': 'token_burn_sustained_per_minute',

        // Budget
        'alert_monthly_budget_usd': 'monthly_budget_usd',
        'alert_budget_warning_usd': 'budget_warning_usd',
        'alert_budget_critical_usd': 'budget_critical_usd',

        // Performance & Reliability
        'alert_error_rate_threshold_percent': 'error_rate_threshold_percent',
        'alert_request_latency_p99_seconds': 'request_latency_p99_seconds',
        'alert_timeout_errors_per_5min': 'timeout_errors_per_5min',
        'alert_rate_limit_errors_per_5min': 'rate_limit_errors_per_5min',

        // API Anomalies
        'alert_endpoint_call_frequency_per_minute': 'endpoint_call_frequency_per_minute',
        'alert_endpoint_frequency_sustained_minutes': 'endpoint_frequency_sustained_minutes',
        'alert_cohere_rerank_calls_per_minute': 'cohere_rerank_calls_per_minute'
    };

    // ===== ALERT THRESHOLDS =====

    /**
     * Load alert thresholds from API and populate form
     */
    async function loadAlertThresholds() {
        try {
            const r = await fetch(api('/monitoring/alert-thresholds'));
            if (!r.ok) {
                console.warn('Failed to load alert thresholds');
                return;
            }
            const data = await r.json();
            state.alertThresholds = data;
            populateAlertThresholds(data);
        } catch (e) {
            console.error('Failed to load alert thresholds:', e);
        }
    }

    /**
     * Populate alert threshold input fields
     */
    function populateAlertThresholds(data) {
        Object.entries(THRESHOLD_FIELDS).forEach(([fieldId, dataKey]) => {
            const field = $(fieldId);
            if (field && data[dataKey] !== undefined) {
                field.value = data[dataKey];
            }
        });
    }

    /**
     * Load and display alert status
     */
    async function loadAlertStatus() {
        try {
            const container = $('#alert-status-container');
            if (!container) return;

            const r = await fetch(api('/webhooks/alertmanager/status'));
            if (!r.ok) {
                container.innerHTML = '<p style="color: var(--err); font-size: 13px;">❌ Failed to load alert status</p>';
                return;
            }

            const data = await r.json();
            const recentAlerts = data.recent_alerts || [];

            if (recentAlerts.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; color: var(--fg-muted); padding: 24px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
                        <p style="font-size: 13px; margin: 0;">No active alerts</p>
                        <p style="font-size: 11px; color: var(--fg-muted); margin: 4px 0 0 0;">System is healthy</p>
                    </div>
                `;
            } else {
                let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
                recentAlerts.forEach(alertEntry => {
                    const alert = alertEntry.alert || {};
                    const labels = alert.labels || {};
                    const severity = labels.severity || 'info';
                    const alertname = labels.alertname || 'Unknown';
                    const summary = alert.annotations?.summary || 'No summary';

                    const severityColor = {
                        'critical': '#ff4444',
                        'warning': '#ffaa00',
                        'info': '#4488ff'
                    }[severity] || '#888';

                    const severityEmoji = {
                        'critical': '🔴',
                        'warning': '⚠️',
                        'info': 'ℹ️'
                    }[severity] || '●';

                    html += `
                        <div style="background: var(--bg-elev2); border-left: 3px solid ${severityColor}; padding: 12px; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: ${severityColor}; font-size: 13px;">
                                        ${severityEmoji} ${alertname}
                                    </div>
                                    <div style="font-size: 12px; color: var(--fg-muted); margin-top: 4px;">
                                        ${summary}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            }
        } catch (e) {
            console.error('Failed to load alert status:', e);
            const container = $('#alert-status-container');
            if (container) {
                container.innerHTML = '<p style="color: var(--err); font-size: 13px;">❌ Error loading alert status</p>';
            }
        }
    }

    /**
     * Load and display alert history
     */
    async function loadAlertHistory() {
        try {
            const container = $('#alert-history-container');
            if (!container) return;

            const r = await fetch(api('/webhooks/alertmanager/status'));
            if (!r.ok) {
                container.innerHTML = '<p style="color: var(--err); font-size: 13px;">Failed to load alert history</p>';
                return;
            }

            const data = await r.json();
            const alerts = data.recent_alerts || [];

            if (alerts.length === 0) {
                container.innerHTML = '<p style="color: var(--fg-muted); font-size: 12px;">No alerts logged yet</p>';
            } else {
                let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
                html += '<thead><tr style="border-bottom: 1px solid var(--line);">';
                html += '<th style="text-align: left; padding: 8px 0; color: var(--fg-muted); font-weight: 600;">Time</th>';
                html += '<th style="text-align: left; padding: 8px 8px; color: var(--fg-muted); font-weight: 600;">Alert</th>';
                html += '<th style="text-align: left; padding: 8px 8px; color: var(--fg-muted); font-weight: 600;">Severity</th>';
                html += '</tr></thead><tbody>';

                alerts.slice().reverse().forEach(entry => {
                    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A';
                    const alert = entry.alert || {};
                    const labels = alert.labels || {};
                    const severity = labels.severity || 'info';
                    const alertname = labels.alertname || 'Unknown';

                    const severityColor = {
                        'critical': '#ff4444',
                        'warning': '#ffaa00',
                        'info': '#4488ff'
                    }[severity] || '#888';

                    html += `
                        <tr style="border-bottom: 1px solid var(--line);">
                            <td style="padding: 8px 0; color: var(--fg-muted);">${timestamp}</td>
                            <td style="padding: 8px 8px; color: var(--fg);">${alertname}</td>
                            <td style="padding: 8px 8px;">
                                <span style="color: ${severityColor}; font-weight: 600;">
                                    ${severity.toUpperCase()}
                                </span>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;
            }
        } catch (e) {
            console.error('Failed to load alert history:', e);
            const container = $('#alert-history-container');
            if (container) {
                container.innerHTML = '<p style="color: var(--err); font-size: 12px;">Error loading alert history</p>';
            }
        }
    }

    /**
     * Gather alert threshold values from form
     */
    function gatherAlertThresholds() {
        const update = {};

        Object.entries(THRESHOLD_FIELDS).forEach(([fieldId, dataKey]) => {
            const field = $(fieldId);
            if (field) {
                const val = field.value;
                if (val !== '' && val !== null && val !== undefined) {
                    update[dataKey] = parseFloat(val);
                }
            }
        });

        return update;
    }

    /**
     * Save alert thresholds to API
     */
    async function saveAlertThresholds() {
        const statusDiv = $('#alert-save-status');
        const saveBtn = $('#btn-save-alert-thresholds');

        try {
            if (statusDiv) statusDiv.textContent = 'Saving...';
            if (saveBtn) saveBtn.disabled = true;

            const thresholds = gatherAlertThresholds();

            const r = await fetch(api('/monitoring/alert-thresholds'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(thresholds)
            });

            if (!r.ok) {
                if (statusDiv) statusDiv.textContent = '❌ Save failed - check console';
                if (saveBtn) saveBtn.disabled = false;
                return;
            }

            const result = await r.json();

            if (result.status === 'ok') {
                if (statusDiv) {
                    statusDiv.textContent = `✅ Saved! ${result.updated} threshold(s) updated`;
                    statusDiv.style.color = 'var(--success)';
                }
                // Reload thresholds to confirm
                await loadAlertThresholds();
            } else {
                if (statusDiv) {
                    statusDiv.textContent = `⚠️ ${result.message}`;
                    statusDiv.style.color = 'var(--warn)';
                }
            }
        } catch (e) {
            if (statusDiv) {
                statusDiv.textContent = `❌ Error: ${e.message}`;
                statusDiv.style.color = 'var(--err)';
            }
            console.error('Failed to save alert thresholds:', e);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            // Clear status message after 5 seconds
            if (statusDiv) {
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 5000);
            }
        }
    }

    // ===== WEBHOOK CONFIGURATION =====

    /**
     * Load webhook configuration from API
     */
    async function loadWebhookConfig() {
        try {
            const r = await fetch(api('/monitoring/webhooks/config'));
            if (!r.ok) {
                console.warn('Failed to load webhook config');
                return;
            }
            const data = await r.json();
            state.webhookConfig = data;
            populateWebhookConfig(data);
        } catch (e) {
            console.error('Failed to load webhook config:', e);
        }
    }

    /**
     * Populate webhook configuration form
     */
    function populateWebhookConfig(data) {
        const slack = $('webhook_slack_url');
        const discord = $('webhook_discord_url');
        const enabled = $('webhook_enabled');
        const crit = $('webhook_sev_critical');
        const warn = $('webhook_sev_warning');
        const info = $('webhook_sev_info');
        const resolved = $('webhook_include_resolved');

        if (slack && data.slack_webhook_url) slack.value = data.slack_webhook_url;
        if (discord && data.discord_webhook_url) discord.value = data.discord_webhook_url;
        if (enabled) enabled.checked = data.alert_notify_enabled !== false;
        if (resolved) resolved.checked = data.alert_include_resolved !== false;

        // Parse severity string
        const severities = (data.alert_notify_severities || '').split(',').map(s => s.trim());
        if (crit) crit.checked = severities.includes('critical');
        if (warn) warn.checked = severities.includes('warning');
        if (info) info.checked = severities.includes('info');
    }

    /**
     * Save webhook configuration
     */
    async function saveWebhookConfig() {
        const statusDiv = $('#webhook-save-status');
        const saveBtn = $('#btn-save-webhooks');

        try {
            if (statusDiv) statusDiv.textContent = 'Saving...';
            if (saveBtn) saveBtn.disabled = true;

            // Gather form data
            const slack = $('webhook_slack_url');
            const discord = $('webhook_discord_url');
            const enabled = $('webhook_enabled');
            const crit = $('webhook_sev_critical');
            const warn = $('webhook_sev_warning');
            const info = $('webhook_sev_info');
            const resolved = $('webhook_include_resolved');

            // Build severities string
            const severities = [];
            if (crit && crit.checked) severities.push('critical');
            if (warn && warn.checked) severities.push('warning');
            if (info && info.checked) severities.push('info');

            const config = {
                slack_webhook_url: (slack && slack.value) || '',
                discord_webhook_url: (discord && discord.value) || '',
                alert_notify_enabled: enabled ? enabled.checked : true,
                alert_notify_severities: severities.join(','),
                alert_include_resolved: resolved ? resolved.checked : true
            };

            const r = await fetch(api('/monitoring/webhooks/config'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!r.ok) {
                if (statusDiv) statusDiv.textContent = '❌ Save failed - check console';
                if (saveBtn) saveBtn.disabled = false;
                return;
            }

            const result = await r.json();

            if (result.status === 'ok') {
                if (statusDiv) {
                    statusDiv.textContent = `✅ Webhooks saved! ${result.updated} setting(s) updated`;
                    statusDiv.style.color = 'var(--success)';
                }
                // Reload config to confirm
                await loadWebhookConfig();
            } else {
                if (statusDiv) {
                    statusDiv.textContent = `⚠️ ${result.message}`;
                    statusDiv.style.color = 'var(--warn)';
                }
            }
        } catch (e) {
            if (statusDiv) {
                statusDiv.textContent = `❌ Error: ${e.message}`;
                statusDiv.style.color = 'var(--err)';
            }
            console.error('Failed to save webhook config:', e);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            // Clear status message after 5 seconds
            if (statusDiv) {
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 5000);
            }
        }
    }

    /**
     * Initialize alerts module
     */
    async function init() {
        console.log('[alerts.js] Initializing...');

        // Load thresholds
        await loadAlertThresholds();

        // Load and display status/history
        await loadAlertStatus();
        await loadAlertHistory();

        // Load webhook config
        await loadWebhookConfig();

        // Hook up save buttons
        const alertSaveBtn = $('#btn-save-alert-thresholds');
        if (alertSaveBtn) {
            alertSaveBtn.addEventListener('click', saveAlertThresholds);
        }

        const webhookSaveBtn = $('#btn-save-webhooks');
        if (webhookSaveBtn) {
            webhookSaveBtn.addEventListener('click', saveWebhookConfig);
        }

        // Refresh alert status every 30 seconds
        setInterval(() => {
            loadAlertStatus();
            loadAlertHistory();
        }, 30000);

        console.log('[alerts.js] Module loaded');
    }

    // Export to window
    window.Alerts = {
        init,
        loadAlertThresholds,
        populateAlertThresholds,
        loadAlertStatus,
        loadAlertHistory,
        gatherAlertThresholds,
        saveAlertThresholds,
        loadWebhookConfig,
        populateWebhookConfig,
        saveWebhookConfig
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
