// AGRO GUI app.js (main coordinator - modularized)
(function () {
    'use strict';

    // Import core utilities from CoreUtils module
    const { api, $, $$, state } = window.CoreUtils || {};

    if (!api || !$ || !$$) {
        console.error('[app.js] CoreUtils not loaded! Make sure core-utils.js loads first.');
        return;
    }

    console.log('[app.js] Initializing with API:', window.CoreUtils.API_BASE);

    // ---------------- Theme Engine ----------------
    // Delegated to Theme module (gui/js/theme.js)
    const resolveTheme = window.Theme?.resolveTheme || (() => 'dark');
    const applyTheme = window.Theme?.applyTheme || (() => {});
    const initThemeFromEnv = window.Theme?.initThemeFromEnv || (() => {});

    // ---------------- Tabs ----------------
    // Delegated to Tabs module (gui/js/tabs.js)
    const switchTab = window.Tabs?.switchTab || (() => {});
    const bindTabs = window.Tabs?.bindTabs || (() => {});
    const bindSubtabs = window.Tabs?.bindSubtabs || (() => {});

    // ---------------- Tooltips (modular) ----------------
    // Delegates to external module /gui/js/tooltips.js

    // ---------------- Global Search ----------------
    // Delegated to Search module (gui/js/search.js)
    const clearHighlights = window.Search?.clearHighlights || (() => {});
    const highlightMatches = window.Search?.highlightMatches || (() => {});
    const bindGlobalSearch = window.Search?.bindGlobalSearch || (() => {});

    // ---------------- Git Hooks ----------------
    // Delegated to GitHooks module (gui/js/git-hooks.js)
    const refreshHooksStatus = window.GitHooks?.refreshHooksStatus || (async () => {});
    const installHooks = window.GitHooks?.installHooks || (async () => {});

    // ---------------- Health ----------------
    // Delegated to Health module (gui/js/health.js)
    const checkHealth = window.Health?.checkHealth || (async () => {});

    // ---------------- Routing Trace Panel ----------------
    // Delegated to Trace module (gui/js/trace.js)
    const loadLatestTrace = window.Trace?.loadLatestTrace || (async ()=>{});

    // ---------------- Chat ----------------
    function appendChatMessage(role, text){
        const box = document.getElementById('chat-messages'); if (!box) return;
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '12px';
        const who = document.createElement('div');
        who.style.fontSize = '11px';
        who.style.color = role === 'user' ? '#5b9dff' : '#00ff88';
        who.style.textTransform = 'uppercase';
        who.style.letterSpacing = '0.5px';
        who.textContent = role === 'user' ? 'You' : 'Assistant';
        const msg = document.createElement('div');
        msg.style.background = '#0f0f0f';
        msg.style.border = '1px solid #2a2a2a';
        msg.style.borderRadius = '6px';
        msg.style.padding = '10px';
        msg.style.whiteSpace = 'pre-wrap';
        msg.textContent = text;
        wrap.appendChild(who); wrap.appendChild(msg);
        box.appendChild(wrap);
        // auto-scroll if near bottom
        try { box.scrollTop = box.scrollHeight; } catch { /* no-op */ }
    }

    async function sendChat(){
        const ta = document.getElementById('chat-input'); if (!ta) return;
        const q = (ta.value || '').trim(); if (!q) return;
        appendChatMessage('user', q);
        ta.value = '';
        const repoSel = document.getElementById('chat-repo-select');
        const repo = repoSel && repoSel.value ? repoSel.value : undefined;
        try{
            const qs = new URLSearchParams({ q });
            if (repo) qs.set('repo', repo);
            const r = await fetch(api(`/answer?${qs.toString()}`));
            const d = await r.json();
            const text = (d && d.answer) ? d.answer : '—';
            appendChatMessage('assistant', text);
            // load trace if the dropdown is open
            const det = document.getElementById('chat-trace');
            if (det && det.open){ await loadLatestTrace('chat-trace-output'); }
            // optional auto-open in LangSmith (use latest shared run URL)
            try{
                const env = (state.config?.env)||{};
                if ((env.TRACING_MODE||'').toLowerCase()==='langsmith' && ['1','true','on'].includes(String(env.TRACE_AUTO_LS||'0').toLowerCase())){
                    const prj = (env.LANGCHAIN_PROJECT||'agro');
                    const lsQs = new URLSearchParams({ project: prj, share: 'true' });
                    const lsRes = await fetch(api(`/api/langsmith/latest?${lsQs.toString()}`));
                    const lsData = await lsRes.json();
                    if (lsData && lsData.url) window.open(lsData.url, '_blank');
                }
            }catch{/* no-op */}
        }catch(e){ appendChatMessage('assistant', `Error: ${e.message}`); }
    }

    // ---------------- Config ----------------
    // Delegated to Config module (gui/js/config.js)
    const loadConfig = window.Config?.loadConfig || (async () => {});
    const populateConfigForm = window.Config?.populateConfigForm || (() => {});
    const gatherConfigForm = window.Config?.gatherConfigForm || (() => ({}));
    const saveConfig = window.Config?.saveConfig || (async () => {});


    // ---------------- Prices & Cost ----------------
    async function loadPrices() {
        try {
            const r = await fetch(api('/api/prices'));
            state.prices = await r.json();
            populatePriceDatalists();
        } catch (e) {
            console.error('Failed to load prices:', e);
        }
    }

    function unique(xs) { return Array.from(new Set(xs)); }

    function populatePriceDatalists() {
        if (!state.prices || !Array.isArray(state.prices.models)) return;

        const models = state.prices.models;
        const providers = unique(models.map(m => (m.provider || '').trim()).filter(Boolean));
        const allModels = unique(models.map(m => (m.model || '').trim()).filter(Boolean));

        const providerSelect = document.getElementById('cost-provider');
        const modelList = document.getElementById('model-list');
        const genList = document.getElementById('gen-model-list');
        const rrList = document.getElementById('rerank-model-list');
        const embList = document.getElementById('embed-model-list');

        function setOpts(el, vals) {
            if (!el) return;
            el.innerHTML = '';
            vals.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                if (el.tagName === 'SELECT') opt.textContent = v;
                el.appendChild(opt);
            });
        }

        if (providerSelect && providerSelect.tagName === 'SELECT') {
            // refill provider select only if empty, preserve user choice
            if (providerSelect.options.length <= 1) setOpts(providerSelect, providers);
        }

        // Partition models into categories for filtering
        // Inference models: unit == '1k_tokens' and no embed/rerank fields (cost may be 0 for local)
        const isGen = (m)=> {
            const u = String(m.unit || '').toLowerCase();
            const hasEmbed = Object.prototype.hasOwnProperty.call(m, 'embed_per_1k');
            const hasRerank = Object.prototype.hasOwnProperty.call(m, 'rerank_per_1k');
            return u === '1k_tokens' && !hasEmbed && !hasRerank;
        };
        const isEmbed = (m)=> Object.prototype.hasOwnProperty.call(m, 'embed_per_1k');
        const isRerank = (m)=> Object.prototype.hasOwnProperty.call(m, 'rerank_per_1k') || /rerank/i.test(String(m.family||'')+String(m.model||''));
        const genModels = unique(models.filter(isGen).map(m => m.model));
        const rrModels = unique(models.filter(isRerank).map(m => m.model));
        const embModels = unique(models.filter(isEmbed).map(m => m.model));

        // Populate datalists with null checks
        if (modelList) setOpts(modelList, allModels);
        if (genList) setOpts(genList, genModels);
        if (rrList) setOpts(rrList, rrModels);
        if (embList) setOpts(embList, embModels);

        // Default provider only; leave model empty so datalist shows all options on first focus
        if (!$('#cost-provider').value && providers.length) $('#cost-provider').value = providers[0];
        if (!$('#cost-model').value) $('#cost-model').value = '';

        // Filter model options when provider changes AND update the input value
        const onProv = () => {
            const modelInput = $('#cost-model');
            if (!modelInput || !modelList) return;

            const p = $('#cost-provider').value.trim().toLowerCase();
            const provModels = unique(models.filter(m => (m.provider||'').toLowerCase()===p && isGen(m)).map(m => m.model));
            if (!provModels.length) {
                // Fall back to all inference models so the dropdown is still usable
                const allGen = unique(models.filter(isGen).map(m => m.model));
                if (modelList) setOpts(modelList, allGen);
                modelInput.value = '';
                try { showStatus(`No inference models for provider "${p}" — showing all models.`, 'warn'); } catch { /* no-op */ }
                return;
            }
            if (modelList) setOpts(modelList, provModels);
            // If current value isn't a model for this provider, clear so the datalist shows all options
            if (!provModels.includes(modelInput.value)) {
                modelInput.value = '';
            }
        };

        if (providerSelect) providerSelect.addEventListener('change', onProv);
        onProv(); // Initialize

        // ---- Provider-specific filtering for Embeddings and Reranker ----
        function normProvList(sel, kind){
            const p = String(sel||'').toLowerCase();
            if (p === 'mxbai') return ['huggingface'];
            if (p === 'hugging face') return ['huggingface'];
            if (p === 'local'){
                // For local: embeddings prefer local/ollama; rerank prefer huggingface/local
                return (kind==='embed') ? ['local','ollama'] : ['huggingface','local','ollama','mlx'];
            }
            return [p];
        }
        function updateEmbedList(){
            const sel = document.getElementById('cost-embed-provider');
            const input = document.getElementById('cost-embed-model');
            if (!sel || !embList) return;
            const prov = String(sel.value||'').toLowerCase();
            const prows = normProvList(prov, 'embed');
            let items = models.filter(m => isEmbed(m) && prows.includes(String(m.provider||'').toLowerCase())).map(m => m.model);
            // If provider is mxbai, prefer Mixedbread embeddings; if none present, include all HF embeddings
            if (prov === 'mxbai') {
                const mb = items.filter(s => /mixedbread/i.test(s));
                items = mb.length ? mb : models.filter(m => isEmbed(m) && String(m.provider||'').toLowerCase()==='huggingface').map(m => m.model);
            }
            if (!items.length) items = unique(models.filter(isEmbed).map(m => m.model));
            if (embList) setOpts(embList, unique(items));
            if (input && items.length && !items.includes(input.value)) input.value = '';
        }
        function normProviderName(p){
            p = String(p||'').toLowerCase();
            if (p === 'hf' || p === 'hugging face') return 'huggingface';
            return p;
        }
        function updateRerankList(){
            const sel = document.getElementById('cost-rerank-provider');
            const input = document.getElementById('cost-rerank-model');
            if (!sel || !rrList) return;
            const p = normProviderName(sel.value||'');
            let items;
            if (!p) {
                items = models.filter(isRerank).map(m => m.model);
            } else if (p === 'cohere') {
                items = models.filter(m => isRerank(m) && String(m.provider||'').toLowerCase()==='cohere').map(m => m.model);
            } else if (p === 'huggingface') {
                items = models.filter(m => isRerank(m) && String(m.provider||'').toLowerCase()==='huggingface').map(m => m.model);
            } else if (p === 'local') {
                // Prefer HF rerankers for local
                items = models.filter(m => isRerank(m) && (String(m.provider||'').toLowerCase()==='huggingface' || String(m.provider||'').toLowerCase()==='local' || String(m.provider||'').toLowerCase()==='ollama')).map(m => m.model);
            } else if (p === 'none') {
                items = [];
            } else {
                items = models.filter(m => isRerank(m) && String(m.provider||'').toLowerCase()===p).map(m => m.model);
            }
            if (!items.length) items = unique(models.filter(isRerank).map(m => m.model));
            if (rrList) setOpts(rrList, unique(items));
            if (input && items.length && !items.includes(input.value)) input.value = '';
        }
        const embProvSel = document.getElementById('cost-embed-provider');
        const rrProvSel = document.getElementById('cost-rerank-provider');
        if (embProvSel) embProvSel.addEventListener('change', updateEmbedList);
        if (rrProvSel) rrProvSel.addEventListener('change', updateRerankList);
        updateEmbedList();
        updateRerankList();
    }

    async function estimateCost() {
        try{
            const d = await (window.CostLogic && window.CostLogic.estimateFromUI ? window.CostLogic.estimateFromUI(window.CoreUtils.API_BASE) : Promise.reject(new Error('CostLogic missing')));
            $('#cost-daily').textContent = `$${Number(d.daily||0).toFixed(4)}`;
            $('#cost-monthly').textContent = `$${Number(d.monthly||0).toFixed(2)}`;
        }catch(e){ alert('Cost estimation failed: ' + e.message); }
    }

    // ---------------- Hardware Scan & Profiles ----------------
    function formatHardwareScan(data) {
        if (!data || typeof data !== 'object') return 'No scan data';
        const info = data.info || {};
        const rt = data.runtimes || {};
        const parts = [];

        if (info.os) parts.push(`<div class="section"><span class="key">OS:</span> <span class="value">${info.os}</span></div>`);
        if (info.cpu_cores) parts.push(`<div class="section"><span class="key">CPU Cores:</span> <span class="value">${info.cpu_cores}</span></div>`);
        if (info.mem_gb) parts.push(`<div class="section"><span class="key">Memory:</span> <span class="value">${info.mem_gb} GB</span></div>`);
        if (info.gpu) parts.push(`<div class="section"><span class="key">GPU:</span> <span class="value">${info.gpu}</span></div>`);

        const activeRuntimes = Object.keys(rt).filter(k => rt[k]);
        if (activeRuntimes.length) {
            parts.push(`<div class="section"><span class="key">Runtimes:</span> <span class="value">${activeRuntimes.join(', ')}</span></div>`);
        }

        return parts.join('');
    }

    async function scanHardware() {
        try {
            const r = await fetch(api('/api/scan-hw'), { method: 'POST' });
            const d = await r.json();
            const scanOut = $('#scan-out');
            scanOut.innerHTML = formatHardwareScan(d);
            scanOut.dataset.scanData = JSON.stringify(d);
            updateWizardSummary();
            return d;
        } catch (e) {
            alert('Hardware scan failed: ' + e.message);
            return null;
        }
    }

    function proposeProfile(scan, budget) {
        // Budget-aware defaults (avoid paid providers at $0)
        const hasLocal = scan?.runtimes?.ollama || scan?.runtimes?.coreml;
        const rprov = (Number(budget) === 0) ? (hasLocal ? 'local' : 'none') : 'cohere';
        const prof = {
            GEN_MODEL: hasLocal && Number(budget) === 0 ? 'qwen3-coder:14b' : 'gpt-4o-mini',
            EMBEDDING_TYPE: (Number(budget) === 0) ? (hasLocal ? 'local' : 'mxbai') : 'openai',
            RERANK_BACKEND: rprov,
            MQ_REWRITES: Number(budget) > 50 ? '6' : '3',
            TOPK_SPARSE: '75',
            TOPK_DENSE: '75',
            FINAL_K: Number(budget) > 50 ? '20' : '10',
            HYDRATION_MODE: 'lazy',
        };
        return prof;
    }

    function _tooltipHtmlForKey(k){
        try{
            const map = (window.Tooltips && window.Tooltips.buildTooltipMap && window.Tooltips.buildTooltipMap()) || {};
            return map[k] || `<span class="tt-title">${k}</span><div>No detailed tooltip available yet. See our docs.</div><div class="tt-links"><a href="/files/README.md" target="_blank" rel="noopener">Main README</a> <a href="/docs/README.md" target="_blank" rel="noopener">Docs Index</a></div>`;
        }catch{return `<span class="tt-title">${k}</span><div>No details found.</div>`}
    }

    function formatProfile(prof) {
        if (!prof || typeof prof !== 'object') return '(Preview will appear here)';
        const parts = [];

        const keyGroups = {
            'Generation': ['GEN_MODEL', 'ENRICH_MODEL', 'ENRICH_MODEL_OLLAMA'],
            'Embeddings': ['EMBEDDING_TYPE', 'VOYAGE_EMBED_DIM', 'EMBEDDING_DIM'],
            'Reranking': ['RERANK_BACKEND', 'COHERE_RERANK_MODEL', 'RERANKER_MODEL'],
            'Retrieval': ['MQ_REWRITES', 'FINAL_K', 'TOPK_SPARSE', 'TOPK_DENSE', 'HYDRATION_MODE'],
        };

        for (const [group, keys] of Object.entries(keyGroups)) {
            const groupItems = keys.filter(k => prof[k] !== undefined).map(k => {
                const tip = _tooltipHtmlForKey(k);
                const val = String(prof[k]);
                return `<div class="kv">
                    <span class="key">${k}:</span>
                    <span class="value">${val}</span>
                    <span class="tooltip-wrap"><span class="help-icon" tabindex="0" aria-label="Help: ${k}">?</span><div class="tooltip-bubble">${tip}</div></span>
                </div>`;
            });
            if (groupItems.length) {
                parts.push(`<div class="section"><strong style="color:#5b9dff;">${group}</strong>${groupItems.join('')}</div>`);
            }
        }

        if (prof.__estimate__) {
            const est = prof.__estimate__;
            parts.push(`<div class="section"><strong style="color:#b794f6;">Cost Estimate</strong><div><span class="key">Daily:</span> <span class="value">$${Number(est.daily||0).toFixed(4)}</span></div><div><span class="key">Monthly:</span> <span class="value">$${Number(est.monthly||0).toFixed(2)}</span></div></div>`);
        }

        return parts.join('');
    }

    function bindPreviewTooltips(){
        const root = document.getElementById('profile-preview');
        if (!root) return;
        root.querySelectorAll('.kv .help-icon').forEach(icon => {
            const wrap = icon.parentElement;
            const bubble = wrap && wrap.querySelector('.tooltip-bubble');
            if (!wrap || !bubble) return;
            function show(){ bubble.classList.add('tooltip-visible'); }
            function hide(){ bubble.classList.remove('tooltip-visible'); }
            icon.addEventListener('mouseenter', show);
            icon.addEventListener('mouseleave', hide);
            icon.addEventListener('focus', show);
            icon.addEventListener('blur', hide);
            icon.addEventListener('click', (e)=>{ e.stopPropagation(); bubble.classList.toggle('tooltip-visible'); });
            document.addEventListener('click', (evt)=>{ if (!wrap.contains(evt.target)) bubble.classList.remove('tooltip-visible'); });
        });
    }

    async function generateProfileWizard() {
        let scan = null;
        const scanOut = $('#scan-out');
        // Try to extract scan from data attribute or re-scan
        if (scanOut.dataset.scanData) {
            try { scan = JSON.parse(scanOut.dataset.scanData); } catch { /* no-op */ }
        }
        if (!scan) scan = await scanHardware();
        const budget = parseFloat($('#budget').value || '0');
        const prof = (window.ProfileLogic && window.ProfileLogic.buildWizardProfile) ? window.ProfileLogic.buildWizardProfile(scan, budget) : {};

        // Try a pipeline cost preview
        const payload = (window.CostLogic && window.CostLogic.buildPayloadFromUI) ? window.CostLogic.buildPayloadFromUI() : {
            gen_provider:'openai', gen_model:'gpt-4o-mini', tokens_in:0, tokens_out:0, embeds:0, reranks:0, requests_per_day:0
        };
        try {
            const r = await fetch(api('/api/cost/estimate_pipeline'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const d = await r.json();
            prof.__estimate__ = d;
        } catch { /* no-op */ }
        $('#profile-preview').innerHTML = formatProfile(prof);
        bindPreviewTooltips();
        $('#profile-preview').dataset.profileData = JSON.stringify(prof);
        updateWizardSummary();
        return prof;
    }

    async function applyProfileWizard() {
        let prof = null;
        const preview = $('#profile-preview');
        if (preview.dataset.profileData) {
            try { prof = JSON.parse(preview.dataset.profileData); } catch { /* no-op */ }
        }
        if (!prof || typeof prof !== 'object') prof = await generateProfileWizard();
        // Remove cost estimate from applied profile
        if (prof.__estimate__) delete prof.__estimate__;
        try {
            const r = await fetch(api('/api/profiles/apply'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profile: prof }) });
            const d = await r.json();
            alert(`Profile applied: ${d.applied_keys?.join(', ') || 'ok'}`);
            await loadConfig();
        } catch (e) { alert('Failed to apply profile: ' + e.message); }
    }

    // Tri-Candidate Generation (from docs)
    function generateCandidates(scan, budget) {
        const hasLocal = !!(scan?.runtimes?.ollama || scan?.runtimes?.coreml);
        const mem = (scan?.info?.mem_gb || 8);
        const budgetNum = Number(budget) || 0;

        // Three baseline candidates
        const local = {
            name: 'local',
            env: {
                GEN_MODEL: hasLocal ? 'qwen3-coder:14b' : 'gpt-4o-mini',
                EMBEDDING_TYPE: hasLocal ? 'local' : 'mxbai',
                RERANK_BACKEND: hasLocal ? 'local' : 'none',
                MQ_REWRITES: mem >= 32 ? '4' : '3',
                FINAL_K: mem >= 32 ? '10' : '8',
                TOPK_DENSE: '60', TOPK_SPARSE: '60', HYDRATION_MODE: 'lazy'
            }
        };
        const cheapCloud = {
            name: 'cheap_cloud',
            env: {
                GEN_MODEL: 'gpt-4o-mini', EMBEDDING_TYPE: 'openai', RERANK_BACKEND: 'local',
                MQ_REWRITES: budgetNum > 25 ? '4' : '3',
                FINAL_K: budgetNum > 25 ? '10' : '8',
                TOPK_DENSE: '75', TOPK_SPARSE: '75', HYDRATION_MODE: 'lazy'
            }
        };
        const premium = {
            name: 'premium',
            env: {
                GEN_MODEL: 'gpt-4o-mini', EMBEDDING_TYPE: 'openai', RERANK_BACKEND: 'cohere',
                MQ_REWRITES: budgetNum > 100 ? '6' : '4',
                FINAL_K: budgetNum > 100 ? '20' : '12',
                TOPK_DENSE: '120', TOPK_SPARSE: '120', HYDRATION_MODE: 'lazy'
            }
        };
        return [local, cheapCloud, premium];
    }

    async function triCostSelect() {
        // Use current Cost panel inputs for tokens and rpd
        const base = {
            tokens_in: parseInt($('#cost-in').value || '500', 10),
            tokens_out: parseInt($('#cost-out').value || '800', 10),
            embeds: parseInt($('#cost-embeds').value || '0', 10),
            reranks: parseInt($('#cost-rerank').value || '0', 10),
            requests_per_day: parseInt($('#cost-rpd').value || '100', 10)
        };
        const budget = parseFloat($('#budget').value || '0');
        const scanOut = $('#scan-out');
        let scan = null;
        if (scanOut && scanOut.dataset.scanData) {
            try { scan = JSON.parse(scanOut.dataset.scanData); } catch { /* no-op */ }
        }
        if (!scan) scan = await scanHardware();

        const cands = generateCandidates(scan, budget);

        const rows = [];
        for (const c of cands) {
            // Decide provider/model from env for cost call
            const provider = (c.env.GEN_MODEL || '').match(/:/) ? 'local' : 'openai';
            const model = c.env.GEN_MODEL || 'gpt-4o-mini';
            const payload = (window.CostLogic && window.CostLogic.buildPayloadFromUI) ? window.CostLogic.buildPayloadFromUI() : { gen_provider: provider, gen_model: model, ...base };
            payload.gen_provider = provider; payload.gen_model = model;

            // local electricity optional if provider==local
            if (provider === 'local') {
                const kwh = $('#cost-kwh')?.value;
                const watts = $('#cost-watts')?.value;
                const hours = $('#cost-hours')?.value;
                if (kwh) payload.kwh_rate = parseFloat(kwh);
                if (watts) payload.watts = parseInt(watts, 10);
                if (hours) payload.hours_per_day = parseFloat(hours);
            }
            // Call cost API
            const r = await fetch(api('/api/cost/estimate'), {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            rows.push({
                name: c.name,
                env: c.env,
                provider,
                model,
                daily: d.daily,
                monthly: d.monthly,
                breakdown: d.breakdown
            });
        }

        // Rank by monthly (ascending), then prefer cheaper that meet budget if budget>0
        const ranked = rows.sort((a,b) => a.monthly - b.monthly);
        let winner = ranked[0];
        if (budget > 0) {
            const within = ranked.filter(r => r.monthly <= budget);
            if (within.length) winner = within[within.length - 1]; // Pick most expensive within budget
        }

        const triOut = $('#tri-out');
        if (triOut) {
            const lines = [];
            ranked.forEach(r => {
                const mark = r.name === winner.name ? '✓' : ' ';
                const header = `${mark} ${r.name.toUpperCase().padEnd(15)} $${r.monthly.toFixed(2)}/mo`;
                lines.push(header);
                lines.push(`  Inference:  ${r.env.GEN_MODEL || '—'}`);
                lines.push(`  Embedding:  ${r.env.EMBEDDING_TYPE || '—'}`);
                lines.push(`  Rerank:     ${r.env.RERANK_BACKEND || 'none'}`);
                lines.push(`  MQ:${r.env.MQ_REWRITES||'3'}  Final-K:${r.env.FINAL_K||'10'}  Sparse:${r.env.TOPK_SPARSE||'75'}  Dense:${r.env.TOPK_DENSE||'75'}`);
                lines.push('');
            });
            triOut.textContent = lines.join('\n').trim();
        }

        return { winner, ranked };
    }

    async function triChooseAndApply() {
        console.log('[AUTO-PROFILE] Button clicked - starting triChooseAndApply');

        // Show loading state
        const placeholder = $('#profile-placeholder');
        const resultsContent = $('#profile-results-content');
        console.log('[AUTO-PROFILE] Elements found:', { placeholder: !!placeholder, resultsContent: !!resultsContent });

        if (placeholder) placeholder.style.display = 'flex';
        if (resultsContent) resultsContent.style.display = 'none';

        // Add loading spinner to placeholder
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <div style="width:48px;height:48px;border:3px solid #2a2a2a;border-top-color:#00ff88;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;"></div>
                    <p style="font-size:14px;color:#666;">Analyzing hardware and generating profile...</p>
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
        }

        const { winner, ranked } = await triCostSelect();
        const budget = Number($('#budget')?.value || 0);

        // Scan hardware if not already done
        let scan = state.hwScan;
        if (!scan) {
            try {
                const r = await fetch(api('/api/scan-hw'), { method: 'POST' });
                scan = await r.json();
                state.hwScan = scan;
            } catch (e) {
                console.error('HW scan failed:', e);
                scan = null;
            }
        }

        // Render rich profile display using ProfileRenderer
        if (window.ProfileRenderer && resultsContent) {
            try {
                const html = window.ProfileRenderer.renderProfileResults(winner.env, scan, budget);
                resultsContent.innerHTML = html;
                // Bind tooltips inside the rendered preview
                if (window.ProfileRenderer.bindTooltips) window.ProfileRenderer.bindTooltips(resultsContent);

                // Hide placeholder, show results
                if (placeholder) placeholder.style.display = 'none';
                resultsContent.style.display = 'block';
            } catch (err) {
                console.error('ProfileRenderer error:', err);
                // Fallback to simple display
                if (resultsContent) {
                    resultsContent.innerHTML = '<pre style="color:#ff6b6b;padding:20px;">Error rendering profile: ' + err.message + '</pre>';
                    resultsContent.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
            }
        } else {
            console.error('ProfileRenderer not available:', { hasRenderer: !!window.ProfileRenderer, hasContent: !!resultsContent });
            // Fallback to old method
            if (resultsContent) {
                resultsContent.innerHTML = '<pre style="padding:20px;color:#aaa;">' + JSON.stringify(winner.env, null, 2) + '</pre>';
                resultsContent.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        }

        // Wire up action buttons (always, regardless of renderer)
        const applyBtn = document.getElementById('apply-profile-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                const r = await fetch(api('/api/profiles/apply'), {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ profile: winner.env })
                });
                if (!r.ok) {
                    alert('Apply failed');
                    return;
                }
                alert(`✓ Applied: ${winner.name} ($${winner.monthly.toFixed(2)}/mo)\n\nSettings are now active. Refresh the page to see updated values.`);
                await loadConfig();
            });
        }

        const exportBtn = document.getElementById('export-profile-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const blob = new Blob([JSON.stringify(winner.env, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `profile-${winner.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const name = prompt('Profile name:', winner.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                if (!name) return;
                const r = await fetch(api('/api/profiles/save'), {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ name, profile: winner.env })
                });
                if (r.ok) {
                    alert(`✓ Saved as "${name}"`);
                    await loadProfiles();
                } else {
                    alert('Save failed');
                }
            });
        }
    }

    // Wizard helpers
    function buildWizardProfile(scan, budget) {
        // Legacy single-profile builder (kept for compatibility)
        const hasLocal = scan?.runtimes?.ollama || scan?.runtimes?.coreml;
        const budgetNum = Number(budget) || 0;
        const defaultGen = hasLocal && budgetNum === 0 ? 'qwen3-coder:14b' : 'gpt-4o-mini';
        const defaultEmb = budgetNum === 0 ? (hasLocal ? 'local' : 'mxbai') : 'openai';
        const defaultRprov = budgetNum === 0 ? (hasLocal ? 'local' : 'none') : 'cohere';

        const profile = {
            GEN_MODEL: defaultGen,
            EMBEDDING_TYPE: defaultEmb,
            RERANK_BACKEND: defaultRprov,
            MQ_REWRITES: budgetNum > 50 ? '6' : '3',
            FINAL_K: budgetNum > 50 ? '20' : '10',
            TOPK_SPARSE: budgetNum > 50 ? '120' : '75',
            TOPK_DENSE: budgetNum > 50 ? '120' : '75',
            HYDRATION_MODE: 'lazy',
        };
        return profile;
    }

    function seedWizardFromEnv(env) {
        const wzGen = $('#wizard-gen-model');
        if (wzGen && env.GEN_MODEL) wzGen.value = env.GEN_MODEL;
        const wzEmb = $('#wizard-embed-provider');
        if (wzEmb && env.EMBEDDING_TYPE) wzEmb.value = env.EMBEDDING_TYPE;
        const wzRprov = $('#wizard-rerank-provider');
        if (wzRprov && env.RERANK_BACKEND) wzRprov.value = env.RERANK_BACKEND;
        const wzRmod = $('#wizard-rerank-model');
        if (wzRmod && (env.COHERE_RERANK_MODEL || env.RERANKER_MODEL)) wzRmod.value = env.COHERE_RERANK_MODEL || env.RERANKER_MODEL;
    }

    function loadWizardFromEnv() {
        const env = (state.config && state.config.env) || {};
        seedWizardFromEnv(env);
        updateWizardSummary();
    }

    function updateWizardSummary() {
        const scanOut = $('#scan-out');
        let hw = '';
        if (scanOut && scanOut.dataset.scanData) {
            try {
                const s = JSON.parse(scanOut.dataset.scanData);
                hw = `${s.info?.cpu_cores||'?'} cores, ${s.info?.mem_gb||'?'} GB RAM, runtimes: ${Object.keys(s.runtimes||{}).filter(k=>s.runtimes[k]).join(', ')||'none'}`;
            } catch { hw = '(hardware not scanned)'; }
        } else {
            hw = '(hardware not scanned)';
        }
        const gen = ($('#wizard-gen-model')?.value || '(GEN_MODEL not set)');
        const emb = ($('#wizard-embed-provider')?.value || (state.config?.env?.EMBEDDING_TYPE || '(use current)'));
        const rprov = ($('#wizard-rerank-provider')?.value || (state.config?.env?.RERANK_BACKEND || '(use current)'));
        const rmod = ($('#wizard-rerank-model')?.value || state.config?.env?.COHERE_RERANK_MODEL || state.config?.env?.RERANKER_MODEL || '');
        const budget = $('#budget')?.value || '0';
        const line = `Hardware: ${hw}\nModels: gen=${gen}, emb=${emb}, rerank=${rprov}${rmod?`:${rmod}`:''}\nBudget: $${budget}/mo`;
        const el = $('#wizard-summary'); if (el) el.textContent = line;
    }

    // Keep summary in sync
    ;['wizard-gen-model','wizard-embed-provider','wizard-rerank-provider','wizard-rerank-model','budget'].forEach(id => {
        const el = document.getElementById(id); if (el) el.addEventListener('input', updateWizardSummary);
    });

    async function applyProfile() {
        const scanText = $('#scan-out').textContent;
        if (!scanText || scanText === '') {
            alert('Please scan hardware first');
            return;
        }

        const scan = JSON.parse(scanText);
        const budget = parseFloat($('#budget').value || '0');
        const prof = proposeProfile(scan, budget);

        try {
            const r = await fetch(api('/api/profiles/apply'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: prof })
            });

            const d = await r.json();
            alert(`Profile applied: ${d.applied_keys.join(', ')}`);
            await loadConfig();
        } catch (e) {
            alert('Failed to apply profile: ' + e.message);
        }
    }

    async function loadProfiles() {
        try {
            const r = await fetch(api('/api/profiles'));
            const d = await r.json();
            state.profiles = d.profiles || [];
            state.defaultProfile = d.default || null;

            const ul = $('#profiles-ul');
            const tooltip = $('#profile-tooltip');
            ul.innerHTML = '';

            state.profiles.forEach((name) => {
                const li = document.createElement('li');
                li.textContent = name;
                li.style.cssText = 'padding: 6px 8px; color: #aaa; cursor: pointer; border-radius: 4px; transition: all 0.15s ease;';

                li.addEventListener('mouseenter', async (e) => {
                    li.style.background = '#1a1a1a';
                    li.style.color = '#00ff88';
                    await showProfileTooltip(name, e);
                });

                li.addEventListener('mouseleave', () => {
                    li.style.background = 'transparent';
                    li.style.color = '#aaa';
                    hideProfileTooltip();
                });

                li.addEventListener('click', () => loadAndApplyProfile(name));
                ul.appendChild(li);
            });
        } catch (e) {
            console.error('Failed to load profiles:', e);
        }
    }

    async function showProfileTooltip(name, event) {
        const tooltip = $('#profile-tooltip');
        if (!tooltip) return;

        try {
            // Fetch the profile data
            const r = await fetch(api(`/api/profiles/${encodeURIComponent(name)}`));
            if (!r.ok) return;

            const d = await r.json();
            const prof = d.profile || {};

            // Build tooltip content
            let html = `<div class="tooltip-header">${name}</div>`;

            const entries = Object.entries(prof);
            if (entries.length === 0) {
                html += '<div style="color: #666; font-size: 11px; font-style: italic;">Empty profile</div>';
            } else {
                entries.forEach(([key, value]) => {
                    const displayValue = String(value).length > 40
                        ? String(value).substring(0, 37) + '...'
                        : String(value);
                    html += `
                        <div class="tooltip-item">
                            <div class="tooltip-key">${key}</div>
                            <div class="tooltip-value">${displayValue}</div>
                        </div>
                    `;
                });
            }

            tooltip.innerHTML = html;

            // Position tooltip near the mouse
            const rect = event.target.getBoundingClientRect();
            tooltip.style.left = (rect.right + 10) + 'px';
            tooltip.style.top = rect.top + 'px';
            tooltip.style.display = 'block';

        } catch (e) {
            console.error('Failed to load profile for tooltip:', e);
        }
    }

    function hideProfileTooltip() {
        const tooltip = $('#profile-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    async function loadAndApplyProfile(name) {
        try {
            // Load the profile data
            const r = await fetch(api(`/api/profiles/${encodeURIComponent(name)}`));
            if (!r.ok) {
                alert(`Failed to load profile "${name}"`);
                return;
            }
            const d = await r.json();
            const prof = d.profile || {};

            // Apply the profile
            const applyRes = await fetch(api('/api/profiles/apply'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: prof })
            });

            if (!applyRes.ok) {
                alert(`Failed to apply profile "${name}"`);
                return;
            }

            const applyData = await applyRes.json();
            alert(`✓ Profile "${name}" applied successfully!\n\nApplied keys: ${applyData.applied_keys?.join(', ') || 'none'}`);

            // Reload config to show updated values in UI
            await loadConfig();
        } catch (e) {
            alert(`Error loading profile "${name}": ${e.message}`);
        }
    }

    async function saveProfile() {
        const name = $('#profile-name').value.trim();
        if (!name) {
            alert('Enter a profile name');
            return;
        }

        // Prefer wizard preview if present; otherwise build from scan
        let prof = null;
        const preview = $('#profile-preview');
        if (preview.dataset.profileData) {
            try { prof = JSON.parse(preview.dataset.profileData); } catch {}
        }
        if (!prof) {
            const scanOut = $('#scan-out');
            if (!scanOut.dataset.scanData) { alert('Please scan hardware first'); return; }
            const scan = JSON.parse(scanOut.dataset.scanData);
            const budget = parseFloat($('#budget').value || '0');
            prof = proposeProfile(scan, budget);
        }
        // Remove cost estimate before saving
        if (prof.__estimate__) delete prof.__estimate__;

        try {
            const r = await fetch(api('/api/profiles/save'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, profile: prof })
            });

            if (!r.ok) {
                alert('Save failed');
                return;
            }

            await loadProfiles();
            alert(`Saved profile: ${name}`);
        } catch (e) {
            alert('Failed to save profile: ' + e.message);
        }
    }

    // ---------------- Secrets Ingest (Drag & Drop) ----------------
    // Delegated to Secrets module (gui/js/secrets.js)
    const bindDropzone = window.Secrets?.bindDropzone || (() => {});
    const ingestFile = window.Secrets?.ingestFile || (async () => {});

    // ---------------- Quick Action Helpers ----------------
    function setButtonState(btn, state) {
        if (!btn) return;
        btn.classList.remove('loading', 'success', 'error');
        if (state === 'loading') btn.classList.add('loading');
        else if (state === 'success') btn.classList.add('success');
        else if (state === 'error') btn.classList.add('error');
    }

    function showStatus(message, type = 'info') {
        const status = document.getElementById('dash-index-status');
        const bar = document.getElementById('dash-index-bar');
        if (!status) return;

        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'success' ? '#00ff88' : type === 'error' ? '#ff6b6b' : '#5b9dff';
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';

        status.innerHTML = `<span style="color:${color};">${icon}</span> <span style="color:#666;">[${timestamp}]</span> ${message}`;

        if (bar) {
            if (type === 'loading') {
                bar.style.width = '50%';
                bar.style.opacity = '0.6';
            } else if (type === 'success') {
                bar.style.width = '100%';
                bar.style.opacity = '1';
                setTimeout(() => { bar.style.width = '0%'; }, 2000);
            } else if (type === 'error') {
                bar.style.width = '100%';
                bar.style.background = '#ff6b6b';
                bar.style.opacity = '1';
                setTimeout(() => {
                    bar.style.width = '0%';
                    bar.style.background = 'linear-gradient(90deg, #ff9b5e 0%, #ff6b9d 100%)';
                }, 2000);
            }
        }
    }

    // Simulated progress ticker for long-running actions
    function startSimProgress(label, total = 80, tips = []) {
        const status = document.getElementById('dash-index-status');
        const bar = document.getElementById('dash-index-bar');
        let step = 0; let tipIdx = 0;
        function tick() {
            step = Math.min(total, step + 1);
            const pct = Math.min(90, Math.max(5, Math.floor((step / Math.max(1,total)) * 90)));
            if (bar) { bar.style.width = pct + '%'; bar.style.opacity = '0.9'; }
            const tip = tips.length ? (tips[tipIdx % tips.length]) : '';
            tipIdx++;
            if (status) {
                status.innerHTML = `
                    <div class="mono" style="color:#bbb;">
                        🔎 ${label}<br>
                        Scanning ${step} of ${total}… ${tip ? `<span style='color:#666'>(${tip})</span>` : ''}
                    </div>
                `;
            }
        }
        const id = setInterval(tick, 900);
        tick();
        return {
            stop: () => {
                clearInterval(id);
                if (bar) { bar.style.width = '100%'; bar.style.opacity = '1'; setTimeout(()=>{ bar.style.width='0%'; }, 1500); }
            }
        };
    }

    function bindQuickAction(btnId, handler) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            setButtonState(btn, 'loading');

            try {
                await handler();
                setButtonState(btn, 'success');
                setTimeout(() => setButtonState(btn, null), 1500);
            } catch (err) {
                console.error(`[${btnId}] Error:`, err);
                setButtonState(btn, 'error');
                setTimeout(() => setButtonState(btn, null), 2000);
            }
        });
    }

    // ---------------- Quick Actions ----------------
    async function changeRepo() {
        showStatus('Loading repositories...', 'loading');

        try {
            const response = await fetch(api('/api/config'));
            const data = await response.json();
            const repos = data.repos || [];
            const currentRepo = (data.env && data.env.REPO) || data.default_repo || 'agro';

            if (repos.length === 0) {
                showStatus('No repositories configured', 'error');
                return;
            }

            // Create a dialog-like selection UI
            const repoHtml = repos.map((repo, idx) => {
                const isActive = repo.slug === currentRepo;
                return `
                    <button
                        class="small-button"
                        data-repo="${repo.slug}"
                        style="
                            margin-bottom: 8px;
                            background: ${isActive ? '#00ff88' : '#1a1a1a'};
                            color: ${isActive ? '#000' : '#aaa'};
                            border: 1px solid ${isActive ? '#00ff88' : '#2a2a2a'};
                            width: 100%;
                            text-align: left;
                            padding: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        "
                    >
                        <span>${repo.slug}</span>
                        ${isActive ? '<span>✓ ACTIVE</span>' : ''}
                    </button>
                `;
            }).join('');

            const status = document.getElementById('dash-index-status');
            if (status) {
                status.innerHTML = `
                    <div style="padding: 8px;">
                        <div style="margin-bottom: 12px; color: #00ff88; font-weight: 600;">Select Repository:</div>
                        ${repoHtml}
                    </div>
                `;

                // Bind click handlers
                repos.forEach(repo => {
                    const btn = status.querySelector(`[data-repo="${repo.slug}"]`);
                    if (btn && repo.slug !== currentRepo) {
                        btn.addEventListener('click', async () => {
                            btn.disabled = true;
                            btn.style.opacity = '0.6';
                            showStatus(`Switching to ${repo.slug}...`, 'loading');

                            try {
                                const updateResponse = await fetch(api('/api/env/update'), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ REPO: repo.slug })
                                });

                                if (updateResponse.ok) {
                                    showStatus(`Switched to ${repo.slug}`, 'success');
                                    setTimeout(() => refreshDashboard(), 500);
                                } else {
                                    showStatus(`Failed to switch to ${repo.slug}`, 'error');
                                }
                            } catch (err) {
                                showStatus(`Error switching repo: ${err.message}`, 'error');
                            }
                        });
                    }
                });
            }
        } catch (err) {
            showStatus(`Error loading repos: ${err.message}`, 'error');
        }
    }

    async function createKeywords() {
        const btn = document.getElementById('btn-generate-keywords');
        setButtonState(btn, 'loading');
        showStatus('Generating keywords (this may take 2–5 minutes)...', 'loading');
        let sim; // progress simulator for keyword generation
        try {
            const response = await fetch(api('/api/config'));
            const data = await response.json();
            const env = (data && data.env) || (state.config && state.config.env) || {};
            const repo = env.REPO || data.default_repo || 'agro';
            const modeSel = document.getElementById('kw-gen-mode');
            const mode = modeSel ? (modeSel.value || 'llm') : 'llm';
            const maxFilesEl = document.querySelector('[name="KEYWORDS_MAX_FILES"]');
            const max_files = maxFilesEl && maxFilesEl.value ? Number(maxFilesEl.value) : undefined;
            // Force OpenAI 4o for this on-click run (per request)
            const backend = 'openai';
            let model = 'gpt-4o';
            const tips = [
                'After keywords, build Semantic Cards in Repos → Indexing',
                'Add Path Boosts to steer retrieval (Repos tab)',
                'Toggle ENRICH_CODE_CHUNKS to store per‑chunk summaries',
                'Use shared profile to reuse indices across branches (Infrastructure)'
            ];
            sim = startSimProgress(
                mode === 'llm' ? `Mode: LLM • Backend: ${backend} • Model: ${model}` : 'Mode: Heuristic • Scanning tokens and file coverage…',
                max_files || 80,
                tips
            );

            // Call the keywords generation endpoint
            const createResponse = await fetch(api('/api/keywords/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo, mode, max_files, backend, openai_model: (backend==='openai'?model:undefined) })
            });

            if (createResponse.ok) {
                const result = await createResponse.json();

                if (result.ok) {
                    const discr = result.discriminative?.count || 0;
                    const sema = result.semantic?.count || 0;
                    const total = result.total_count || 0;
                    const duration = result.duration_seconds || 0;

                    // Build detailed status message
                    const status = `
                        <div style="font-size:14px;font-weight:600;color:#00ff88;margin-bottom:8px;">
                            ✓ Generated ${total} keywords for repo: ${repo}
                        </div>
                        <div style="font-size:12px;color:#ddd;margin-bottom:4px;">
                            <span style="color:#b794f6;">Discriminative:</span> ${discr} keywords
                        </div>
                        <div style="font-size:12px;color:#ddd;margin-bottom:4px;">
                            <span style="color:#5b9dff;">Semantic:</span> ${sema} keywords
                        </div>
                        <div style="font-size:12px;color:#ddd;margin-bottom:4px;">
                            <span style="color:#00d6ff;">LLM:</span> ${result.llm?.count || 0} keywords
                        </div>
                        <div style="font-size:11px;color:#999;margin-top:8px;">
                            Completed in ${duration}s
                        </div>
                        <div style="font-size:11px;color:#666;margin-top:6px;">
                            → View keywords in <span style="color:#00ff88;font-weight:600;">Repos & Indexing</span> tab
                        </div>
                    `;

                    const statusDiv = document.getElementById('dash-index-status');
                    if (statusDiv) {
                        statusDiv.innerHTML = status + `
                            <div style="margin-top:8px;">
                                <button id="cta-build-cards" class="small-button">Build Cards Now</button>
                            </div>
                        `;
                        const cta = document.getElementById('cta-build-cards');
                        if (cta) cta.addEventListener('click', async () => { try { switchTab('repos'); startCardsBuild(); } catch(e) { showStatus('Unable to start cards build', 'error'); } });
                    }

                    // Reload keywords to populate the UI
                    await loadKeywords();
                    setButtonState(btn, 'success');
                    setTimeout(()=> setButtonState(btn, null), 1500);
                    try { if (sim && sim.stop) sim.stop(); } catch {/* no-op */}
                } else {
                    showStatus(`Failed to generate keywords: ${result.error || 'Unknown error'}`, 'error');
                    setButtonState(btn, 'error');
                    setTimeout(()=> setButtonState(btn, null), 2000);
                    try { if (sim && sim.stop) sim.stop(); } catch {/* no-op */}
                }
            } else {
                const error = await createResponse.text();
                showStatus(`Failed to generate keywords: ${error}`, 'error');
                setButtonState(btn, 'error');
                setTimeout(()=> setButtonState(btn, null), 2000);
                try { if (sim && sim.stop) sim.stop(); } catch {/* no-op */}
            }
        } catch (err) {
            showStatus(`Error generating keywords: ${err.message}`, 'error');
            const btn = document.getElementById('btn-generate-keywords');
            setButtonState(btn, 'error');
            setTimeout(()=> setButtonState(btn, null), 2000);
            try { if (sim && sim.stop) sim.stop(); } catch {/* no-op */}
        }
    }

    async function reloadConfig() {
        showStatus('Reloading configuration...', 'loading');

        try {
            const response = await fetch(api('/api/env/reload'), {
                method: 'POST'
            });

            if (response.ok) {
                showStatus('Configuration reloaded successfully', 'success');
                await loadConfig();
                await refreshDashboard();
            } else {
                const error = await response.text();
                showStatus(`Failed to reload config: ${error}`, 'error');
            }
        } catch (err) {
            showStatus(`Error reloading config: ${err.message}`, 'error');
        }
    }

    // ---------------- Bindings ----------------
    function bindActions() {
        const btnHealth = $('#btn-health'); if (btnHealth) btnHealth.addEventListener('click', checkHealth);
        const saveBtn = $('#save-btn'); if (saveBtn) saveBtn.addEventListener('click', saveConfig);
        const btnEstimate = $('#btn-estimate'); if (btnEstimate) btnEstimate.addEventListener('click', estimateCost);
        const btnScanHw = $('#btn-scan-hw'); if (btnScanHw) btnScanHw.addEventListener('click', scanHardware);
        const legacyApply = document.getElementById('btn-apply-profile');
        if (legacyApply) legacyApply.addEventListener('click', applyProfile);
        const btnSaveProfile = $('#btn-save-profile'); if (btnSaveProfile) btnSaveProfile.addEventListener('click', saveProfile);
        const genBtn = document.getElementById('btn-generate-profile');
        if (genBtn) genBtn.addEventListener('click', generateProfileWizard);
        const applyWizard = document.getElementById('btn-apply-wizard');
        if (applyWizard) applyWizard.addEventListener('click', applyProfileWizard);
        const oneClick = document.getElementById('btn-wizard-oneclick');
        if (oneClick) oneClick.addEventListener('click', onWizardOneClick);
        const loadCur = document.getElementById('btn-wizard-load-cur');
        if (loadCur) loadCur.addEventListener('click', loadWizardFromEnv);

        // Retrieval tab: trace button
        const rt = document.getElementById('btn-trace-latest');
        if (rt) rt.addEventListener('click', ()=>loadLatestTrace('trace-output'));
        const rtLS = document.getElementById('btn-trace-open-ls');
        if (rtLS) rtLS.addEventListener('click', async ()=>{
            try{
                const prj = (state.config?.env?.LANGCHAIN_PROJECT||'agro');
                const qs = new URLSearchParams({ project: prj, share: 'true' });
                const r = await fetch(api(`/api/langsmith/latest?${qs.toString()}`));
                const d = await r.json();
                if (d && d.url) window.open(d.url, '_blank');
                else alert('No recent LangSmith run found. Ask a question first.');
            }catch(e){ alert('Unable to open LangSmith: '+e.message); }
        });

        // Chat bindings
        const chatSend = document.getElementById('chat-send');
        if (chatSend) chatSend.addEventListener('click', sendChat);
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.addEventListener('keydown', (e)=>{ if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); sendChat(); }});
        const chatClear = document.getElementById('chat-clear');
        if (chatClear) chatClear.addEventListener('click', ()=>{ const box=document.getElementById('chat-messages'); if (box) box.innerHTML='';});
        const chatTrace = document.getElementById('chat-trace');
        if (chatTrace) chatTrace.addEventListener('toggle', ()=>{ if (chatTrace.open) loadLatestTrace('chat-trace-output'); });

        // Dopamine-y feedback on any button click
        document.querySelectorAll('button').forEach(btn => {
            if (btn.dataset && btn.dataset.dopamineBound) return;
            if (!btn.dataset) btn.dataset = {};
            btn.dataset.dopamineBound = '1';
            btn.addEventListener('click', () => {
                const label = (btn.textContent || btn.id || 'button').trim();
                if (label) showStatus(`→ ${label}`, 'info');
            });
        });

        const addGen = document.getElementById('btn-add-gen-model');
        if (addGen) addGen.addEventListener('click', addGenModelFlow);
        const addEmb = document.getElementById('btn-add-embed-model');
        if (addEmb) addEmb.addEventListener('click', addEmbedModelFlow);
        const addRr = document.getElementById('btn-add-rerank-model');
        if (addRr) addRr.addEventListener('click', addRerankModelFlow);
        const addCost = document.getElementById('btn-add-cost-model');
        if (addCost) addCost.addEventListener('click', addCostModelFlow);

        const btnAuto = document.getElementById('btn-autotune-refresh');
        if (btnAuto) btnAuto.addEventListener('click', refreshAutotune);
        const cbAuto = document.getElementById('autotune-enabled');
        if (cbAuto) cbAuto.addEventListener('change', setAutotuneEnabled);

        const btnIndex = document.getElementById('btn-index-start');
        if (btnIndex) btnIndex.addEventListener('click', () => {
            if (window.IndexStatus && typeof window.IndexStatus.startIndexing === 'function') {
                window.IndexStatus.startIndexing();
            }
        });
        document.querySelectorAll('#btn-cards-build').forEach(btn => {
            if (!btn.dataset.cardsBuildBound) { btn.dataset.cardsBuildBound='1'; btn.addEventListener('click', () => startCardsBuild()); }
        });
        const btnCardsRefresh = document.getElementById('btn-cards-refresh');
        if (btnCardsRefresh) btnCardsRefresh.addEventListener('click', refreshCards);
        // Dashboard button bindings with enhanced feedback
        bindQuickAction('dash-index-start', () => {
            if (window.IndexStatus && typeof window.IndexStatus.startIndexing === 'function') {
                window.IndexStatus.startIndexing();
            }
        });
        bindQuickAction('dash-cards-refresh', refreshCards);
        bindQuickAction('dash-change-repo', changeRepo);
        bindQuickAction('dash-reload-config', reloadConfig);
        // Keep cost panel in sync with wizard selections
        const map = [
            ['wizard-gen-model','cost-model'],
            ['wizard-embed-provider','cost-embed-provider'],
            ['wizard-rerank-provider','cost-rerank-provider'],
            ['wizard-rerank-model','cost-rerank-model'],
        ];
        map.forEach(([a,b]) => { const elA = document.getElementById(a), elB = document.getElementById(b); if (elA && elB) elA.addEventListener('input', () => { elB.value = elA.value; }); });
    }

    // ---------------- Collapsible Sections & Resizable Sidepanel ----------------
    // Delegated to UiHelpers module (gui/js/ui-helpers.js)
    const bindCollapsibleSections = window.UiHelpers?.bindCollapsibleSections || (() => console.warn('[app.js] UiHelpers.bindCollapsibleSections not available'));
    const bindResizableSidepanel = window.UiHelpers?.bindResizableSidepanel || (() => console.warn('[app.js] UiHelpers.bindResizableSidepanel not available'));

    // ---------------- Global Search (live) ----------------
    // Delegated to Search module (gui/js/search.js)
    const bindGlobalSearchLive = window.Search?.bindGlobalSearchLive || (() => {});

    // ---------------- MCP RAG Search (debug) ----------------
    const bindMcpRagSearch = window.McpRag?.bind || (()=>{});

    // ---------------- LangSmith (Preview) ----------------
    const bindLangSmithViewer = window.LangSmith?.bind || (()=>{});

    // ---------------- Autotune ----------------
    // Delegated to Autotune module (gui/js/autotune.js)
    const refreshAutotune = window.Autotune?.refreshAutotune || (async () => {});
    const setAutotuneEnabled = window.Autotune?.setAutotuneEnabled || (async () => {});

    // ---------------- Keywords ----------------
    // Delegated to Keywords module (gui/js/keywords.js)
    const loadKeywords = window.Keywords?.loadKeywords || (async () => {});

    // ---------------- Help Tooltips (delegated) ----------------
    const addHelpTooltips = window.Tooltips?.attachTooltips || (() => {});

    // ---------- Numbers formatting + per‑day converters ----------
    // Number formatting functions - delegated to UiHelpers module
    const getNum = window.UiHelpers?.getNum || ((id) => 0);
    const setNum = window.UiHelpers?.setNum || (() => {});
    const attachCommaFormatting = window.UiHelpers?.attachCommaFormatting || (() => {});
    const wireDayConverters = window.UiHelpers?.wireDayConverters || (() => {});

    // ---------------- Init ----------------
    async function init() {
        bindTabs();
        bindSubtabs();
        bindActions();
        bindGlobalSearchLive();
        bindResizableSidepanel();
        bindCollapsibleSections();
        bindDropzone();
        bindMcpRagSearch();
        bindLangSmithViewer();
        const hookBtn = document.getElementById('btn-install-hooks'); if (hookBtn) hookBtn.addEventListener('click', installHooks);
        const genKwBtn = document.getElementById('btn-generate-keywords'); if (genKwBtn) genKwBtn.addEventListener('click', createKeywords);

        await Promise.all([
            loadPrices(),
            loadConfig(),
            loadProfiles(),
            loadKeywords()
        ]);

        await checkHealth();
        await refreshAutotune();
        await refreshDashboard();
        await refreshHooksStatus();
        addHelpTooltips();
        // Note: comma formatting removed for cost-* fields since they are type="number" inputs
        wireDayConverters();
    }

    // -------- Embedded Editor (delegated) --------
    const checkEditorHealth = window.Editor?.checkEditorHealth || (async ()=>{});
    const openEditorWindow = window.Editor?.openEditorWindow || (async ()=>{});
    const copyEditorUrl = window.Editor?.copyEditorUrl || (async ()=>{});
    const restartEditor = window.Editor?.restartEditor || (async ()=>{});
    window.initEditorHealthCheck = function(){
        if (window.Editor?.initEditorHealthCheck) window.Editor.initEditorHealthCheck();
    };
    window.stopEditorHealthCheck = function(){
        if (window.Editor?.stopEditorHealthCheck) window.Editor.stopEditorHealthCheck();
    };
    // Ensure init runs even if DOMContentLoaded already fired (scripts at body end)
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Decide v1 (client) vs v2 (server) auto-profile
    async function onWizardOneClick(e){
        try{
            const v2 = document.getElementById('apv2-enabled');
            if (v2 && v2.checked && window.AutoProfileV2 && typeof window.AutoProfileV2.run === 'function'){
                e.preventDefault();
                await window.AutoProfileV2.run();
                return;
            }
        }catch{}
        return triChooseAndApply();
    }

    // ---------------- Dashboard Summary ----------------
    async function refreshDashboard() {
        try {
            const c = state.config || (await (await fetch(api('/api/config'))).json());
            const repo = (c.env && (c.env.REPO || c.default_repo)) || '(none)';
            const reposCount = (c.repos || []).length;
            const dr = document.getElementById('dash-repo'); if (dr) dr.textContent = `${repo} (${reposCount} repos)`;
        } catch {}

        try {
            const h = await (await fetch(api('/health'))).json();
            const dh = document.getElementById('dash-health'); if (dh) dh.textContent = `${h.status}${h.graph_loaded? ' (graph ready)':''}`;
        } catch {}

        try {
            const a = await (await fetch(api('/api/autotune/status'))).json();
            const da = document.getElementById('dash-autotune'); if (da) da.textContent = a.enabled ? (a.current_mode || 'enabled') : 'disabled';
        } catch { const da = document.getElementById('dash-autotune'); if (da) da.textContent = 'Pro required'; }

        try {
            const cards = await (await fetch(api('/api/cards'))).json();
            const dc = document.getElementById('dash-cards'); if (dc) dc.textContent = `${cards.count || 0} cards`;
        } catch {}

        try {
            const env = (state.config && state.config.env) || {};
            const host = env.MCP_HTTP_HOST || '0.0.0.0';
            const port = env.MCP_HTTP_PORT || '8013';
            const path = env.MCP_HTTP_PATH || '/mcp';
            const dm = document.getElementById('dash-mcp'); if (dm) dm.textContent = `${host}:${port}${path}`;
        } catch {}

        // Load initial index status to show metadata (delegated)
        try {
            if (window.IndexStatus && typeof window.IndexStatus.pollIndexStatus === 'function') {
                await window.IndexStatus.pollIndexStatus();
            }
        } catch {}
    }

    // ---------------- Cards Viewer (delegated) ----------------
    // Cards are handled by window.Cards/window.CardsBuilder
    /*
    async function loadCards() {
        try {
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
                    `<div style="text-align: center; padding: 24px; color: #666;">
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
                             style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px; cursor: pointer; transition: all 0.2s;"
                             onmouseover="this.style.borderColor='#00ff88'; this.style.background='#1f1f1f';"
                             onmouseout="this.style.borderColor='#2a2a2a'; this.style.background='#1a1a1a';">
                            <h4 style="margin: 0 0 8px 0; color: #00ff88; font-size: 14px; font-weight: 600;">
                                ${(card.symbols && card.symbols[0]) ? card.symbols[0] : (card.file_path || '').split('/').slice(-1)[0]}
                            </h4>
                            <p style="margin: 0 0 8px 0; color: #aaa; font-size: 12px; line-height: 1.4;">
                                ${card.purpose || 'No description available'}
                            </p>
                            <div style="font-size: 10px; color: #666;">
                                <span style="color: #5b9dff;">${card.file_path || 'Unknown file'}</span>
                                ${card.start_line ? ` : ${card.start_line}` : ''}
                            </div>
                        </div>
                    `).join('');

                // Add click event listeners to cards
                document.querySelectorAll('.card-item[data-filepath]').forEach(card => {
                    card.addEventListener('click', function() {
                        const filePath = this.dataset.filepath;
                        const lineNumber = this.dataset.line;
                        jumpToLine(filePath, lineNumber);
                    });
                });
            }
        } catch (error) {
            console.error('Error loading cards:', error);
            const cardsContainer = document.getElementById('cards-viewer');
            if (cardsContainer) {
                cardsContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: #ff5555;">
                    Error loading cards: ${error.message}
                </div>`;
            }
        }
    }

    function jumpToLine(filePath, lineNumber) {
        // Enhanced navigation with visual feedback
        console.log(`📍 Navigate to: ${filePath}:${lineNumber}`);

        // Visual feedback
        const event = new CustomEvent('cardNavigation', {
            detail: { file: filePath, line: lineNumber }
        });
        window.dispatchEvent(event);

        // You can add VSCode or other IDE integration here
        // For now, show in a notification style
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: #1a1a1a; border: 1px solid #00ff88;
            padding: 12px 16px; border-radius: 6px;
            color: #fff; font-size: 13px; z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #00ff88;">📍</span>
                <span>Navigate to: <strong style="color: #5b9dff;">${filePath}:${lineNumber}</strong></span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Add refresh and build handlers
    // moved to Cards module

    async function buildCards() {
        try {
            const btn = document.getElementById('btn-cards-build');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Building Cards...';
            }

            const resp = await fetch(api('/api/cards/build'), { method: 'POST' });
            const data = await resp.json();

            if (data.success || data.status === 'success') {
                console.log('✅ Cards built successfully');
                await loadCards(); // Reload the cards
            } else {
                console.error('❌ Failed to build cards:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error building cards:', error);
        } finally {
            const btn = document.getElementById('btn-cards-build');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span style="margin-right: 4px;">⚡</span> Build Cards';
            }
        }
    }

    try { window.jumpToLine = jumpToLine; } catch {}

    // Call loadCards on page load
    // Cards module auto-binds on DOMContentLoaded

    /* DUPLICATE REMOVED: Indexing + Cards (use window.IndexStatus)
    // ---------------- Indexing + Cards ----------------
    let indexPoll = null;
    function progressFromLog(lines) {
        const text = (lines||[]).join(' ');
        let pct = 5;
        if (/Prepared \d+ chunks/i.test(text)) pct = 20;
        if (/BM25 index saved/i.test(text)) pct = 60;
        if (/Indexed \d+ chunks to Qdrant/i.test(text)) pct = 100;
        return pct;
    }

    async function startIndexing() {
        try {
            showStatus('Starting indexer...', 'loading');
            await fetch(api('/api/index/start'), { method: 'POST' });
            if (indexPoll) clearInterval(indexPoll);
            indexPoll = setInterval(pollIndexStatus, 800);
            await pollIndexStatus();
        } catch (e) {
            showStatus('Failed to start indexer: ' + e.message, 'error');
            throw e;
        }
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    function formatIndexStatus(lines, metadata) {
        if (!metadata) {
            if (!lines || !lines.length) return '<div style="color:#666;font-size:13px;">Ready to index...</div>';
            return `<div style="color:#aaa;font-size:12px;">${lines.join('<br>')}</div>`;
        }

        // Enterprise-grade comprehensive display
        const html = [];

        // Header with repo/branch
        html.push(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #2a2a2a;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:6px;height:6px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;"></div>
                    <div>
                        <div style="font-size:16px;font-weight:600;color:#fff;letter-spacing:-0.3px;">${metadata.current_repo}</div>
                        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">
                            Branch: <span style="color:#5b9dff;">${metadata.current_branch}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;font-size:10px;color:#666;">
                    ${new Date(metadata.timestamp).toLocaleString()}
                </div>
            </div>
        `);

        // Configuration section
        html.push(`
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div style="background:#0a0a0a;padding:12px;border-radius:6px;border:1px solid #2a2a2a;">
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Embedding Model</div>
                    <div style="font-size:14px;font-weight:600;color:#b794f6;font-family:'SF Mono',monospace;">${metadata.embedding_model}</div>
                </div>
                <div style="background:#0a0a0a;padding:12px;border-radius:6px;border:1px solid #2a2a2a;">
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Keywords</div>
                    <div style="font-size:14px;font-weight:600;color:#ff9b5e;font-family:'SF Mono',monospace;">${metadata.keywords_count.toLocaleString()}</div>
                </div>
            </div>
        `);

        // Index profiles section
        if (metadata.repos && metadata.repos.length > 0) {
            html.push(`<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:600;color:#00ff88;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Index Profiles</div></div>`);

            metadata.repos.forEach(repo => {
                const totalSize = (repo.sizes.chunks || 0) + (repo.sizes.bm25 || 0) + (repo.sizes.cards || 0);

                html.push(`
                    <div style="background:#0f0f0f;border:1px solid ${repo.has_cards ? '#006622' : '#2a2a2a'};border-radius:6px;padding:12px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
                            <div>
                                <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:4px;">
                                    ${repo.name} <span style="font-size:10px;color:#666;font-weight:400;">/ ${repo.profile}</span>
                                </div>
                                <div style="font-size:11px;color:#666;">
                                    ${repo.chunk_count.toLocaleString()} chunks
                                    ${repo.has_cards ? ' • <span style="color:#00ff88;">✓ Cards</span>' : ' • <span style="color:#666;">No cards</span>'}
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:14px;font-weight:600;color:#00ff88;font-family:'SF Mono',monospace;">
                                    ${formatBytes(totalSize)}
                                </div>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:10px;">
                            ${repo.paths.chunks ? `
                                <div style="background:#0a0a0a;padding:6px 8px;border-radius:4px;border:1px solid #1a1a1a;">
                                    <div style="color:#888;margin-bottom:2px;">Chunks</div>
                                    <div style="color:#5b9dff;font-family:'SF Mono',monospace;font-size:11px;">${formatBytes(repo.sizes.chunks)}</div>
                                </div>
                            ` : ''}
                            ${repo.paths.bm25 ? `
                                <div style="background:#0a0a0a;padding:6px 8px;border-radius:4px;border:1px solid #1a1a1a;">
                                    <div style="color:#888;margin-bottom:2px;">BM25 Index</div>
                                    <div style="color:#ff9b5e;font-family:'SF Mono',monospace;font-size:11px;">${formatBytes(repo.sizes.bm25)}</div>
                                </div>
                            ` : ''}
                            ${repo.paths.cards ? `
                                <div style="background:#0a0a0a;padding:6px 8px;border-radius:4px;border:1px solid #1a1a1a;">
                                    <div style="color:#888;margin-bottom:2px;">Cards</div>
                                    <div style="color:#00ff88;font-family:'SF Mono',monospace;font-size:11px;">${formatBytes(repo.sizes.cards)}</div>
                                </div>
                            ` : ''}
                        </div>
                        ${repo.paths.chunks ? `
                            <details style="margin-top:8px;">
                                <summary style="cursor:pointer;font-size:10px;color:#666;padding:4px 0;">
                                    <span style="color:#5b9dff;">▸</span> File Paths
                                </summary>
                                <div style="margin-top:6px;padding:8px;background:#0a0a0a;border-radius:4px;font-size:10px;font-family:'SF Mono',monospace;color:#888;">
                                    ${repo.paths.chunks ? `<div style="margin-bottom:2px;">📄 ${repo.paths.chunks}</div>` : ''}
                                    ${repo.paths.bm25 ? `<div style="margin-bottom:2px;">📁 ${repo.paths.bm25}</div>` : ''}
                                    ${repo.paths.cards ? `<div>🎴 ${repo.paths.cards}</div>` : ''}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                `);
            });
        }

        // Total storage footer
        html.push(`
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #2a2a2a;">
                <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Total Index Storage</div>
                <div style="font-size:18px;font-weight:700;color:#00ff88;font-family:'SF Mono',monospace;">
                    ${formatBytes(metadata.total_storage)}
                </div>
            </div>
        `);

        return html.join('');
    }

    const pollIndexStatus = window.IndexStatus?.pollIndexStatus || (async ()=>{});
    */

    // ---------------- Cards Builder (delegated) ----------------
    const openCardsModal = window.CardsBuilder?.openCardsModal || (()=>{});
    const startCardsBuild = window.CardsBuilder?.startCardsBuild || (async ()=>{});

    async function refreshCards() {
        try {
            showStatus('Refreshing dashboard...', 'loading');
            await refreshDashboard();
            showStatus('Dashboard refreshed', 'success');
        } catch (e) {
            showStatus('Failed to refresh: ' + e.message, 'error');
            throw e;
        }
    }

    // ---------------- Add Model Flows (delegated) ----------------
    const addGenModelFlow = window.ModelFlows?.addGenModelFlow || (async ()=>{});
    const addEmbedModelFlow = window.ModelFlows?.addEmbedModelFlow || (async ()=>{});
    const addRerankModelFlow = window.ModelFlows?.addRerankModelFlow || (async ()=>{});
    const addCostModelFlow = window.ModelFlows?.addCostModelFlow || (async ()=>{});


    // ============================================
    // Onboarding Wizard (delegated)
    // ============================================
    window.ensureOnboardingInit = function(){ if (window.Onboarding?.ensureOnboardingInit) window.Onboarding.ensureOnboardingInit(); };
})();
