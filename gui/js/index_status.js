// Indexing status and controls. Exported via window.IndexStatus
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);
  let indexPoll = null;

  function formatBytes(bytes){
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes)/Math.log(k));
    return Math.round((bytes / Math.pow(k,i))*100)/100 + ' ' + sizes[i];
  }

  function formatIndexStatus(lines, metadata){
    if (!metadata){
      if (!lines || !lines.length) return '<div style="color:var(--fg-muted);font-size:13px;">Ready to index...</div>';
      return `<div style="color:var(--fg-muted);font-size:12px;">${(lines||[]).join('<br>')}</div>`;
    }
    const html = [];
    html.push(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);"></div>
          <div>
            <div style="font-size:16px;font-weight:600;color: var(--fg);letter-spacing:-0.3px;">${metadata.current_repo}</div>
            <div style="font-size:11px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Branch: <span style="color:var(--link);">${metadata.current_branch}</span></div>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:var(--fg-muted);">${new Date(metadata.timestamp).toLocaleString()}</div>
      </div>
    `);
    html.push(`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--line);">
          <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Embedding Model</div>
          <div style="font-size:14px;font-weight:600;color:var(--link);font-family:'SF Mono',monospace;">${metadata.embedding_model}</div>
        </div>
        <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--line);">
          <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Keywords</div>
          <div style="font-size:14px;font-weight:600;color:var(--warn);font-family:'SF Mono',monospace;">${metadata.keywords_count.toLocaleString()}</div>
        </div>
      </div>
    `);
    if (metadata.repos && metadata.repos.length>0){
      html.push(`<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Index Profiles</div>`);
      metadata.repos.forEach(repo => {
        const totalSize = (repo.sizes.chunks||0) + (repo.sizes.bm25||0) + (repo.sizes.cards||0);
        html.push(`
          <div style="background:var(--code-bg);border:1px solid ${repo.has_cards?'var(--ok)':'var(--line)'};border-radius:6px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
              <div>
                <div style="font-size:13px;font-weight:600;color: var(--fg);margin-bottom:4px;">${repo.name} <span style="font-size:10px;color:var(--fg-muted);font-weight:400;">/ ${repo.profile}</span></div>
                <div style="font-size:11px;color:var(--fg-muted);">${repo.chunk_count.toLocaleString()} chunks ${repo.has_cards ? ' • <span style="color:var(--accent);">✓ Cards</span>' : ' • <span style="color:var(--fg-muted);">No cards</span>'}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px;font-weight:600;color:var(--accent);font-family:'SF Mono',monospace;">${formatBytes(totalSize)}</div>
              </div>
            </div>
          </div>
        `);
      });
      html.push(`</div>`);
    }
    html.push(`
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line);">
        <div style="font-size:12px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Index Storage</div>
        <div style="font-size:18px;font-weight:700;color:var(--accent);font-family:'SF Mono',monospace;">${formatBytes(metadata.total_storage)}</div>
      </div>
    `);
    return html.join('');
  }

  async function pollIndexStatus(){
    try{
      const r = await fetch(api('/api/index/status'));
      const d = await r.json();
      const box1 = document.getElementById('index-status');
      const bar1 = document.getElementById('index-bar');
      const box2 = document.getElementById('dash-index-status');
      const bar2 = document.getElementById('dash-index-bar');
      const lastIndexedDisplay = document.getElementById('last-indexed-display');
      const formatted = (typeof window.formatIndexStatusDisplay === 'function') ? window.formatIndexStatusDisplay(d.lines, d.metadata) : formatIndexStatus(d.lines, d.metadata);
      const pct = d.running ? 50 : (d.metadata ? 100 : 0);

      // Preserve <details> open state before updating HTML
      const preserveDetailsState = (container) => {
        if (!container) return {};
        const detailsEls = container.querySelectorAll('details');
        const state = {};
        detailsEls.forEach((el, idx) => { state[idx] = el.open; });
        return state;
      };

      const restoreDetailsState = (container, state) => {
        if (!container) return;
        const detailsEls = container.querySelectorAll('details');
        detailsEls.forEach((el, idx) => { if (idx in state) el.open = state[idx]; });
      };

      if (box1) {
        const state1 = preserveDetailsState(box1);
        box1.innerHTML = formatted;
        restoreDetailsState(box1, state1);
      }
      if (bar1) bar1.style.width = pct + '%';
      if (box2) {
        const state2 = preserveDetailsState(box2);
        box2.innerHTML = formatted;
        restoreDetailsState(box2, state2);
      }
      if (bar2) bar2.style.width = pct + '%';
      if (lastIndexedDisplay && d.metadata && d.metadata.timestamp){ lastIndexedDisplay.textContent = new Date(d.metadata.timestamp).toLocaleString(); }
      if (!d.running && indexPoll){ clearInterval(indexPoll); indexPoll = null; if (bar2){ setTimeout(()=>{bar2.style.width='0%';}, 2000); } }
    }catch(_e){}
  }

  async function startIndexing(){
    try{
      if (window.showStatus) window.showStatus('Starting indexer...', 'loading');
      await fetch(api('/api/index/start'), { method:'POST' });
      if (indexPoll) clearInterval(indexPoll);
      indexPoll = setInterval(pollIndexStatus, 800);
      await pollIndexStatus();
    }catch(e){ if (window.showStatus) window.showStatus('Failed to start indexer: ' + e.message, 'error'); throw e; }
  }

  window.IndexStatus = { formatIndexStatus, pollIndexStatus, startIndexing };
})();
