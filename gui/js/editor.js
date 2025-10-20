// Embedded Editor panel logic. Exported via window.Editor
;(function(){
  'use strict';

  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);
  let editorHealthInterval = null;
  let lastHealthResponse = null;
  let iframeLoadAttempts = 0;
  const MAX_IFRAME_LOAD_ATTEMPTS = 3;

  function _env(name, dflt){
    try { return (window.CoreUtils?.state?.config?.env?.[name]) ?? dflt; } catch { return dflt; }
  }
  function _embedEnabled(){
    const ci = String(_env('CI','')).toLowerCase();
    if (ci === '1' || ci === 'true' || ci === 'yes') return false; // CI guard
    const fld = document.querySelector('[name="EDITOR_EMBED_ENABLED"]');
    if (fld && fld.type === 'checkbox') return fld.checked;
    const envVal = String(_env('EDITOR_EMBED_ENABLED','1'));
    return envVal === '1' || envVal.toLowerCase() === 'true';
  }

  async function checkEditorHealth() {
    try {
      const resp = await fetch(api('/health/editor'));
      const data = await resp.json();
      lastHealthResponse = data;

      const badge = document.getElementById('editor-health-badge');
      const badgeText = document.getElementById('editor-health-text');
      const banner = document.getElementById('editor-status-banner');
      const bannerMsg = document.getElementById('editor-status-message');
      const iframe = document.getElementById('editor-iframe');
      const wrap = document.getElementById('editor-iframe-container');

      if (!badge || !badgeText || !banner || !bannerMsg || !iframe || !wrap) return;

      const canEmbed = _embedEnabled();

      if (data.ok) {
        badge.style.background = 'var(--accent)';
        badge.style.color = 'var(--accent-contrast)';
        badgeText.textContent = '● Healthy';
        banner.style.display = 'none';
        if (canEmbed) {
          wrap.style.display = 'block';
          if (!iframe.src || iframe.src === 'about:blank') {
            // Only load if server confirms ready to avoid race conditions
            if (data.readiness_stage === 'ready') {
              // Use direct URL for WebSocket support (bypasses proxy)
              // The proxy can't handle WebSocket upgrades properly
              iframe.src = data.url || '/editor/';
              iframeLoadAttempts = 0;
            }
          }
        } else {
          wrap.style.display = 'none';
          iframe.src = '';
        }
      } else {
        const isDisabled = !data.enabled;
        badge.style.background = isDisabled ? 'var(--fg-muted)' : 'var(--err)';
        badge.style.color = 'var(--fg)';
        badgeText.textContent = isDisabled ? '○ Disabled' : '● Error';
        banner.style.display = 'block';

        // Provide more detailed status messages based on readiness stage
        let reason = data.reason || data.error || 'Unknown error';
        if (data.readiness_stage === 'startup_delay') {
          reason = `Service initializing (${data.uptime_seconds}s uptime)...`;
        } else if (data.readiness_stage === 'timeout') {
          reason = 'Service timeout - may still be starting up';
        } else if (data.readiness_stage === 'connection_failed') {
          reason = 'Cannot connect to service';
        }

        bannerMsg.textContent = isDisabled
          ? `Editor is disabled. Enable it under Admin → Embedded Editor and restart.`
          : `${reason}. ${isDisabled ? '' : 'Retrying...'}`;
        wrap.style.display = 'none';
        iframe.src = '';
      }
    } catch (error) {
      console.error('[Editor] Failed to check health:', error);
      const badge = document.getElementById('editor-health-badge');
      const badgeText = document.getElementById('editor-health-text');
      if (badge && badgeText) {
        badge.style.background = 'var(--err)';
        badge.style.color = 'var(--fg)';
        badgeText.textContent = '● Error';
      }
    }
  }

  async function openEditorWindow() {
    try {
      const resp = await fetch(api('/health/editor'));
      const data = await resp.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Editor URL not available');
      }
    } catch (error) {
      console.error('[Editor] Failed to open editor window:', error);
    }
  }

  async function copyEditorUrl() {
    try {
      const resp = await fetch(api('/health/editor'));
      const data = await resp.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        const btn = document.getElementById('btn-editor-copy-url');
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = '✓ Copied!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        }
      } else {
        alert('Editor URL not available');
      }
    } catch (error) {
      console.error('[Editor] Failed to copy URL:', error);
    }
  }

  async function restartEditor() {
    try {
      const btn = document.getElementById('btn-editor-restart');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Restarting...';
      }
      const resp = await fetch(api('/api/editor/restart'), { method: 'POST' });
      const data = await resp.json();
      if (data.ok) {
        setTimeout(() => {
          const iframe = document.getElementById('editor-iframe');
          if (iframe) iframe.src = '';
          checkEditorHealth();
        }, 3000);
      } else {
        console.error('[Editor] Restart failed:', data.error || data.stderr);
        alert('Restart failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Editor] Failed to restart editor:', error);
      alert('Restart failed: ' + error.message);
    } finally {
      const btn = document.getElementById('btn-editor-restart');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '↻ Restart';
      }
    }
  }

  function initEditorHealthCheck() {
    // In CI or when embed is disabled, we still update the badge but avoid loading the iframe repeatedly
    if (!editorHealthInterval) {
      checkEditorHealth();
      editorHealthInterval = setInterval(checkEditorHealth, 10000);
    }
  }

  function stopEditorHealthCheck() {
    if (editorHealthInterval) {
      clearInterval(editorHealthInterval);
      editorHealthInterval = null;
    }
  }

  function bindControls(){
    const btnOpenWindow = document.getElementById('btn-editor-open-window');
    const btnCopyUrl = document.getElementById('btn-editor-copy-url');
    const btnRestart = document.getElementById('btn-editor-restart');
    if (btnOpenWindow && !btnOpenWindow.dataset.bound){ btnOpenWindow.dataset.bound='1'; btnOpenWindow.addEventListener('click', openEditorWindow); }
    if (btnCopyUrl && !btnCopyUrl.dataset.bound){ btnCopyUrl.dataset.bound='1'; btnCopyUrl.addEventListener('click', copyEditorUrl); }
    if (btnRestart && !btnRestart.dataset.bound){ btnRestart.dataset.bound='1'; btnRestart.addEventListener('click', restartEditor); }
  }

  // Auto-bind on load
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bindControls);
  } else {
    bindControls();
  }

  // Register with Navigation API
  function registerEditorView() {
    if (window.Navigation && typeof window.Navigation.registerView === 'function') {
      window.Navigation.registerView({
        id: 'vscode',
        title: 'VS Code',
        mount: () => {
          console.log('[editor.js] Mounted as vscode');
          bindControls();
          initEditorHealthCheck();
        },
        unmount: () => {
          console.log('[editor.js] Unmounted');
          stopEditorHealthCheck();
        }
      });
    }
  }

  // Register when Navigation is ready
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', registerEditorView);
  } else {
    registerEditorView();
  }

  window.Editor = { checkEditorHealth, openEditorWindow, copyEditorUrl, restartEditor, initEditorHealthCheck, stopEditorHealthCheck, bindControls };
})();
