// Cards Builder (Job + SSE) logic. Exported via window.CardsBuilder
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);
  const state = (window.CoreUtils && window.CoreUtils.state) ? window.CoreUtils.state : {};
  let cardsJob = { id: null, timer: null, sse: null };

  function openCardsModal(){
    const m = document.getElementById('cards-builder-modal'); if (!m) return;
    m.style.display = 'block';
    const err = document.getElementById('cards-builder-error'); if (err) err.style.display = 'none';
    const logs = document.getElementById('cards-logs-view'); if (logs) logs.style.display = 'none';
    ['scan','chunk','sparse','dense','summarize','write','finalize'].forEach(s => { const el = document.getElementById('cards-stage-'+s); if (el) { el.style.color='#aaa'; el.style.borderColor='#2a2a2a'; el.style.background='transparent'; }});
    const mainBar = document.getElementById('cards-main-bar'); if (mainBar) mainBar.style.width = '0%';
    const stats = document.getElementById('cards-progress-stats'); if (stats) stats.textContent = '0 / 0 (0%)';
    const minBtn = document.getElementById('cards-builder-min'); if (minBtn && !minBtn.dataset.bound) { minBtn.dataset.bound='1'; minBtn.addEventListener('click', () => { m.style.display='none'; if (window.showStatus) window.showStatus('Cards Builder minimized', 'info'); }); }
    const closeBtn = document.getElementById('cards-builder-close'); if (closeBtn && !closeBtn.dataset.bound) { closeBtn.dataset.bound='1'; closeBtn.addEventListener('click', () => { m.style.display='none'; stopCardsStreams(); }); }
    const viewLogs = document.getElementById('cards-view-logs'); if (viewLogs && !viewLogs.dataset.bound) { viewLogs.dataset.bound='1'; viewLogs.addEventListener('click', async () => { try { const r = await fetch(api('/api/cards/build/logs')); const d = await r.json(); const pre = document.getElementById('cards-logs-view'); if (pre) { pre.textContent = d.content || ''; pre.style.display = 'block'; } } catch(e) { alert('Unable to load logs'); } }); }
    const cancelBtn = document.getElementById('cards-cancel'); if (cancelBtn && !cancelBtn.dataset.bound) { cancelBtn.dataset.bound='1'; cancelBtn.addEventListener('click', async () => { if (!cardsJob.id) return; try { await fetch(api('/api/cards/build/cancel/'+cardsJob.id), { method: 'POST' }); if (window.showStatus) window.showStatus('Cards build cancelled', 'warn'); } catch (e) { if (window.showStatus) window.showStatus('Cancel failed: '+e.message, 'error'); } }); }
  }

  function highlightStage(stage){
    const all = ['scan','chunk','sparse','dense','summarize','write','finalize'];
    all.forEach(s => { const el = document.getElementById('cards-stage-'+s); if (el) { el.style.color = (s===stage? '#fff':'#aaa'); el.style.borderColor = (s===stage?'#00ff88':'#2a2a2a'); el.style.background = (s===stage?'#0f1a14':'transparent'); }});
  }

  function updateCardsModal(data){
    try {
      const { pct, total, done, tip, model, stage, throughput, eta_s } = data || {};
      const bar = document.getElementById('cards-main-bar'); if (bar) bar.style.width = `${pct||0}%`;
      const stats = document.getElementById('cards-progress-stats'); if (stats) stats.textContent = `${done||0} / ${total||0} (${(pct||0).toFixed(1)}%) • ${throughput||''} • ETA ${eta_s||0}s`;
      const tipEl = document.getElementById('cards-quick-tip'); if (tipEl && tip) tipEl.textContent = tip;
      highlightStage(stage);
      const e1 = document.getElementById('cards-model-embed'); if (e1 && model && model.embed) e1.textContent = `embed: ${model.embed}`;
      const e2 = document.getElementById('cards-model-enrich'); if (e2 && model && model.enrich) e2.textContent = `enrich: ${model.enrich}`;
      const e3 = document.getElementById('cards-model-rerank'); if (e3 && model && model.rerank) e3.textContent = `rerank: ${model.rerank}`;
    } catch {}
  }

  function stopCardsStreams(){
    if (cardsJob.timer) { clearInterval(cardsJob.timer); cardsJob.timer = null; }
    if (cardsJob.sse) { try { cardsJob.sse.close(); } catch{} cardsJob.sse = null; }
  }

  async function startCardsBuild(repoOverride=null){
    try{
      openCardsModal();
      const enrich = document.getElementById('cards-enrich-toggle')?.checked ? 1 : 0;
      const repo = repoOverride || (state?.config?.env?.REPO) || 'agro';
      const r = await fetch(api(`/api/cards/build/start?repo=${encodeURIComponent(repo)}&enrich=${enrich}`), { method: 'POST' });
      if (r.status === 409) {
        const d = await r.json();
        const err = document.getElementById('cards-builder-error'); if (err) { err.style.display='block'; err.textContent = d.detail || 'Job already running'; }
        return;
      }
      const d = await r.json();
      cardsJob.id = d.job_id;
      if (window.showStatus) window.showStatus('Cards build started…', 'loading');
      try {
        const es = new EventSource(api(`/api/cards/build/stream/${cardsJob.id}`));
        cardsJob.sse = es;
        es.addEventListener('progress', (ev) => { try { const data = JSON.parse(ev.data||'{}'); updateCardsModal(data); } catch{} });
        es.addEventListener('done', async (ev) => { stopCardsStreams(); updateCardsModal(JSON.parse(ev.data||'{}')); if (window.showStatus) window.showStatus('Cards rebuilt', 'success'); if (window.Cards?.load) await window.Cards.load(); });
        es.addEventListener('error', (_ev) => { /* will use polling fallback */ });
        es.addEventListener('cancelled', (_ev) => { stopCardsStreams(); const e = document.getElementById('cards-builder-error'); if (e){ e.style.display='block'; e.textContent='Cancelled'; } });
      } catch (_e) {
        // SSE not available; use polling
        cardsJob.timer = setInterval(async () => {
          try { const s = await (await fetch(api(`/api/cards/build/status/${cardsJob.id}`))).json(); updateCardsModal(s); if ((s.status||'')==='done'){ stopCardsStreams(); if (window.Cards?.load) await window.Cards.load(); if (window.showStatus) window.showStatus('Cards rebuilt', 'success'); } if ((s.status||'')==='error'){ stopCardsStreams(); const er=document.getElementById('cards-builder-error'); if(er){er.style.display='block'; er.textContent=s.error||'Error';} if (window.showStatus) window.showStatus('Cards build failed', 'error'); } } catch {}
        }, 1500);
      }
    }catch(e){ if (window.showStatus) window.showStatus('Failed to start cards build: '+e.message, 'error'); }
  }

  window.CardsBuilder = { openCardsModal, startCardsBuild, stopCardsStreams, updateCardsModal };
})();

