// Model add flows and helpers. Exported via window.ModelFlows
;(function(){
  'use strict';
  const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p=>p);

  async function updateEnv(envUpdates){
    try{
      await fetch(api('/api/config'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ env: envUpdates, repos: [] }) });
    }catch(e){ alert('Failed to update config: ' + e.message); }
  }

  async function upsertPrice(entry){
    try{
      await fetch(api('/api/prices/upsert'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(entry) });
    }catch(e){ console.warn('Price upsert failed:', e); }
  }

  function promptStr(msg, defVal=''){
    const v = window.prompt(msg, defVal);
    return v === null ? null : v.trim();
  }

  async function addGenModelFlow(){
    const provider = promptStr('Provider (openai, anthropic, google, local)', 'openai');
    if (!provider) return;
    const model = promptStr('Model ID (e.g., gpt-4o-mini or qwen3-coder:14b)', 'gpt-4o-mini');
    if (!model) return;
    const baseUrl = promptStr('Base URL (optional; for proxies or local, e.g., http://127.0.0.1:11434)', '');
    let apiKey = '';
    if (provider !== 'local') apiKey = promptStr('API Key (optional; shown locally only)', '') || '';

    const env = { GEN_MODEL: model };
    if (provider === 'openai'){ if (apiKey) env.OPENAI_API_KEY = apiKey; if (baseUrl) env.OPENAI_BASE_URL = baseUrl; }
    else if (provider === 'anthropic'){ if (apiKey) env.ANTHROPIC_API_KEY = apiKey; }
    else if (provider === 'google'){ if (apiKey) env.GOOGLE_API_KEY = apiKey; }
    else if (provider === 'local'){ if (baseUrl) env.OLLAMA_URL = baseUrl; }
    await updateEnv(env);
    if (window.Config?.loadConfig) await window.Config.loadConfig();

    const entry = { provider, model, family:'gen', base_url: baseUrl || undefined };
    entry.unit = provider === 'local' ? 'request' : '1k_tokens';
    await upsertPrice(entry);
    if (window.Prices?.loadPrices) await window.Prices.loadPrices();
    alert('Generation model added.');
  }

  async function addEmbedModelFlow(){
    const provider = promptStr('Embedding provider (openai, voyage, local, mxbai)', 'openai');
    if (!provider) return;
    const model = promptStr('Embedding model ID (optional; depends on provider)', provider === 'openai' ? 'text-embedding-3-small' : '');
    const baseUrl = promptStr('Base URL (optional)', '');
    let apiKey = '';
    if (provider !== 'local' && provider !== 'mxbai') apiKey = promptStr('API Key (optional)', '') || '';

    const env = {};
    if (provider === 'openai'){ env.EMBEDDING_TYPE = 'openai'; if (apiKey) env.OPENAI_API_KEY = apiKey; if (baseUrl) env.OPENAI_BASE_URL = baseUrl; }
    else if (provider === 'voyage'){ env.EMBEDDING_TYPE = 'voyage'; if (apiKey) env.VOYAGE_API_KEY = apiKey; }
    else if (provider === 'mxbai'){ env.EMBEDDING_TYPE = 'mxbai'; }
    else if (provider === 'local'){ env.EMBEDDING_TYPE = 'local'; }
    await updateEnv(env);
    if (window.Config?.loadConfig) await window.Config.loadConfig();

    const entry = { provider, model: model || provider + '-embed', family:'embed', base_url: baseUrl || undefined };
    entry.unit = '1k_tokens';
    await upsertPrice(entry);
    if (window.Prices?.loadPrices) await window.Prices.loadPrices();
    alert('Embedding model added.');
  }

  async function addRerankModelFlow(){
    const provider = promptStr('Rerank provider (cohere, local, hf)', 'cohere');
    if (!provider) return;
    let model = promptStr('Rerank model ID (e.g., rerank-3.5 or BAAI/bge-reranker-v2-m3)', provider === 'cohere' ? 'rerank-3.5' : 'BAAI/bge-reranker-v2-m3');
    const baseUrl = promptStr('Base URL (optional)', '');
    let apiKey = '';
    if (provider === 'cohere') apiKey = promptStr('Cohere API Key (optional)', '') || '';

    const env = {};
    if (provider === 'cohere'){ env.RERANK_BACKEND = 'cohere'; env.COHERE_RERANK_MODEL = model; if (apiKey) env.COHERE_API_KEY = apiKey; }
    else if (provider === 'local'){ env.RERANK_BACKEND = 'local'; env.RERANKER_MODEL = model; }
    else if (provider === 'hf'){ env.RERANK_BACKEND = 'hf'; env.RERANKER_MODEL = model; }
    await updateEnv(env);
    if (window.Config?.loadConfig) await window.Config.loadConfig();

    const entry = { provider, model, family:'rerank', base_url: baseUrl || undefined };
    entry.unit = provider === 'cohere' ? '1k_tokens' : 'request';
    await upsertPrice(entry);
    if (window.Prices?.loadPrices) await window.Prices.loadPrices();
    alert('Rerank model added.');
  }

  async function addCostModelFlow(){
    const provider = promptStr('Provider', 'openai');
    if (!provider) return;
    const model = promptStr('Model ID', 'gpt-4o-mini');
    if (!model) return;
    const baseUrl = promptStr('Base URL (optional)', '');
    const unit = promptStr('Unit (1k_tokens or request)', provider === 'local' ? 'request' : '1k_tokens') || '1k_tokens';
    await upsertPrice({ provider, model, family:'misc', base_url: baseUrl || undefined, unit });
    if (window.Prices?.loadPrices) await window.Prices.loadPrices();
    alert('Model added to pricing catalog.');
  }

  window.ModelFlows = { updateEnv, upsertPrice, promptStr, addGenModelFlow, addEmbedModelFlow, addRerankModelFlow, addCostModelFlow };
})();

