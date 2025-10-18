;(function(){
  function apiBase(){
    try{
      const u = new URL(window.location.href);
      const q = new URLSearchParams(u.search);
      const override = q.get('api');
      if (override) return override.replace(/\/$/, '');
      if (u.protocol.startsWith('http')) return u.origin;
      return 'http://127.0.0.1:8012';
    }catch{ return 'http://127.0.0.1:8012'; }
  }
  function api(path){ return apiBase() + path; }
  async function getConfig(){
    try{ const r = await fetch(api('/api/config')); return await r.json(); }catch{ return { env:{}, repos:[] }; }
  }
  function csvToList(s){ return (String(s||'').split(',').map(x=>x.trim()).filter(Boolean)); }
  function readAdvanced(){
    const mode = document.getElementById('apv2-mode')?.value || 'balanced';
    const budgetOverride = parseFloat(document.getElementById('apv2-budget')?.value || '');
    const prov = Array.from(document.querySelectorAll('.apv2-prov'))
      .filter(cb => cb.checked).map(cb => cb.value);
    const regions = csvToList(document.getElementById('apv2-regions')?.value||'');
    const compliance = csvToList(document.getElementById('apv2-compliance')?.value||'');
    const heur = !!document.getElementById('apv2-heuristics')?.checked;
    const wl = {
      requests_per_day: parseInt(document.getElementById('apv2-rpd')?.value||'')||undefined,
      tokens_in_per_req: parseInt(document.getElementById('apv2-tin')?.value||'')||undefined,
      tokens_out_per_req: parseInt(document.getElementById('apv2-tout')?.value||'')||undefined,
      mq_rewrites: parseInt(document.getElementById('apv2-mq')?.value||'')||undefined,
      embed_tokens_per_req: parseInt(document.getElementById('apv2-embt')?.value||'')||undefined,
      rerank_tokens_per_req: parseInt(document.getElementById('apv2-rrt')?.value||'')||undefined,
    };
    const slo = {
      latency_target_ms: parseInt(document.getElementById('apv2-latency')?.value||'')||undefined,
      min_qps: parseFloat(document.getElementById('apv2-minqps')?.value||'')||undefined,
    };
    return { mode, budgetOverride, prov, regions, compliance, heur, workload: wl, slo };
  }
  function setPlaceholderLoading(){
    const placeholder = document.getElementById('profile-placeholder');
    const results = document.getElementById('profile-results-content');
    if (placeholder) {
      placeholder.style.display='flex';
      placeholder.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style=\"width:48px;height:48px;border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;\"></div>
          <p id=\"apv2-phase\" style=\"font-size:14px;color:var(--fg-muted);\">Selecting profile with v2 engine...</p>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
    }
    if (results) results.style.display='none';
  }
  function setPhase(msg){ try{ const el=document.getElementById('apv2-phase'); if (el) el.textContent=msg; }catch{}
  }
  function fetchWithTimeout(resource, opts){
    const { timeout=12000, ...rest } = (opts||{});
    return new Promise((resolve, reject)=>{
      const id = setTimeout(()=> reject(new Error('request timeout')), timeout);
      fetch(resource, rest).then((res)=>{ clearTimeout(id); resolve(res); }, (err)=>{ clearTimeout(id); reject(err); });
    });
  }
  function renderResult(env, reason, scan, budget){
    const results = document.getElementById('profile-results-content');
    const placeholder = document.getElementById('profile-placeholder');
    if (window.ProfileRenderer && results) {
      try{
        const html = window.ProfileRenderer.renderProfileResults(env, scan, budget);
        results.innerHTML = html;
        if (window.ProfileRenderer.bindTooltips) window.ProfileRenderer.bindTooltips(results);
        // Append diagnostics accordion
        try{
          const details = document.createElement('details');
          details.style.marginTop = '12px';
          const sum = document.createElement('summary');
          sum.textContent = 'Diagnostics';
          sum.style.cursor = 'pointer';
          sum.style.color = 'var(--fg-muted)';
          const pre = document.createElement('pre');
          pre.style.color = 'var(--fg-muted)'; pre.style.whiteSpace = 'pre-wrap'; pre.style.fontSize = '12px'; pre.style.padding = '10px'; pre.style.border = '1px solid var(--line)'; pre.style.borderRadius = '6px'; pre.style.background = 'var(--card-bg)';
          pre.textContent = JSON.stringify({ objective: reason?.objective, budget: reason?.budget, weights: reason?.weights, candidates_total: reason?.candidates_total, policy_relaxed: reason?.policy_relaxed, diag: reason?.diag }, null, 2);
          details.appendChild(sum); details.appendChild(pre);
          results.appendChild(details);
        }catch{}
        if (placeholder) placeholder.style.display='none';
        results.style.display='block';
      }catch(err){
        results.innerHTML = '<pre style="color:var(--err);padding:20px;">'+(err?.message||String(err))+'</pre>';
        results.style.display='block';
        if (placeholder) placeholder.style.display='none';
      }
    }
  }
  async function ensureScan(){
    try {
      const out = document.getElementById('scan-out');
      if (out && out.dataset.scanData){ return JSON.parse(out.dataset.scanData); }
    }catch{}
    try{ const r = await fetch(api('/api/scan-hw'), { method:'POST' }); return await r.json(); }catch{ return null; }
  }

  async function run(){
    setPlaceholderLoading();
    setPhase('Loading configuration...');
    const cfg = await getConfig();
    const env = (cfg && cfg.env) || {};
    setPhase('Scanning hardware...');
    const scan = await ensureScan();
    const budget = parseFloat(document.getElementById('budget')?.value||'0');
    const adv = readAdvanced();

    // Fallbacks from cost panel when Advanced fields are blank
    function numOrUndef(v){ const n = Number(v); return Number.isFinite(n) ? n : undefined; }
    const costIn   = numOrUndef(document.getElementById('cost-in')?.value);
    const costOut  = numOrUndef(document.getElementById('cost-out')?.value);
    const costEmb  = numOrUndef(document.getElementById('cost-embeds')?.value);
    const costRR   = numOrUndef(document.getElementById('cost-rerank')?.value);
    const costRPD  = numOrUndef(document.getElementById('cost-rpd')?.value);
    if (adv.workload.requests_per_day === undefined && costRPD !== undefined) adv.workload.requests_per_day = costRPD;
    if (adv.workload.tokens_in_per_req === undefined && costIn !== undefined) adv.workload.tokens_in_per_req = costIn;
    if (adv.workload.tokens_out_per_req === undefined && costOut !== undefined) adv.workload.tokens_out_per_req = costOut;
    if (adv.workload.embed_tokens_per_req === undefined && costEmb !== undefined) adv.workload.embed_tokens_per_req = costEmb;
    if (adv.workload.rerank_tokens_per_req === undefined && costRR !== undefined) adv.workload.rerank_tokens_per_req = costRR;
    // MQ default from current env if not provided
    if (adv.workload.mq_rewrites === undefined) {
      const mq = parseInt(env.MQ_REWRITES || '');
      adv.workload.mq_rewrites = Number.isFinite(mq) && mq>0 ? mq : undefined; // leave undefined so server can recommend
    }
    const payload = {
      hardware: { runtimes: (scan && scan.runtimes) || {}, meta: (scan && scan.info) || {} },
      policy: { providers_allowed: adv.prov.length? adv.prov : undefined, regions_allowed: adv.regions.length? adv.regions: undefined, compliance: adv.compliance.length? adv.compliance: undefined },
      workload: Object.fromEntries(Object.entries(adv.workload).filter(([_,v])=> v!==undefined)),
      objective: {
        mode: adv.mode,
        monthly_budget_usd: isNaN(adv.budgetOverride)? budget : adv.budgetOverride,
        latency_target_ms: adv.slo.latency_target_ms,
        min_qps: adv.slo.min_qps,
      },
      tuning: { use_heuristic_quality: !!adv.heur },
      defaults: { gen_model: env.GEN_MODEL || '' }
    };
    try{
      setPhase('Calling selector...');
      const r = await fetchWithTimeout(api('/api/profile/autoselect'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), timeout: 15000 });
      if (!r.ok){ const txt = await r.text(); throw new Error(txt || 'autoselect failed'); }
      setPhase('Rendering result...');
      const data = await r.json();
      renderResult(data.env, data.reason, scan, payload.objective.monthly_budget_usd || budget);

      // Optional: show an estimated cost banner using current cost panel inputs and selected providers
      try{
        const genProvider = (data.env.GEN_MODEL && data.env.GEN_MODEL.includes(':')) ? 'local' : 'openai';
        const genModel = data.env.GEN_MODEL || 'gpt-4o-mini';
        const cp = {
          gen_provider: genProvider,
          gen_model: genModel,
          tokens_in: (costIn || 0),
          tokens_out: (costOut || 0),
          embeds: (costEmb || 0),
          reranks: (costRR || 0),
          requests_per_day: (costRPD || 0),
          embed_provider: data.env.EMBEDDING_TYPE || undefined,
          rerank_provider: data.env.RERANK_BACKEND || undefined,
          rerank_model: data.env.COHERE_RERANK_MODEL || undefined,
        };
        const er = await fetchWithTimeout(api('/api/cost/estimate'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cp), timeout: 10000 });
        if (er.ok){
          const est = await er.json();
          const results = document.getElementById('profile-results-content');
          if (results){
            const div = document.createElement('div');
            div.style.cssText = 'margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:6px;background:var(--card-bg);color:var(--fg-muted);font-size:12px;';
            div.innerHTML = `<strong style="color:var(--accent);">Estimated Cost</strong> — Daily: $${Number(est.daily||0).toFixed(4)} • Monthly: $${Number(est.monthly||0).toFixed(2)}`;
            results.prepend(div);
          }
        }
      }catch{}
    }catch(err){
      const results = document.getElementById('profile-results-content');
      const placeholder = document.getElementById('profile-placeholder');
      const payloadStr = JSON.stringify(payload, null, 2);
      if (results){ results.innerHTML = '<div style="padding:20px;">'+
        '<div style="color:var(--err); font-weight:600; margin-bottom:8px;">Auto‑Profile v2 error</div>'+
        '<pre style="color:var(--fg-muted); white-space:pre-wrap;">'+(err?.message||String(err))+'</pre>'+
        '<details style="margin-top:12px;"><summary style="cursor:pointer; color:var(--fg-muted);">Payload</summary><pre style="color:var(--fg-muted); white-space:pre-wrap;">'+payloadStr+'</pre></details>'+
        '</div>'; results.style.display='block'; }
      if (placeholder) placeholder.style.display='none';
    }
  }

  window.AutoProfileV2 = { run };
})();
