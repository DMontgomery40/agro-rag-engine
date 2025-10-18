// AGRO GUI - Grafana Embed Module
// Builds iframe URL from GUI-controlled env and provides show/hide controls
(function() {
  'use strict';

  const { api, $, state } = window.CoreUtils || {};

  function env(k, d) {
    try { return (state.config && state.config.env && (state.config.env[k] ?? d)) ?? d; } catch { return d; }
  }

  function vFromDom(name, fallback) {
    // Always prefer env value first, then fallback to DOM
    const envVal = env(name, null);
    if (envVal !== null && envVal !== undefined && envVal !== '') return String(envVal);

    const el = document.querySelector(`[name="${name}"]`);
    if (!el) return fallback;
    if (el.type === 'checkbox') return el.checked ? '1' : '0';
    return el.value || fallback;
  }

  function buildUrl() {
    const base = String(vFromDom('GRAFANA_BASE_URL', 'http://127.0.0.1:3000')).replace(/\/$/, '');
    const uid = String(vFromDom('GRAFANA_DASHBOARD_UID', 'agro-overview'));
    const slug = String(vFromDom('GRAFANA_DASHBOARD_SLUG', 'agro-overview'));
    const orgId = String(vFromDom('GRAFANA_ORG_ID', '1'));
    const refresh = String(vFromDom('GRAFANA_REFRESH', '10s'));
    const kiosk = String(vFromDom('GRAFANA_KIOSK', 'tv'));
    const authMode = String(vFromDom('GRAFANA_AUTH_MODE', 'anonymous'));
    const token = String(vFromDom('GRAFANA_AUTH_TOKEN', '') || '');

    const params = new URLSearchParams();
    if (orgId) params.set('orgId', orgId);
    if (refresh) params.set('refresh', refresh);
    if (kiosk) params.set('kiosk', kiosk);
    if (authMode === 'token' && token) params.set('auth_token', token);

    return `${base}/d/${encodeURIComponent(uid)}/${encodeURIComponent(slug)}?${params.toString()}`;
  }

  function applyEmbedVisibility() {
    const enabled = String(vFromDom('GRAFANA_EMBED_ENABLED', 'true')).toLowerCase();
    const isCI = (() => { try { return /^(1|true|yes)$/i.test(String(env('CI',''))); } catch { return false; } })();
    const show = !isCI && (enabled === 'true' || enabled === '1');
    const wrap = document.getElementById('grafana-embed');
    if (wrap) wrap.style.display = show ? 'block' : 'none';
    // Auto-load iframe only when not in CI
    if (show) {
      const iframe = document.getElementById('grafana-iframe');
      if (iframe && !iframe.src) iframe.src = buildUrl();
    }
  }

  function preview() {
    const iframe = document.getElementById('grafana-iframe');
    const wrap = document.getElementById('grafana-embed');
    if (wrap) wrap.style.display = 'block';
    if (iframe) iframe.src = buildUrl();
  }

  function openExternal() {
    const url = buildUrl();
    try { window.open(url, '_blank'); } catch { /* no-op */ }
  }

  function init() {
    // When config loads (or reloads), set default values and visibility (no iframe load)
    applyEmbedVisibility();

    const prevBtn = document.getElementById('grafana-preview');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); preview(); });
    const openBtn = document.getElementById('grafana-open');
    if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openExternal(); });
  }

  function showDashboard() {
    preview();
  }

  function hideDashboard() {
    const wrap = document.getElementById('grafana-embed');
    if (wrap) wrap.style.display = 'none';
  }

  function isVisible() {
    const wrap = document.getElementById('grafana-embed');
    return wrap && wrap.style.display !== 'none';
  }

  function getConfig() {
    return {
      baseUrl: vFromDom('GRAFANA_BASE_URL', 'http://127.0.0.1:3000'),
      dashboardUid: vFromDom('GRAFANA_DASHBOARD_UID', 'agro-overview'),
      embedEnabled: vFromDom('GRAFANA_EMBED_ENABLED', 'true')
    };
  }

  // Register with Navigation API
  function registerGrafanaView() {
    if (window.Navigation && typeof window.Navigation.registerView === 'function') {
      window.Navigation.registerView({
        id: 'grafana',
        title: 'Grafana',
        mount: () => {
          console.log('[grafana.js] Mounted');
          init();
          applyEmbedVisibility();
        },
        unmount: () => {
          console.log('[grafana.js] Unmounted');
          // No cleanup needed currently
        }
      });
    }
  }

  // Expose minimal API
  window.Grafana = {
    buildUrl,
    preview,
    openExternal,
    showDashboard,
    hideDashboard,
    isVisible,
    getConfig
  };

  // Initialize after DOM + after Config first load
  document.addEventListener('DOMContentLoaded', () => {
    // If Config is already loaded, init now, else hook into loadConfig completion
    setTimeout(init, 0);
    // Register with Navigation API
    registerGrafanaView();
  });
})();
