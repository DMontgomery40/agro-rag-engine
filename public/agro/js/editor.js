// Embedded Editor panel logic. Exported via window.Editor
;(function(){
  'use strict';

  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);
  let editorHealthInterval = null;

  async function checkEditorHealth() {
    try {
      const resp = await fetch(api('/health/editor'));
      const data = await resp.json();
      const badge = document.getElementById('editor-health-badge');
      const badgeText = document.getElementById('editor-health-text');
      const banner = document.getElementById('editor-status-banner');
      const bannerMsg = document.getElementById('editor-status-message');
      const iframe = document.getElementById('editor-iframe');

      if (!badge || !badgeText || !banner || !bannerMsg || !iframe) return;

      if (data.ok) {
        badge.style.background = '#00ff88';
        badge.style.color = '#000';
        badgeText.textContent = '● Healthy';
        banner.style.display = 'none';
        if (!iframe.src) {
          // Prefer same-origin proxy to avoid frame-blocking headers
          iframe.src = '/editor/';
        }
      } else {
        const isDisabled = !data.enabled;
        badge.style.background = isDisabled ? '#666' : '#ff5555';
        badge.style.color = '#fff';
        badgeText.textContent = isDisabled ? '○ Disabled' : '● Error';
        banner.style.display = 'block';
        const reason = data.reason || data.error || 'Unknown error';
        bannerMsg.textContent = isDisabled
          ? `Editor is disabled. Enable it in the Misc tab and restart.`
          : `Error: ${reason}. Check logs or try restarting.`;
        iframe.src = '';
      }
    } catch (error) {
      console.error('[Editor] Failed to check health:', error);
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

  window.Editor = { checkEditorHealth, openEditorWindow, copyEditorUrl, restartEditor, initEditorHealthCheck, stopEditorHealthCheck, bindControls };
})();

