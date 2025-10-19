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
    }catch(error){
      console.error('Error loading cards:', error);
      const cardsContainer = document.getElementById('cards-viewer');
      if (cardsContainer) {
        cardsContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--err);">Error loading cards: ${error.message}</div>`;
      }
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
      alert('Error loading raw cards data: ' + error.message);
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
  window.initCards = function() {
    console.log('[cards.js] Initializing cards for rag-data-quality view');
    load();
    bind();
  };

  // Register view (PRIMARY module for rag-data-quality)
  if (window.Navigation && typeof window.Navigation.registerView === 'function') {
    window.Navigation.registerView({
      id: 'rag-data-quality',
      title: 'Data Quality',
      mount: () => {
        console.log('[cards.js] Mounted rag-data-quality view');
        // Initialize cards (primary)
        if (typeof window.initCards === 'function') window.initCards();
        // Initialize cards builder
        if (typeof window.initCardsBuilder === 'function') window.initCardsBuilder();
        // Initialize keywords
        if (typeof window.initKeywords === 'function') window.initKeywords();
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

