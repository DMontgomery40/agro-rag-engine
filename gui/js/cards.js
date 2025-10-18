// Cards viewer logic (list + build UI). Exported via window.Cards
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);

  async function load(){
    try{
      const resp = await fetch(api('/api/cards'));
      const data = await resp.json();
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
                 style="background: var(--bg-elev2); border: 1px solid var(--line); border-radius: 6px; padding: 12px; cursor: pointer; transition: all 0.2s;"
                 onmouseover="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-elev1)';"
                 onmouseout="this.style.borderColor='var(--line)'; this.style.background='var(--bg-elev2)';">
              <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 14px; font-weight: 600;">
                ${(card.symbols && card.symbols[0]) ? card.symbols[0] : (card.file_path || '').split('/').slice(-1)[0]}
              </h4>
              <p style="margin: 0 0 8px 0; color: var(--fg-muted); font-size: 12px; line-height: 1.4;">
                ${card.purpose || 'No description available'}
              </p>
              <div style="font-size: 10px; color: var(--fg-muted);">
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

  function bind(){
    const btnRefresh = document.getElementById('btn-cards-refresh');
    const btnBuild = document.getElementById('btn-cards-build');
    if (btnRefresh && !btnRefresh.dataset.bound){ btnRefresh.dataset.bound='1'; btnRefresh.addEventListener('click', refresh); }
    if (btnBuild && !btnBuild.dataset.bound){ btnBuild.dataset.bound='1'; btnBuild.addEventListener('click', build); }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { load(); bind(); });
  } else {
    load(); bind();
  }

  window.Cards = { load, refresh, build, jumpToLine, bind };
})();

