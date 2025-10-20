/**
 * AGRO Dashboard Metrics
 * Fetches and formats rich performance and health metrics
 * - API Performance (response times, cache hits)
 * - Index Health (score distribution, anomalies)
 * - Top accessed folders/files (last 5 days)
 */

(function() {
    'use strict';

    const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p => p);

    class DashboardMetrics {
        constructor() {
            this.cache = {};
            this.cacheExpiry = {};
            this.cacheTTL = 30000; // 30 seconds
        }

        async fetchWithCache(url, ttl = this.cacheTTL) {
            const now = Date.now();
            if (this.cache[url] && this.cacheExpiry[url] > now) {
                return this.cache[url];
            }

            try {
                const response = await fetch(api(url));
                const data = await response.json();
                this.cache[url] = data;
                this.cacheExpiry[url] = now + ttl;
                return data;
            } catch (e) {
                console.error(`[DashboardMetrics] Error fetching ${url}:`, e);
                return null;
            }
        }

        /**
         * Format bytes to human readable
         */
        formatBytes(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        }

        /**
         * Format milliseconds to human readable
         */
        formatMs(ms) {
            if (ms < 1000) return Math.round(ms) + 'ms';
            return (ms / 1000).toFixed(2) + 's';
        }

        /**
         * Get API performance metrics (response times, cache hits)
         */
        async getAPIPerformance() {
            try {
                // Try to get frequency stats which includes API performance
                const stats = await this.fetchWithCache('/api/frequency-stats', 60000);

                if (!stats) {
                    return {
                        avg_response_ms: 0,
                        p95_response_ms: 0,
                        cache_hit_rate: 0,
                        total_calls: 0,
                        error_rate: 0
                    };
                }

                return {
                    avg_response_ms: stats.avg_response_ms || 0,
                    p95_response_ms: stats.p95_response_ms || 0,
                    cache_hit_rate: (stats.cache_hits / (stats.total_calls || 1) * 100).toFixed(1),
                    total_calls: stats.total_calls || 0,
                    error_rate: ((stats.errors / (stats.total_calls || 1)) * 100).toFixed(2)
                };
            } catch (e) {
                console.error('[DashboardMetrics] Error fetching API performance:', e);
                return null;
            }
        }

        /**
         * Get index health metrics
         */
        async getIndexHealth() {
            try {
                const indexStats = await this.fetchWithCache('/api/index/stats', 60000);

                if (!indexStats) {
                    return null;
                }

                // Calculate basic health metrics
                const totalChunks = indexStats.total_chunks || 0;
                const avgScoreDistribution = indexStats.avg_score || 0;
                const anomaliesDetected = indexStats.anomalies_count || 0;

                return {
                    total_chunks: totalChunks,
                    avg_score: avgScoreDistribution.toFixed(3),
                    anomalies: anomaliesDetected,
                    health_status: anomaliesDetected === 0 ? 'healthy' : 'warning'
                };
            } catch (e) {
                console.error('[DashboardMetrics] Error fetching index health:', e);
                return null;
            }
        }

        /**
         * Get top 5 accessed folders (stub for now - requires telemetry tracking)
         */
        async getTopFolders() {
            try {
                // This would need telemetry data tracking which folders are accessed
                // For now, return placeholder that shows available data
                const rerankerLogs = await this.fetchWithCache('/api/reranker/logs', 120000);

                if (!rerankerLogs || !rerankerLogs.recent) {
                    return [];
                }

                // Count folder references in queries
                const folderCounts = {};
                rerankerLogs.recent.forEach(log => {
                    if (log.query) {
                        // Simple extraction of folder patterns
                        const folderMatch = log.query.match(/(?:\/|\\)([a-zA-Z0-9_-]+)/g);
                        if (folderMatch) {
                            folderMatch.forEach(folder => {
                                folderCounts[folder] = (folderCounts[folder] || 0) + 1;
                            });
                        }
                    }
                });

                // Sort and get top 5
                return Object.entries(folderCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([folder, count]) => ({
                        folder: folder.replace(/[\/\\]/g, ''),
                        count: count
                    }));
            } catch (e) {
                console.error('[DashboardMetrics] Error fetching top folders:', e);
                return [];
            }
        }

        /**
         * Format API performance display
         */
        formatAPIPerformanceHTML(perf) {
            if (!perf) {
                return `<div style="color:var(--fg-muted);font-size:12px;">API metrics unavailable</div>`;
            }

            const errorColor = parseFloat(perf.error_rate) > 5 ? 'var(--warn)' : 'var(--ok)';

            return `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg Response Time</div>
                        <div style="font-size:13px;font-weight:700;color:var(--link);font-family:'SF Mono',monospace;">${this.formatMs(perf.avg_response_ms)}</div>
                    </div>
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">P95 Response</div>
                        <div style="font-size:13px;font-weight:700;color:var(--warn);font-family:'SF Mono',monospace;">${this.formatMs(perf.p95_response_ms)}</div>
                    </div>
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Cache Hit Rate</div>
                        <div style="font-size:13px;font-weight:700;color:var(--ok);font-family:'SF Mono',monospace;">${perf.cache_hit_rate}%</div>
                    </div>
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Error Rate</div>
                        <div style="font-size:13px;font-weight:700;color:${errorColor};font-family:'SF Mono',monospace;">${perf.error_rate}%</div>
                    </div>
                </div>
            `;
        }

        /**
         * Format index health display
         */
        formatIndexHealthHTML(health) {
            if (!health) {
                return `<div style="color:var(--fg-muted);font-size:12px;">Index health unavailable</div>`;
            }

            const healthColor = health.health_status === 'healthy' ? 'var(--ok)' : 'var(--warn)';

            return `
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Chunks</div>
                        <div style="font-size:13px;font-weight:700;color:var(--link);font-family:'SF Mono',monospace;">${health.total_chunks.toLocaleString()}</div>
                    </div>
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg Score</div>
                        <div style="font-size:13px;font-weight:700;color:var(--accent);font-family:'SF Mono',monospace;">${health.avg_score}</div>
                    </div>
                    <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                        <div style="font-size:9px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Anomalies</div>
                        <div style="font-size:13px;font-weight:700;color:${healthColor};font-family:'SF Mono',monospace;">${health.anomalies}</div>
                    </div>
                </div>
            `;
        }

        /**
         * Format top folders display
         */
        formatTopFoldersHTML(folders) {
            if (!folders || folders.length === 0) {
                return `<div style="color:var(--fg-muted);font-size:12px;">No folder access data yet</div>`;
            }

            const folderChips = folders
                .map(f => `
                    <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:linear-gradient(135deg,var(--bg-elev2) 0%,var(--card-bg) 100%);border:1px solid var(--line);border-radius:20px;font-size:11px;color:var(--fg);font-family:'SF Mono',monospace;transition:all 0.2s ease;cursor:pointer;margin:4px;white-space:nowrap;">
                        <span>${f.folder}</span>
                        <span style="background:var(--accent);color:var(--panel);padding:2px 8px;border-radius:12px;font-weight:600;font-size:10px;">${f.count}</span>
                    </div>
                `)
                .join('');

            return `
                <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--bg-elev2);">
                    <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">Top Folders (5 days)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:flex-start;">
                        ${folderChips}
                    </div>
                </div>
            `;
        }
    }

    // Export globally
    window.DashboardMetrics = DashboardMetrics;
})();
