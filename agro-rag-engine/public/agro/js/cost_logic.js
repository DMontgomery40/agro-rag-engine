// Cost calculator logic. Exported via window.CostLogic
;(function(){
  function readInt(id, d){ const el=document.getElementById(id); const v=el?el.value:''; const n=parseInt(v||'',10); return Number.isFinite(n)?n:(d||0); }
  function readStr(id, d){ const el=document.getElementById(id); const v=el?el.value:''; return (v||d||'').toString(); }

  function buildBase(){
    return {
      tokens_in: readInt('cost-in', 500),
      tokens_out: readInt('cost-out', 800),
      embeds: readInt('cost-embeds', 0),
      reranks: readInt('cost-rerank', 0),
      requests_per_day: readInt('cost-rpd', 100),
    };
  }

  function buildPayloadFromUI(){
    const base = buildBase();
    const gen_provider = readStr('cost-provider','openai').trim();
    const gen_model = readStr('cost-model','gpt-4o-mini').trim();
    const embed_provider = readStr('cost-embed-provider','openai').trim();
    const embed_model = readStr('cost-embed-model','text-embedding-3-small').trim();
    const rerank_provider = readStr('cost-rerank-provider','cohere').trim();
    const rerank_model = readStr('cost-rerank-model','rerank-3.5').trim();
    return { gen_provider, gen_model, embed_provider, embed_model, rerank_provider, rerank_model, ...base };
  }

  async function estimateFromUI(apiBase){
    try{
      const payload = buildPayloadFromUI();
      const base = (apiBase||'').replace(/\/$/,'');
      let r = await fetch(base + '/api/cost/estimate_pipeline', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!r.ok) r = await fetch(base + '/api/cost/estimate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text() || 'Cost estimate failed');
      return await r.json();
    }catch(e){ throw e; }
  }

  window.CostLogic = { buildBase, buildPayloadFromUI, estimateFromUI };
})();
