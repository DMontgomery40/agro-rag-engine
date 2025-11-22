// AGRO - Monitoring Subtab Component
// Grafana metrics display and alert configuration

import { useState, useEffect } from 'react';

export function MonitoringSubtab() {
  const [errorRateThreshold, setErrorRateThreshold] = useState('5.0');
  const [latencyP99, setLatencyP99] = useState('5.0');
  const [timeoutErrors, setTimeoutErrors] = useState('10');
  const [rateLimitErrors, setRateLimitErrors] = useState('5');
  const [endpointCallFreq, setEndpointCallFreq] = useState('10');
  const [sustainedDuration, setSustainedDuration] = useState('2');
  const [cohereRerankCalls, setCohereRerankCalls] = useState('30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAlertConfig();
  }, []);

  const api = (path: string) => {
    const base = (window as any).API_BASE_URL || '';
    return `${base}${path}`;
  };

  async function loadAlertConfig() {
    try {
      const response = await fetch(api('/monitoring/alert-thresholds'));
      const data = await response.json();

      // Load values from backend
      setErrorRateThreshold(String(data.error_rate_threshold_percent || 5.0));
      setLatencyP99(String(data.request_latency_p99_seconds || 5.0));
      setTimeoutErrors(String(data.timeout_errors_per_5min || 10));
      setRateLimitErrors(String(data.rate_limit_errors_per_5min || 5));
      setEndpointCallFreq(String(data.endpoint_call_frequency_per_minute || 10));
      setSustainedDuration(String(data.endpoint_frequency_sustained_minutes || 2));
      setCohereRerankCalls(String(data.cohere_rerank_calls_per_minute || 30));

      setLoading(false);
    } catch (error) {
      console.error('Failed to load alert config:', error);
      setLoading(false);
    }
  }

  async function saveAlertConfig() {
    setSaving(true);
    try {
      const config = {
        error_rate_threshold_percent: parseFloat(errorRateThreshold),
        request_latency_p99_seconds: parseFloat(latencyP99),
        timeout_errors_per_5min: parseInt(timeoutErrors),
        rate_limit_errors_per_5min: parseInt(rateLimitErrors),
        endpoint_call_frequency_per_minute: parseInt(endpointCallFreq),
        endpoint_frequency_sustained_minutes: parseInt(sustainedDuration),
        cohere_rerank_calls_per_minute: parseInt(cohereRerankCalls)
      };

      const response = await fetch(api('/monitoring/alert-thresholds'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.status === 'ok') {
        alert(`Alert configuration saved successfully! Updated ${data.updated} threshold(s).`);
      } else {
        alert(`Failed to save alert configuration: ${data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error saving alert configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading alert configuration...
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>Performance & Reliability Alerts</h2>
      <p className="small" style={{ marginBottom: '24px' }}>
        Set thresholds for error rates, latency, and timeout incidents.
      </p>

      {/* Performance Alerts */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Performance Thresholds</h3>

        <div className="input-row">
          <div className="input-group">
            <label>Error Rate Threshold (%)</label>
            <input
              type="number"
              value={errorRateThreshold}
              onChange={(e) => setErrorRateThreshold(e.target.value)}
              min="0.1"
              max="50"
              step="0.1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when error rate exceeds this percentage
            </p>
          </div>
          <div className="input-group">
            <label>Request Latency P99 (seconds)</label>
            <input
              type="number"
              value={latencyP99}
              onChange={(e) => setLatencyP99(e.target.value)}
              min="0.1"
              max="60"
              step="0.1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when 99th percentile latency exceeds this
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Timeout Errors (per 5 min)</label>
            <input
              type="number"
              value={timeoutErrors}
              onChange={(e) => setTimeoutErrors(e.target.value)}
              min="1"
              max="1000"
              step="1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when timeout count exceeds this
            </p>
          </div>
          <div className="input-group">
            <label>Rate Limit Errors (per 5 min)</label>
            <input
              type="number"
              value={rateLimitErrors}
              onChange={(e) => setRateLimitErrors(e.target.value)}
              min="1"
              max="1000"
              step="1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when rate limit hits exceed this
            </p>
          </div>
        </div>
      </div>

      {/* API Anomaly Alerts */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>API Anomaly Alerts</h3>
        <p className="small" style={{ marginBottom: '16px' }}>
          Detect unusual API calling patterns that might indicate issues or loops.
        </p>

        <div className="input-row">
          <div className="input-group">
            <label>Endpoint Call Frequency (calls/min)</label>
            <input
              type="number"
              value={endpointCallFreq}
              onChange={(e) => setEndpointCallFreq(e.target.value)}
              min="1"
              max="1000"
              step="1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when a single endpoint gets called this frequently
            </p>
          </div>
          <div className="input-group">
            <label>Sustained Frequency Duration (minutes)</label>
            <input
              type="number"
              value={sustainedDuration}
              onChange={(e) => setSustainedDuration(e.target.value)}
              min="1"
              max="60"
              step="1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Duration threshold for sustained frequency alert
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Cohere Rerank Calls (calls/min)</label>
            <input
              type="number"
              value={cohereRerankCalls}
              onChange={(e) => setCohereRerankCalls(e.target.value)}
              min="1"
              max="1000"
              step="1"
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Alert when Cohere reranking calls spike
            </p>
          </div>
          <div className="input-group"></div>
        </div>
      </div>

      {/* Grafana Metrics Display */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Grafana Metrics</h3>
        <p className="small" style={{ marginBottom: '16px' }}>
          Access detailed metrics and dashboards via Grafana.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <button
            className="small-button"
            onClick={() => window.open('http://127.0.0.1:3000', '_blank')}
            style={{
              background: 'var(--link)',
              color: 'var(--accent-contrast)',
              fontWeight: '600',
              padding: '10px'
            }}
          >
            Open Grafana Dashboard
          </button>
          <button
            className="small-button"
            onClick={() => window.open('http://127.0.0.1:9090', '_blank')}
            style={{
              background: 'var(--warn)',
              color: 'var(--accent-contrast)',
              fontWeight: '600',
              padding: '10px'
            }}
          >
            Open Prometheus
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
          <p style={{ marginBottom: '8px' }}>Available Metrics:</p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.6' }}>
            <li>Request latency (P50, P95, P99)</li>
            <li>Error rates and counts</li>
            <li>API token usage and costs</li>
            <li>Retrieval quality scores</li>
            <li>Container resource usage</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <button
        className="small-button"
        onClick={saveAlertConfig}
        disabled={saving}
        style={{
          width: '100%',
          background: 'var(--accent)',
          color: 'var(--accent-contrast)',
          fontWeight: '600',
          padding: '12px'
        }}
      >
        {saving ? 'Saving...' : 'Save Alert Configuration'}
      </button>
    </div>
  );
}
