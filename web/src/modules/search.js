// Global Search - Search functionality across GUI
// Handles text highlighting and live search with autocomplete
;(function() {
  'use strict';

  // Get shared utilities
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));
  const $$ = window.CoreUtils?.$$ || ((s) => Array.from(document.querySelectorAll(s)));

  // ---------------- Search Helpers ----------------

  function clearHighlights() {
    $$('.hl').forEach(m => {
      const t = document.createTextNode(m.textContent);
      m.replaceWith(t);
    });
  }

  function highlightMatches(root, q) {
    if (!q) return;
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const hits = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.nodeValue || !n.parentElement) continue;
      if (/SCRIPT|STYLE|IFRAME/.test(n.parentElement.tagName)) continue;
      const m = n.nodeValue.match(rx);
      if (!m) continue;
      const span = document.createElement('mark');
      span.className = 'hl';
      span.textContent = n.nodeValue;
      const html = n.nodeValue.replace(rx, s => `<mark class="hl">${s}</mark>`);
      const frag = document.createElement('span');
      frag.innerHTML = html;
      n.parentElement.replaceChild(frag, n);
      hits.push(frag.querySelector('mark.hl'));
    }
    return hits;
  }

  // ---------------- Basic Global Search ----------------

  function bindGlobalSearch() {
    const box = $('#global-search');
    if (!box) return;

    function run(q, jump = false) {
      clearHighlights();
      if (!q) return;
      const hits = highlightMatches($('.content'), q);
      if (jump && hits && hits.length) {
        hits[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    box.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        box.focus();
        box.select();
      }
    });
    box.addEventListener('input', () => run(box.value.trim()));
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') run(box.value.trim(), true);
    });
  }

  // ---------------- Live Search with Autocomplete ----------------

  function bindGlobalSearchLive() {
    const box = $('#global-search');
    if (!box) return;
    const pop = $('#search-results');
    let index = [];
    let items = [];
    let cursor = -1;

    function ensureIndex() {
      if (index.length) return index;
      const idx = [];
      $$('.settings-section').forEach(sec => {
        const title = (sec.querySelector('h3')?.textContent || '').toLowerCase();
        sec.querySelectorAll('.input-group').forEach(g => {
          const label = (g.querySelector('label')?.textContent || '').trim();
          const input = g.querySelector('input,select,textarea');
          if (!input) return;
          const name = input.name || input.id || '';
          const ph = input.getAttribute('placeholder') || '';
          const content = (title + ' ' + label + ' ' + name + ' ' + ph).toLowerCase();
          idx.push({
            label: label || name,
            title: title,
            name: name,
            placeholder: ph,
            el: input,
            content
          });
        });
      });
      index = idx;
      return idx;
    }

    function sectionGroupFor(el) {
      const tc = el.closest('.tab-content');
      if (!tc) return 'start';
      const id = tc.id.replace('tab-', '');

      // Map old tab IDs to new Navigation tab IDs
      const map = {
        // Old config tabs -> new tabs
        generation: 'rag-generation',
        embeddings: 'rag-embeddings',
        reranking: 'rag-reranking',
        retrieval: 'rag-retrieval',
        confidence: 'rag-retrieval',
        repos: 'rag-repos',
        indexing: 'rag-indexing',

        // Old devtools tabs -> new tabs
        infra: 'infrastructure',
        calculator: 'profiles',
        eval: 'evaluation',
        misc: 'experiments',

        // Dashboard/start
        dashboard: 'start',

        // Pass through new tab IDs unchanged
        'rag-generation': 'rag-generation',
        'rag-embeddings': 'rag-embeddings',
        'rag-reranking': 'rag-reranking',
        'rag-retrieval': 'rag-retrieval',
        'rag-repos': 'rag-repos',
        'rag-indexing': 'rag-indexing',
        'infrastructure': 'infrastructure',
        'profiles': 'profiles',
        'evaluation': 'evaluation',
        'experiments': 'experiments',
        'admin': 'admin',
        'start': 'start',
        'chat': 'chat'
      };

      return map[id] || id;
    }

    function go(item) {
      const tab = sectionGroupFor(item.el);
      // Call global switchTab if available
      if (typeof window.switchTab === 'function') {
        window.switchTab(tab);
      }
      item.el.classList.add('search-hit');
      item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => item.el.classList.remove('search-hit'), 1200);
      if (pop) pop.style.display = 'none';
    }

    function highlightText(text, query) {
      if (!query) return text;
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    function render(query = '') {
      if (!pop) return;
      pop.innerHTML = '';
      if (!items.length) {
        pop.style.display = 'none';
        return;
      }

      items.slice(0, 15).forEach((r, i) => {
        const div = document.createElement('div');
        div.className = 'item' + (i === cursor ? ' active' : '');

        const labelSpan = document.createElement('span');
        labelSpan.className = 'item-label';
        labelSpan.innerHTML = highlightText(r.label || r.name, query);

        const contextSpan = document.createElement('span');
        contextSpan.className = 'item-context';
        const contextParts = [];
        if (r.title) contextParts.push(highlightText(r.title, query));
        if (r.name && r.name !== r.label) contextParts.push(highlightText(r.name, query));
        contextSpan.innerHTML = contextParts.join(' • ');

        div.appendChild(labelSpan);
        if (contextParts.length > 0) div.appendChild(contextSpan);
        div.addEventListener('click', () => go(r));
        pop.appendChild(div);
      });
      pop.style.display = 'block';
    }

    function search(q) {
      const s = q.trim().toLowerCase();
      if (!s) {
        items = [];
        render();
        return;
      }
      ensureIndex();
      items = index.filter(x => x.content.includes(s));
      cursor = 0;
      render(s);
    }

    document.addEventListener('click', (e) => {
      if (pop && !pop.contains(e.target) && e.target !== box) {
        pop.style.display = 'none';
      }
    });

    box.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        box.focus();
        box.select();
      }
    });

    box.addEventListener('input', () => search(box.value));
    box.addEventListener('keydown', (e) => {
      if (!pop || pop.style.display !== 'block') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        cursor = Math.min(cursor + 1, items.length - 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cursor = Math.max(cursor - 1, 0);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[cursor]) go(items[cursor]);
      }
    });
  }

  // Export public API
  window.Search = {
    clearHighlights,
    highlightMatches,
    bindGlobalSearch,
    bindGlobalSearchLive
  };

  console.log('[Search] Loaded');
})();
