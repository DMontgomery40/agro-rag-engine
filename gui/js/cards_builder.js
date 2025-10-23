// Cards Builder (Job + SSE) logic with PERMANENT VISIBLE PROGRESS. Exported via window.CardsBuilder
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);
  const state = (window.CoreUtils && window.CoreUtils.state) ? window.CoreUtils.state : {};
  const $ = (id) => document.getElementById(id);
  let cardsJob = { id: null, timer: null, sse: null };
  const STAGE_ORDER = ['scan', 'chunk', 'summarize', 'write', 'sparse', 'finalize'];
  const STAGE_LABELS = {
    scan: 'Scan Existing Chunks',
    chunk: 'Chunk Prep',
    summarize: 'Semantic Enrichment',
    sparse: 'Sparse Index (BM25)',
    write: 'Writing Cards',
    finalize: 'Finalize'
  };

  let cardsTerminal = null;
  let repoConfigCache = null;
  let lastProgressStage = null;
  let lastProgressPct = 0;
  let lastTip = '';
  let lastModelSignature = '';
  let lastProgressLogTs = 0;
  // Populate repo dropdown

  function findRepoConfig(repoName, config) {
    if (!repoName || !config || !Array.isArray(config.repos)) return null;
    return config.repos.find(
      (repo) => repo.name === repoName || repo.slug === repoName
    ) || null;
  }

  function formatList(value) {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
    return '';
  }

  function applyRepoDefaults(repoName, config) {
    const repo = findRepoConfig(repoName, config);
    if (!repo) return { applied: false, repo: null };

    const excludeDirsInput = $('cards-exclude-dirs');
    if (excludeDirsInput) {
      excludeDirsInput.value = formatList(repo.exclude_paths);
      excludeDirsInput.dataset.prefill = '1';
    }

    const excludePatternsInput = $('cards-exclude-patterns');
    if (excludePatternsInput) {
      // Patterns were historically part of exclude paths; leave blank unless provided
      const patterns = Array.isArray(repo.exclude_patterns) ? repo.exclude_patterns : [];
      excludePatternsInput.value = formatList(patterns);
      excludePatternsInput.dataset.prefill = '1';
    }

    const excludeKeywordsInput = $('cards-exclude-keywords');
    if (excludeKeywordsInput) {
      excludeKeywordsInput.value = formatList(repo.keywords);
      excludeKeywordsInput.dataset.prefill = '1';
    }

    return { applied: true, repo };
  }

  function ensureCardsTerminal() {
    if (!window.LiveTerminal) {
      console.warn('[cards_builder] LiveTerminal not available yet');
      return null;
    }
    if (!cardsTerminal) {
      cardsTerminal = new window.LiveTerminal('cards-terminal-container');
      cardsTerminal.setTitle('Cards Build Output');
      cardsTerminal.hide();
    }
    return cardsTerminal;
  }

  function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString(undefined, { hour12: false });
  }

  function logToTerminal(lines) {
    const term = ensureCardsTerminal();
    if (!term || !lines || !lines.length) return;
    term.appendLines(lines.map(line => `[${formatTimestamp()}] ${line}`));
  }

  async function populateRepoSelect(configOverride){
    const sel = $('cards-repo-select');
    if (!sel) return null;
    sel.disabled = true;
    sel.dataset.status = 'loading';
    try {
      let config = configOverride;
      if (!config) {
        const r = await fetch(api('/api/config'));
        config = await r.json();
      }
      repoConfigCache = config;
      sel.innerHTML = '';
      const repos = Array.isArray(config.repos) ? config.repos : [];
      if (repos.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No repositories configured';
        sel.appendChild(opt);
        sel.disabled = true;
      } else {
        repos.forEach(repo => {
          const opt = document.createElement('option');
          opt.value = repo.name;
          opt.textContent = repo.name;
          sel.appendChild(opt);
        });
        sel.disabled = false;
        const preferred = (config.env && config.env.REPO) || config.default_repo || repos[0]?.name || '';
        if (preferred) {
          sel.value = preferred;
        }
      }
      sel.dataset.status = 'ready';
      if (!sel.dataset.defaultsBound) {
        sel.addEventListener('change', () => {
          applyRepoDefaults(sel.value, repoConfigCache);
        });
        sel.dataset.defaultsBound = '1';
      }
      const appliedDefaults = applyRepoDefaults(sel.value, config);
      const repoForSummary = appliedDefaults.repo || findRepoConfig(sel.value, config);
      return {
        repos,
        selected: sel.value,
        active: (config.env && config.env.REPO) || config.default_repo || '',
        prefills: {
          exclude_paths: Array.isArray(repoForSummary?.exclude_paths) ? repoForSummary.exclude_paths.length : 0,
          keywords: Array.isArray(repoForSummary?.keywords) ? repoForSummary.keywords.length : 0,
          exclude_patterns: Array.isArray(repoForSummary?.exclude_patterns) ? repoForSummary.exclude_patterns.length : 0
        }
      };
    } catch(e){
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to load repositories', {
        message: e.message,
        causes: [
          'Backend configuration API service is unavailable',
          'Invalid JSON response from configuration endpoint',
          'Network connectivity issue or timeout',
          'Repository configuration file is missing or corrupted'
        ],
        fixes: [
          'Verify backend service is running in Infrastructure tab',
          'Check backend logs for configuration loading errors',
          'Verify network connectivity and check firewall rules',
          'Refresh the page and try loading repositories again'
        ],
        links: [
          ['Fetch API Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API'],
          ['JSON Parsing Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse']
        ]
      }) : `Failed to load repos: ${e.message}`;
      console.error('[cards_builder] Failed to load repos:', msg);
      sel.innerHTML = '<option value="">Failed to load repositories</option>';
      sel.disabled = true;
      sel.dataset.status = 'error';
      if (window.UXFeedback?.toast) {
        window.UXFeedback.toast('Failed to load repositories for cards builder.', 'error');
      }
      throw e;
    }
  }

  function resetStagePills() {
    document.querySelectorAll('.cards-stage-pill').forEach(pill => {
      pill.style.color = 'var(--fg-muted)';
      pill.style.borderColor = 'var(--line)';
      pill.style.background = 'transparent';
      pill.style.fontWeight = '400';
    });
  }

  function showProgress(repo){
    lastProgressStage = null;
    lastProgressPct = 0;
    lastTip = '';
    lastModelSignature = '';
    lastProgressLogTs = 0;

    resetStagePills();

    const modelsRow = $('cards-progress-models');
    if (modelsRow) modelsRow.style.display = 'none';

    const cont = $('cards-progress-container');
    if (cont) cont.style.display = 'block';

    const stats = $('cards-progress-stats');
    if (stats) stats.textContent = '0 / 0 (0%)';
    const statsModal = $('cards-progress-stats-modal');
    if (statsModal) statsModal.textContent = '0 / 0 (0%)';
    const tipEl = $('cards-progress-tip');
    if (tipEl) tipEl.textContent = '💡 Starting...';
    const bar = $('cards-progress-bar');
    if (bar) bar.style.width = '0%';
    const thr = $('cards-progress-throughput');
    if (thr) thr.textContent = '--';
    const eta = $('cards-progress-eta');
    if (eta) eta.textContent = 'ETA: --';

    const term = ensureCardsTerminal();
    if (term) {
      term.show();
      term.clear();
      term.setTitle(`Cards Build • ${repo || '—'}`);
      term.updateProgress(0, 'starting');
      logToTerminal([
        `Starting cards build for repo ${repo || '(unknown)'}`,
        `Filters → dirs: "${$('cards-exclude-dirs')?.value || '(none)'}" • patterns: "${$('cards-exclude-patterns')?.value || '(none)'}" • keywords: "${$('cards-exclude-keywords')?.value || '(none)'}"`,
        $('cards-enrich-gui')?.checked ? 'Enrich with AI: enabled' : 'Enrich with AI: disabled'
      ]);
    }
  }

  function hideProgress(){
    const cont = $('cards-progress-container');
    if (cont) cont.style.display = 'none';
    const term = ensureCardsTerminal();
    if (term) {
      term.hideProgress();
    }
  }

  function showCompletionStatus(data){
    // Show progress bar as a persistent status summary
    const cont = $('cards-progress-container');
    if (cont) {
      cont.style.display = 'block';
      cont.style.border = '2px solid var(--ok)';
    }
    const title = cont?.querySelector('div[style*="Building Cards"]');
    if (title) {
      title.textContent = '✓ Cards Build Complete';
      title.style.color = 'var(--ok)';
    }
    updateProgress(data);
    const term = ensureCardsTerminal();
    if (term) {
      term.updateProgress(100, 'complete');
      logToTerminal([
        `✅ Cards build finished in ${data?.result?.duration_s || 0}s`,
        `   cards written: ${data?.result?.cards_written || 0}, skipped: ${data?.result?.chunks_skipped || 0}`
      ]);
    }
    // Keep visible - don't auto-hide
  }

  function showErrorStatus(error){
    const cont = $('cards-progress-container');
    if (cont) {
      cont.style.display = 'block';
      cont.style.border = '2px solid var(--err)';
    }
    const title = cont?.querySelector('div');
    if (title) {
      title.textContent = '✗ Cards Build Failed';
      title.style.color = 'var(--err)';
    }
    const tipEl = $('cards-progress-tip');
    if (tipEl) tipEl.textContent = `❌ ${error || 'Unknown error'}`;
    const term = ensureCardsTerminal();
    if (term) {
      term.updateProgress(lastProgressPct, 'error');
      logToTerminal([`✗ Cards build failed: ${error || 'Unknown error'}`]);
    }
  }

  function highlightStage(stage){
    const currentIdx = STAGE_ORDER.indexOf(stage);
    STAGE_ORDER.forEach((name, idx) => {
      const el = $('cards-progress-stage-'+name);
      if (!el) return;
      if (currentIdx === -1) {
        el.style.color = 'var(--fg-muted)';
        el.style.borderColor = 'var(--line)';
        el.style.background = 'transparent';
        el.style.fontWeight = '400';
        return;
      }
      if (idx < currentIdx) {
        el.style.color = 'var(--ok)';
        el.style.borderColor = 'var(--ok)';
        el.style.background = 'color-mix(in oklch, var(--ok) 20%, var(--bg))';
        el.style.fontWeight = '600';
      } else if (idx === currentIdx) {
        el.style.color = 'var(--fg)';
        el.style.borderColor = 'var(--accent)';
        el.style.background = 'color-mix(in oklch, var(--accent) 20%, var(--bg))';
        el.style.fontWeight = '700';
      } else {
        el.style.color = 'var(--fg-muted)';
        el.style.borderColor = 'var(--line)';
        el.style.background = 'transparent';
        el.style.fontWeight = '400';
      }
    });
  }

  function updateModelRow(model) {
    const row = $('cards-progress-models');
    if (!row) return;
    if (!model) {
      row.style.display = 'none';
      return;
    }
    row.style.display = 'block';
    const embedSpan = row.querySelector('[data-model="embed"]');
    const enrichSpan = row.querySelector('[data-model="enrich"]');
    const rerankSpan = row.querySelector('[data-model="rerank"]');
    if (embedSpan) embedSpan.textContent = model.embed || '—';
    if (enrichSpan) enrichSpan.textContent = model.enrich || '—';
    if (rerankSpan) rerankSpan.textContent = model.rerank || '—';
    const signature = `${model.embed || ''}|${model.enrich || ''}|${model.rerank || ''}`;
    if (signature !== lastModelSignature) {
      logToTerminal([
        `Models — embed: ${model.embed || '—'} | enrich: ${model.enrich || '—'} | rerank: ${model.rerank || '—'}`
      ]);
      lastModelSignature = signature;
    }
  }

  function updateProgress(data){
    try {
      const { pct, total, done, tip, model, stage, throughput, eta_s, repo } = data || {};
      const pctValue = typeof pct === 'number' ? pct : 0;
      lastProgressPct = pctValue;
      if (model) updateModelRow(model);
      
      const bar = $('cards-progress-bar');
      if (bar) bar.style.width = `${pctValue}%`;
      
      const stats = $('cards-progress-stats');
      if (stats) stats.textContent = `${done||0} / ${total||0} (${pctValue.toFixed(1)}%)`;
      const statsModal = $('cards-progress-stats-modal');
      if (statsModal) statsModal.textContent = `${done||0} / ${total||0} (${pctValue.toFixed(1)}%)`;
      
      const thr = $('cards-progress-throughput');
      if (thr) thr.textContent = throughput || '--';
      
      const eta = $('cards-progress-eta');
      if (eta) eta.textContent = `ETA: ${eta_s||0}s`;
      
      const tipEl = $('cards-progress-tip');
      if (tipEl) {
        if (tip) {
          tipEl.textContent = `💡 ${tip}`;
          if (tip !== lastTip) {
            logToTerminal([`Tip: ${tip}`]);
            lastTip = tip;
          }
        } else {
          tipEl.textContent = '💡';
        }
      }
      
      const repoEl = $('cards-progress-repo');
      if (repoEl && repo) repoEl.textContent = repo;
      
      highlightStage(stage);

      const humanStage = STAGE_LABELS[stage] || (stage ? stage.toUpperCase() : 'Progress');
      const term = ensureCardsTerminal();
      if (term) {
        term.updateProgress(pctValue, `${humanStage} • ${pctValue.toFixed(1)}%`);
      }

      if (stage && stage !== lastProgressStage) {
        logToTerminal([
          `Stage → ${humanStage}`,
          `   progress: ${done||0}/${total||0} (${pctValue.toFixed(1)}%) • throughput: ${throughput || '--'} • ETA: ${eta_s || 0}s`
        ]);
        lastProgressStage = stage;
        lastProgressLogTs = Date.now();
      } else if (term) {
        const now = Date.now();
        if (now - lastProgressLogTs > 2000) {
          logToTerminal([`… ${humanStage}: ${done||0}/${total||0} (${pctValue.toFixed(1)}%)`]);
          lastProgressLogTs = now;
        }
      }
    } catch(e){ console.error('[cards_builder] Update progress failed:', e); }
  }

  function stopCardsStreams(){
    if (cardsJob.timer) { clearInterval(cardsJob.timer); cardsJob.timer = null; }
    if (cardsJob.sse) { try { cardsJob.sse.close(); } catch{} cardsJob.sse = null; }
    cardsJob.id = null;
  }

  async function startCardsBuild(){
    try{
      const repo = $('cards-repo-select')?.value || 'agro';
      const enrich = $('cards-enrich-gui')?.checked ? 1 : 0;
      const excludeDirs = $('cards-exclude-dirs')?.value || '';
      const excludePatterns = $('cards-exclude-patterns')?.value || '';
      const excludeKeywords = $('cards-exclude-keywords')?.value || '';
      
      const params = new URLSearchParams({
        repo,
        enrich,
        exclude_dirs: excludeDirs,
        exclude_patterns: excludePatterns,
        exclude_keywords: excludeKeywords
      });
      
      showProgress(repo);
      // Reset styling for new build
      const cont = $('cards-progress-container');
      if (cont) cont.style.border = '2px solid var(--accent)';
      const title = cont?.querySelector('div');
      if (title) {
        title.textContent = '⚡ Building Cards...';
        title.style.color = 'var(--fg)';
      }
      updateProgress({ stage: 'scan', done: 0, total: 0, pct: 0, repo, tip: 'Starting cards build...' });
      
      const r = await fetch(api(`/api/cards/build/start?${params}`), { method: 'POST' });
      if (r.status === 409) {
        const d = await r.json();
        if (window.showStatus) window.showStatus(d.detail || 'Job already running', 'error');
        hideProgress();
        return;
      }
      const d = await r.json();
      cardsJob.id = d.job_id;
      if (window.showStatus) window.showStatus('Cards build started', 'loading');
      logToTerminal([`Job ID: ${cardsJob.id}`]);
      
      try {
        const es = new EventSource(api(`/api/cards/build/stream/${cardsJob.id}`));
        cardsJob.sse = es;
        logToTerminal(['EventStream connected']);
        es.addEventListener('open', () => {
          logToTerminal(['SSE connection open']);
        });
        es.addEventListener('progress', (ev) => { try { const data = JSON.parse(ev.data||'{}'); updateProgress(data); } catch(e){ console.error('[cards_builder] SSE parse error:', e); } });
        es.addEventListener('done', async (ev) => {
          stopCardsStreams();
          const finalData = JSON.parse(ev.data||'{}');
          showCompletionStatus(finalData);
          if (window.showStatus) window.showStatus('✓ Cards built successfully', 'success');
          if (window.Cards?.load) await window.Cards.load();
        });
        es.addEventListener('error', (_ev) => {
          console.log('[cards_builder] SSE error, falling back to polling');
          logToTerminal(['⚠️ SSE channel interrupted; switching to polling mode']);
        });
        es.addEventListener('cancelled', (_ev) => {
          stopCardsStreams();
          if (window.showStatus) window.showStatus('Cards build cancelled', 'warn');
          hideProgress();
        });
      } catch (_e) {
        // SSE not available; use polling
        logToTerminal(['Polling job progress (SSE unavailable)…']);
        cardsJob.timer = setInterval(async () => {
          try {
            const s = await (await fetch(api(`/api/cards/build/status/${cardsJob.id}`))).json();
            updateProgress(s);
            if ((s.status||'')==='done'){
              stopCardsStreams();
              showCompletionStatus(s);
              if (window.Cards?.load) await window.Cards.load();
              if (window.showStatus) window.showStatus('✓ Cards built successfully', 'success');
            }
            if ((s.status||'')==='error'){
              stopCardsStreams();
              showErrorStatus(s.error||'Unknown error');
              if (window.showStatus) window.showStatus('✗ Cards build failed: '+(s.error||'Unknown error'), 'error');
            }
          } catch(e){ console.error('[cards_builder] Polling error:', e); }
        }, 1000);
      }
    }catch(e){
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to start cards build', {
        message: e.message,
        causes: [
          'Cards build API service is unavailable or not responding',
          'Job system (Celery/Redis) is not running or experiencing issues',
          'Invalid repository configuration or path is inaccessible',
          'Insufficient system resources (memory, disk space, CPU)'
        ],
        fixes: [
          'Verify backend service and job queue are running in Infrastructure tab',
          'Check that selected repository path exists and is accessible',
          'Verify Redis and Celery services are operational',
          'Check available system resources (memory, disk space)'
        ],
        links: [
          ['Fetch API Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API'],
          ['EventSource API Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/EventSource']
        ]
      }) : `Failed to start cards build: ${e.message}`;
      if (window.showStatus) window.showStatus(msg, 'error');
      hideProgress();
    }
  }

  async function cancelCardsBuild(){
    if (!cardsJob.id) return;
    try {
      await fetch(api('/api/cards/build/cancel/'+cardsJob.id), { method: 'POST' });
      stopCardsStreams();
      hideProgress();
      if (window.showStatus) window.showStatus('Cards build cancelled', 'warn');
      logToTerminal(['⚠️ Cards build cancelled by user.']);
    } catch (e) {
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to cancel cards build', {
        message: e.message,
        causes: [
          'Backend API service not responding during cancellation',
          'Job ID is no longer valid or has already completed',
          'Job system (Celery) is experiencing issues',
          'Network connectivity problem during cancel request'
        ],
        fixes: [
          'Verify backend service is running and responsive',
          'Wait a moment for the current job to finish naturally',
          'Check Infrastructure tab to verify Celery/Redis are running',
          'Try refreshing the page to sync job status'
        ],
        links: [
          ['Fetch API Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API']
        ]
      }) : `Cancel failed: ${e.message}`;
      if (window.showStatus) window.showStatus(msg, 'error');
    }
  }

  async function showLogs(){
    try {
      const r = await fetch(api('/api/cards/build/logs'));
      const d = await r.json();
      if (window.UXFeedback && window.UXFeedback.toast) {
        window.UXFeedback.toast(d.content ? `Build logs (${(d.content.length/1024).toFixed(1)}KB)` : 'No logs available', 'info');
      } else {
        alert(d.content || 'No logs available');
      }
    } catch(e){
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to Load Build Logs', {
        message: e.message,
        causes: [
          'Cards builder process has not run yet',
          'Log file was cleared or deleted',
          'Backend failed to capture build process output',
          'Network timeout retrieving logs'
        ],
        fixes: [
          'Ensure a cards build has been run previously',
          'Verify backend service is running in Infrastructure tab',
          'Check that log directory exists and permissions are correct',
          'Refresh the page and try loading logs again'
        ],
        links: [
          ['Fetch API Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API'],
          ['JSON Parsing Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse']
        ]
      }) : `Unable to load logs: ${e.message}`;
      alert(msg);
      console.error('[cards_builder] Failed to load logs:', msg);
    }
  }

  // Bind events on load
  document.addEventListener('DOMContentLoaded', () => {
    populateRepoSelect();
    const buildBtn = $('btn-cards-build');
    if (buildBtn) buildBtn.addEventListener('click', startCardsBuild);
    const cancelBtn = $('cards-progress-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelCardsBuild);
    const logsBtn = $('cards-progress-logs');
    if (logsBtn) logsBtn.addEventListener('click', showLogs);
    const clearBtn = $('cards-progress-clear');
    if (clearBtn) clearBtn.addEventListener('click', hideProgress);
  });

  // Initialization function called by cards.js when rag-data-quality view mounts
  // Does NOT register view - cards.js handles that
  window.initCardsBuilder = function(forceReload = false) {
    console.log('[cards_builder.js] Initializing cards builder for rag-data-quality view');
    const sel = $('cards-repo-select');
    if (forceReload || !sel || sel.dataset.status !== 'ready') {
      populateRepoSelect();
    }
  };

  window.CardsBuilder = {
    startCardsBuild,
    cancelCardsBuild,
    showLogs,
    updateProgress,
    populateRepoSelect,
    applyRepoDefaults,
    findRepoConfig
  };

  console.log('[cards_builder.js] Module loaded (coordination with cards.js for rag-data-quality view)');
})();
