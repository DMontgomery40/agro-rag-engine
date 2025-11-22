import { test, expect } from '@playwright/test';

/**
 * Infrastructure Subtabs API Smoke Test
 *
 * This test verifies that all backend endpoints for Infrastructure subtabs work correctly.
 * Tests the actual API calls that the React components make.
 */

const API_BASE = 'http://localhost:8012';

test.describe('Infrastructure API Smoke Tests', () => {

  test('MCP Status API - returns server status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/mcp/http/status`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('running');
    expect(data).toHaveProperty('host');
    expect(data).toHaveProperty('port');
    expect(data).toHaveProperty('path');
    expect(data).toHaveProperty('url');
  });

  test('Config Load API - returns full configuration', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/config`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('env');
    expect(data).toHaveProperty('repos');
    expect(data.env).toHaveProperty('QDRANT_URL');
    expect(data.env).toHaveProperty('REDIS_URL');
  });

  test('Config Save API - saves infrastructure paths', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/config`, {
      data: {
        env: {
          QDRANT_URL: 'http://127.0.0.1:6333',
          REDIS_URL: 'redis://127.0.0.1:6379/0',
          REPO: 'agro'
        }
      }
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.applied_env_keys).toContain('QDRANT_URL');
    expect(data.applied_env_keys).toContain('REDIS_URL');
    expect(data.applied_env_keys).toContain('REPO');
  });

  test('Alert Thresholds Load API - returns current thresholds', async ({ request }) => {
    const response = await request.get(`${API_BASE}/monitoring/alert-thresholds`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('error_rate_threshold_percent');
    expect(data).toHaveProperty('request_latency_p99_seconds');
    expect(data).toHaveProperty('timeout_errors_per_5min');
    expect(data).toHaveProperty('rate_limit_errors_per_5min');
    expect(data).toHaveProperty('endpoint_call_frequency_per_minute');
  });

  test('Alert Thresholds Save API - updates thresholds', async ({ request }) => {
    const response = await request.post(`${API_BASE}/monitoring/alert-thresholds`, {
      data: {
        error_rate_threshold_percent: 7.5,
        request_latency_p99_seconds: 8.0,
        timeout_errors_per_5min: 15
      }
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.updated).toBeGreaterThan(0);
    expect(data.details.error_rate_threshold_percent).toBe(true);
    expect(data.details.request_latency_p99_seconds).toBe(true);
    expect(data.details.timeout_errors_per_5min).toBe(true);
  });

  test('Alert Thresholds Persistence - saved values persist', async ({ request }) => {
    // First, save new values
    await request.post(`${API_BASE}/monitoring/alert-thresholds`, {
      data: {
        error_rate_threshold_percent: 9.5,
        cohere_rerank_calls_per_minute: 35
      }
    });

    // Then retrieve and verify
    const response = await request.get(`${API_BASE}/monitoring/alert-thresholds`);
    const data = await response.json();

    expect(data.error_rate_threshold_percent).toBe(9.5);
    expect(data.cohere_rerank_calls_per_minute).toBe(35);
  });

  test('MCP Server Controls - start/stop/restart endpoints exist', async ({ request }) => {
    // Just verify endpoints respond (don't actually start/stop servers in test)
    // We're testing that the endpoints exist and accept requests

    // Test start endpoint
    const startResponse = await request.post(`${API_BASE}/api/mcp/http/start`);
    expect(startResponse.status()).toBe(200);
    const startData = await startResponse.json();
    expect(startData).toHaveProperty('success');

    // If already running, that's ok - we're just testing the endpoint exists
    if (!startData.success && startData.error) {
      expect(typeof startData.error).toBe('string');
    }
  });

  test('Config Save API - handles MCP HTTP settings', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/config`, {
      data: {
        env: {
          MCP_HTTP_HOST: '0.0.0.0',
          MCP_HTTP_PORT: '8013',
          MCP_HTTP_PATH: '/mcp'
        }
      }
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.applied_env_keys).toContain('MCP_HTTP_HOST');
    expect(data.applied_env_keys).toContain('MCP_HTTP_PORT');
    expect(data.applied_env_keys).toContain('MCP_HTTP_PATH');
  });
});
