// Cards viewer logic (list + build UI). Exported via window.Cards
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);

  async function load(){
    try{
      console.log('[cards.js] Starting load...');
      const resp = await fetch(api('/api/cards'));
      const data = await resp.json();
      console.log('[cards.js] Loaded data:', data);
      const cards = Array.isArray(data.cards) ? data.cards : [];
      const last = data.last_build || null;
      const lastBox = document.getElementById('cards-last-build');
      if (lastBox) {
        if (last && last.started_at) {
          const when = new Date(last.started_at).toLocaleString();
          const cnt = (last.result && last.result.cards_written) ? ` • ${last.result.cards_written} updated` : '';
          const dur = (last.result && typeof last.result.duration_s==='number') ? ` • ${last.result.duration_s}s` : '';
          lastBox.textContent = `Last build: ${when}${cnt}${dur}`;
          lastBox.style.display = 'block';
        } else {
          lastBox.style.display = 'none';
        }
      }
      const cardsContainer = document.getElementById('cards-viewer');
      console.log('[cards.js] Container found:', !!cardsContainer, 'with', cards.length, 'cards');
      if (cardsContainer) {
        cardsContainer.innerHTML = cards.length === 0 ?
          `<div style="text-align: center; padding: 24px; color: var(--fg-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 12px;">
              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="4" x2="9" y2="20"></line>
            </svg>
            <div>No cards available</div>
            <div style="font-size: 11px; margin-top: 8px;">Click "Build Cards" to generate code cards</div>
          </div>` :
          cards.map(card => `
            <div class="card-item" data-filepath="${card.file_path}" data-line="${card.start_line || 1}"
                 style="background: var(--bg-elev2); border: 1px solid var(--line); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                 onmouseover="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-elev1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.borderColor='var(--line)'; this.style.background='var(--bg-elev2)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';">
              <div>
                <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 14px; font-weight: 600; word-break: break-word;">
                  ${(card.symbols && card.symbols[0]) ? card.symbols[0] : (card.file_path || '').split('/').slice(-1)[0]}
                </h4>
                <p style="margin: 0 0 8px 0; color: var(--fg-muted); font-size: 12px; line-height: 1.4; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                  ${card.purpose || 'No description available'}
                </p>
              </div>
              <div style="font-size: 10px; color: var(--fg-muted); word-break: break-all;">
                <span style="color: var(--link);">${card.file_path || 'Unknown file'}</span>
                ${card.start_line ? ` : ${card.start_line}` : ''}
              </div>
            </div>
          `).join('');

        // Bind click on card items
        document.querySelectorAll('.card-item[data-filepath]').forEach(card => {
          card.addEventListener('click', function(){
            const filePath = this.dataset.filepath;
            const lineNumber = this.dataset.line;
            jumpToLine(filePath, lineNumber);
          });
        });
      }
      return { cards, last };
    }catch(error){
      console.error('Error loading cards:', error);
      const cardsContainer = document.getElementById('cards-viewer');
      if (cardsContainer) {
        cardsContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--err);">Error loading cards: ${error.message}</div>`;
      }
      throw error;
    }
  }

  function jumpToLine(filePath, lineNumber){
    const event = new CustomEvent('cardNavigation', { detail: { file: filePath, line: lineNumber } });
    window.dispatchEvent(event);
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: var(--bg-elev2); border: 1px solid var(--accent); padding: 12px 16px; border-radius: 6px; color: var(--fg); font-size: 13px; z-index: 10000; animation: slideInRight 0.3s ease;`;
    notification.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--accent);">📍</span><span>Navigate to: <strong style="color:var(--link);">${filePath}:${lineNumber}</strong></span></div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function getDataQualityLoadingElements() {
    const panel = document.getElementById('data-quality-loading');
    if (!panel) return null;
    return {
      panel,
      label: document.getElementById('data-quality-loading-label'),
      percent: document.getElementById('data-quality-loading-percent'),
      bar: document.getElementById('data-quality-loading-bar'),
      detail: document.getElementById('data-quality-loading-step')
    };
  }

  function updateDataQualityLoading(completed, total, label, detail) {
    const els = getDataQualityLoadingElements();
    if (!els || !els.panel || !els.label || !els.percent || !els.bar || !els.detail) return;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    els.panel.style.display = 'block';
    if (els.panel.dataset.status !== 'error') {
      els.panel.dataset.status = 'loading';
    }
    els.label.textContent = label;
    const clampedPct = Math.min(100, Math.max(0, pct));
    els.percent.textContent = `${clampedPct}%`;
    els.bar.style.width = `${clampedPct}%`;
    els.bar.style.background = 'linear-gradient(90deg, var(--accent) 0%, var(--link) 100%)';
    els.detail.textContent = detail || label;
    els.detail.style.color = 'var(--fg-muted)';
  }

  function completeDataQualityLoading(total, summary) {
    const els = getDataQualityLoadingElements();
    if (!els) return;
    updateDataQualityLoading(total, total, 'Data Quality Ready', summary || 'All data synchronized.');
    els.panel.dataset.status = 'done';
    if (els.bar) {
      els.bar.style.background = 'linear-gradient(90deg, var(--ok) 0%, var(--accent) 100%)';
      els.bar.style.width = '100%';
    }
    if (els.percent) els.percent.textContent = '100%';
    if (els.detail) {
      els.detail.textContent = summary || 'All resources synchronized.';
      els.detail.style.color = 'var(--fg-muted)';
    }
    setTimeout(() => {
      if (els.panel.dataset.status === 'done') {
        els.panel.style.display = 'none';
      }
    }, 1200);
  }

  function failDataQualityLoading(total, completed, message) {
    const els = getDataQualityLoadingElements();
    if (!els) return;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    els.panel.style.display = 'block';
    els.panel.dataset.status = 'error';
    els.label.textContent = 'Data Quality Load Failed';
    const clampedPct = Math.min(100, Math.max(0, pct));
    els.percent.textContent = `${clampedPct}%`;
    els.bar.style.width = `${clampedPct}%`;
    els.bar.style.background = 'var(--err)';
    if (els.detail) {
      els.detail.textContent = message || 'Unable to complete loading.';
      els.detail.style.color = 'var(--err)';
    }
  }

  async function refresh(){ await load(); }

  async function build(){
    try{
      const btn = document.getElementById('btn-cards-build');
      if (btn) { btn.disabled = true; btn.textContent = 'Building Cards...'; }
      const resp = await fetch(api('/api/cards/build'), { method: 'POST' });
      const data = await resp.json();
      if (data.success || data.status === 'success') { await load(); }
      else { console.error('Failed to build cards:', data.message || 'Unknown error'); }
    }catch(error){ console.error('Error building cards:', error); }
    finally{
      const btn = document.getElementById('btn-cards-build');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span style="margin-right: 4px;">⚡</span> Build Cards'; }
    }
  }

  async function viewAllCards(){
    try {
      console.log('[cards.js] Fetching all cards for raw view...');
      const resp = await fetch(api('/api/cards/raw-text'));
      const rawText = await resp.text();

      // Create a modal/terminal view
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 9999; padding: 20px;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: var(--code-bg); border: 1px solid var(--line);
        border-radius: 8px; width: 100%; max-width: 90%;
        max-height: 85vh; display: flex; flex-direction: column;
        font-family: 'SF Mono', monospace; font-size: 12px;
        color: var(--fg);
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 12px 16px; border-bottom: 1px solid var(--line);
        display: flex; justify-content: space-between; align-items: center;
        background: var(--bg-elev2);
      `;
      header.innerHTML = `
        <strong style="color: var(--accent);">📋 All Cards Raw Data</strong>
        <button style="padding: 4px 8px; background: var(--accent); color: var(--code-bg); border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">Close</button>
      `;

      // Content
      const content = document.createElement('div');
      content.style.cssText = `
        flex: 1; overflow-y: auto; padding: 16px;
        white-space: pre-wrap; word-wrap: break-word; word-break: break-word;
        line-height: 1.5;
      `;
      content.textContent = rawText;

      // Close handler
      const closeBtn = header.querySelector('button');
      const closeModal = () => modal.remove();
      closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      container.appendChild(header);
      container.appendChild(content);
      modal.appendChild(container);
      document.body.appendChild(modal);

      console.log('[cards.js] Raw data modal opened');
    } catch(error) {
      console.error('[cards.js] Error viewing all cards:', error);
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to Load Cards', {
        message: error.message,
        causes: [
          'Backend cards API endpoint is not responding',
          'No semantic cards have been built yet',
          'Cards database file is corrupted or missing',
          'Network timeout while fetching cards data'
        ],
        fixes: [
          'Build semantic cards first: go to Data > Cards Builder',
          'Verify backend is running: check Infrastructure tab',
          'Check backend logs for cards loading errors',
          'Refresh the page and try loading cards again'
        ],
        links: [
          ['Semantic Cards Documentation', '/docs/CARDS.md'],
          ['Building Cards', '/docs/CARDS.md#building-cards'],
          ['Backend Health', '/api/health']
        ]
      }) : ('Error loading raw cards data: ' + error.message);
      alert(msg);
    }
  }

  function bind(){
    const btnRefresh = document.getElementById('btn-cards-refresh');
    const btnBuild = document.getElementById('btn-cards-build');
    const btnViewAll = document.getElementById('btn-cards-view-all');
    if (btnRefresh && !btnRefresh.dataset.bound){ btnRefresh.dataset.bound='1'; btnRefresh.addEventListener('click', refresh); }
    if (btnBuild && !btnBuild.dataset.bound){ btnBuild.dataset.bound='1'; btnBuild.addEventListener('click', build); }
    if (btnViewAll && !btnViewAll.dataset.bound){ btnViewAll.dataset.bound='1'; btnViewAll.addEventListener('click', viewAllCards); }
  }

  // Initialization function for data quality view
  window.initCards = function(options = {}) {
    console.log('[cards.js] Initializing cards for rag-data-quality view');
    if (!options || options.skipLoad !== true) {
      load();
    }
    bind();
  };

  // Register view (PRIMARY module for rag-data-quality)
  if (window.Navigation && typeof window.Navigation.registerView === 'function') {
    window.Navigation.registerView({
      id: 'rag-data-quality',
      title: 'Data Quality',
      mount: async () => {
        console.log('[cards.js] Mounted rag-data-quality view');
        const totalSteps = 4;
        let completedSteps = 0;
        const summaryParts = [];

        const runStep = async (label, startDetail, action, summarize) => {
          updateDataQualityLoading(completedSteps, totalSteps, label, startDetail);
          const result = await action();
          completedSteps += 1;
          const detail = summarize ? summarize(result) : startDetail;
          updateDataQualityLoading(completedSteps, totalSteps, label, detail);
          return result;
        };

        try {
          const configState = await runStep(
            'Syncing configuration',
            'Fetching latest environment & repositories…',
            async () => {
              if (!window.Config?.loadConfig) {
                throw new Error('Configuration module unavailable');
              }
              const success = await window.Config.loadConfig();
              if (!success) {
                throw new Error('Configuration refresh failed (see console for details)');
              }
              return (window.CoreUtils && window.CoreUtils.state && window.CoreUtils.state.config) ? window.CoreUtils.state.config : {};
            },
            (cfg) => {
              const repoCount = Array.isArray(cfg?.repos) ? cfg.repos.length : 0;
              const activeRepo = cfg?.env?.REPO || cfg?.default_repo || '—';
              summaryParts.push(`repos ${repoCount}`);
              return `${repoCount} repositories • active: ${activeRepo}`;
            }
          );

          await runStep(
            'Preparing cards builder',
            'Syncing repository selector…',
            async () => {
              if (!window.CardsBuilder?.populateRepoSelect) {
                throw new Error('Cards builder module unavailable');
              }
              return await window.CardsBuilder.populateRepoSelect(configState);
            },
            (summary) => {
              if (!summary) return 'Cards builder ready';
              const repoCount = Array.isArray(summary.repos) ? summary.repos.length : 0;
              const selected = summary.selected || '—';
              const keywordCount = summary.prefills?.keywords ?? 0;
              const excludeCount = summary.prefills?.exclude_paths ?? 0;
              const pieces = [
                `${repoCount} options`,
                `selected: ${selected}`
              ];
              if (excludeCount > 0) pieces.push(`excluded paths: ${excludeCount}`);
              if (keywordCount > 0) pieces.push(`prefilled keywords: ${keywordCount}`);
              return pieces.join(' • ');
            }
          );

          await runStep(
            'Loading keywords',
            'Fetching discriminative keywords…',
            async () => {
              if (!window.Keywords?.loadKeywords) {
                throw new Error('Keywords module unavailable');
              }
              const data = await window.Keywords.loadKeywords();
              if (!data || !Array.isArray(data.keywords)) {
                throw new Error('Keyword catalog missing or invalid');
              }
              return data;
            },
            (data) => {
              const count = Array.isArray(data.keywords) ? data.keywords.length : 0;
              summaryParts.push(`keywords ${count}`);
              return `${count} keywords loaded`;
            }
          );

          await runStep(
            'Loading semantic cards',
            'Fetching cards catalog…',
            async () => {
              const data = await load();
              if (!data || !Array.isArray(data.cards)) {
                throw new Error('Cards dataset missing or invalid');
              }
              return data;
            },
            (data) => {
              const count = Array.isArray(data.cards) ? data.cards.length : 0;
              summaryParts.push(`cards ${count}`);
              return `${count} cards ready`;
            }
          );

          const summary = summaryParts.join(' • ');
          completeDataQualityLoading(totalSteps, summary);
          console.log('[cards.js] Data Quality resources loaded:', {
            repos: summaryParts.find(p => p.startsWith('repos')),
            keywords: summaryParts.find(p => p.startsWith('keywords')) || 'keywords 0',
            cards: summaryParts.find(p => p.startsWith('cards')) || 'cards 0'
          });
        } catch (err) {
          console.error('[cards.js] Data Quality initialization failed:', err);
          failDataQualityLoading(totalSteps, completedSteps, err.message || 'Failed to prepare data quality view');
          if (window.UXFeedback?.toast) {
            window.UXFeedback.toast(`Data Quality failed: ${err.message}`, 'error');
          }
        } finally {
          if (typeof window.initCards === 'function') window.initCards({ skipLoad: true });
          if (typeof window.initCardsBuilder === 'function') window.initCardsBuilder(false);
          if (typeof window.initKeywords === 'function') window.initKeywords({ skipLoad: true });
        }
      },
      unmount: () => {
        console.log('[cards.js] Unmounted from rag-data-quality');
      }
    });
  } else {
    console.warn('[cards.js] Navigation API not available, falling back to legacy mode');
    // Legacy mode: auto-init
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => { load(); bind(); });
    } else {
      load(); bind();
    }
  }

  window.Cards = { load, refresh, build, jumpToLine, bind };

  console.log('[cards.js] Module loaded (PRIMARY for rag-data-quality, coordinates cards_builder.js + keywords.js)');
})();
