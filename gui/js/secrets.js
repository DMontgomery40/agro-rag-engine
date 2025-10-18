// Secrets - Drag & Drop secrets file ingestion
// Handles .env file upload and secrets management
;(function() {
  'use strict';

  // Get shared utilities
  const api = window.CoreUtils?.api || ((p) => `/api${p}`);
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // Ingest a secrets file
  async function ingestFile(file) {
    const persist = $('#persist-secrets')?.checked || false;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('persist', String(persist));

    try {
      const r = await fetch(api('/api/secrets/ingest'), {
        method: 'POST',
        body: fd
      });

      const d = await r.json();
      const outEl = $('#ingest-out');
      if (outEl) {
        outEl.textContent = JSON.stringify(d, null, 2);
      }

      // Reload config after ingestion
      if (typeof window.loadConfig === 'function') {
        await window.loadConfig();
      }
    } catch (e) {
      alert('Secrets ingest failed: ' + e.message);
      console.error('[Secrets] Ingest failed:', e);
    }
  }

  // Bind dropzone for drag & drop
  function bindDropzone() {
    const dz = $('#dropzone');
    const fi = $('#file-input');

    if (!dz || !fi) return;

    function openPicker() {
      fi.click();
    }

    dz.addEventListener('click', openPicker);

    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.style.background = 'var(--panel)';
    });

    dz.addEventListener('dragleave', (e) => {
      dz.style.background = '';
    });

    dz.addEventListener('drop', async (e) => {
      e.preventDefault();
      dz.style.background = '';
      const file = e.dataTransfer.files?.[0];
      if (file) await ingestFile(file);
    });

    fi.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await ingestFile(file);
      fi.value = '';
    });
  }

  // Initialization function for admin view
  window.initSecrets = function() {
    console.log('[secrets.js] Initializing secrets for admin view');
    bindDropzone();
  };

  // Register view (PRIMARY module for admin)
  if (window.Navigation && typeof window.Navigation.registerView === 'function') {
    window.Navigation.registerView({
      id: 'admin',
      title: 'Admin',
      mount: () => {
        console.log('[secrets.js] Mounted admin view');
        // Initialize secrets (primary)
        if (typeof window.initSecrets === 'function') window.initSecrets();
        // Initialize git hooks
        if (typeof window.initGitHooks === 'function') window.initGitHooks();
        // Initialize langsmith
        if (typeof window.initLangSmith === 'function') window.initLangSmith();
      },
      unmount: () => {
        console.log('[secrets.js] Unmounted from admin');
      }
    });
  } else {
    console.warn('[secrets.js] Navigation API not available');
  }

  // Export public API
  window.Secrets = {
    ingestFile,
    bindDropzone
  };

  console.log('[secrets.js] Module loaded (PRIMARY for admin, coordinates git-hooks.js + langsmith.js)');
})();
