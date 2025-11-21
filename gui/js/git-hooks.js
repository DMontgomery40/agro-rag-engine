// Git Hooks - Git hooks installation and status
// Handles git hooks management for the repository
;(function() {
  'use strict';

  // Get shared utilities
  const api = window.CoreUtils?.api || ((p) => `/api${p}`);
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // Refresh hooks installation status
  async function refreshHooksStatus() {
    try {
      const d = await (await fetch(api('/api/git/hooks/status'))).json();
      const el = $('#hooks-status');
      if (el) {
        el.textContent = (d.post_checkout && d.post_commit)
          ? `Installed @ ${d.dir}`
          : 'Not installed';
      }
    } catch {
      const el = $('#hooks-status');
      if (el) el.textContent = 'Status unavailable';
    }
  }

  // Install git hooks
  async function installHooks() {
    try {
      const r = await fetch(api('/api/git/hooks/install'), { method: 'POST' });
      const d = await r.json();
      if (window.UXFeedback && window.UXFeedback.toast) {
        window.UXFeedback.toast(d.message || 'Hooks installed successfully', 'success');
      } else {
        alert(d.message || 'Hooks installed');
      }
      await refreshHooksStatus();
    } catch (e) {
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Git Hooks Installation Failed', {
        message: e.message,
        causes: [
          'Git hooks directory (.git/hooks) is not writable or missing',
          'Backend git hooks installer service is not responding',
          'Git repository is not initialized in project directory'
        ],
        fixes: [
          'Verify write permissions: chmod 755 .git/hooks',
          'Check Infrastructure tab to ensure backend service is running',
          'Initialize git repository first: git init if needed'
        ],
        links: [
          ['Git Hooks Documentation', 'https://git-scm.com/docs/githooks'],
          ['Git Hooks Setup', 'https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks'],
          ['Backend Health', '/api/health']
        ]
      }) : 'Failed to install hooks: ' + e.message;
      alert(msg);
    }
  }

  // Initialization function called by secrets.js when admin view mounts
  // Does NOT register view - secrets.js handles that
  window.initGitHooks = function() {
    console.log('[git-hooks.js] Initializing git hooks for admin view');
    refreshHooksStatus();
  };

  // Export public API
  window.GitHooks = {
    refreshHooksStatus,
    installHooks
  };

  console.log('[git-hooks.js] Module loaded (coordination with secrets.js for admin view)');
})();
