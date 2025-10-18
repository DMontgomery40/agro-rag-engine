// UI Helpers - Common UI utilities and interactions
// Handles collapsible sections, resizable panels, number formatting
;(function() {
  'use strict';

  // Get shared utilities
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));
  const $$ = window.CoreUtils?.$$ || ((s) => Array.from(document.querySelectorAll(s)));

  // ---------------- Collapsible Sections ----------------
  function bindCollapsibleSections() {
    const headers = $$('.collapsible-header');

    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't collapse if clicking on help icon
        if (e.target.closest('.tooltip-wrap')) return;

        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);

        if (!content) return;

        // Toggle collapsed state
        const isCollapsed = content.classList.contains('collapsed');

        if (isCollapsed) {
          content.classList.remove('collapsed');
          header.classList.remove('collapsed');
        } else {
          content.classList.add('collapsed');
          header.classList.add('collapsed');
        }

        // Save state to localStorage
        const storageKey = `collapsed-${targetId}`;
        localStorage.setItem(storageKey, isCollapsed ? '0' : '1');
      });

      // Restore collapsed state from localStorage
      const targetId = header.getAttribute('data-target');
      const storageKey = `collapsed-${targetId}`;
      const savedState = localStorage.getItem(storageKey);

      if (savedState === '1') {
        const content = document.getElementById(targetId);
        if (content) {
          content.classList.add('collapsed');
          header.classList.add('collapsed');
        }
      }
    });

    // Theme selectors (topbar + misc) -> live apply + sync
    const selTop = $('#theme-mode');
    const selMisc = $('#misc-theme-mode');

    function onThemeChange(src) {
      const v = src.value;
      if (selTop && selTop !== src) selTop.value = v;
      if (selMisc && selMisc !== src) selMisc.value = v;
      try { localStorage.setItem('THEME_MODE', v); } catch {}
      // Call theme apply function if available
      if (typeof window.Theme?.applyTheme === 'function') {
        window.Theme.applyTheme(v);
      }
    }

    if (selTop) selTop.addEventListener('change', () => onThemeChange(selTop));
    if (selMisc) selMisc.addEventListener('change', () => onThemeChange(selMisc));
  }

  // ---------------- Resizable Sidepanel ----------------
  function bindResizableSidepanel() {
    const handle = $('.resize-handle');
    if (!handle) return;

    const MIN_WIDTH = 300;
    const MAX_WIDTH = 800;
    const STORAGE_KEY = 'agro-sidepanel-width';

    // Restore saved width
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        document.documentElement.style.setProperty('--sidepanel-width', width + 'px');
      }
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    function getCurrentWidth() {
      const rootStyle = getComputedStyle(document.documentElement);
      const widthStr = rootStyle.getPropertyValue('--sidepanel-width').trim();
      return parseInt(widthStr, 10) || 400;
    }

    function setWidth(width) {
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      document.documentElement.style.setProperty('--sidepanel-width', clampedWidth + 'px');
      localStorage.setItem(STORAGE_KEY, clampedWidth.toString());
    }

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = getCurrentWidth();
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = startX - e.clientX; // Reverse direction (dragging left increases width)
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  // ---------------- Number Formatting ----------------
  function getNum(id) {
    const v = document.getElementById(id);
    if (!v) return 0;
    return parseInt((v.value || '').toString().replace(/,/g, '').replace(/\s/g, ''), 10) || 0;
  }

  function setNum(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = (Number(n) || 0).toLocaleString('en-US');
  }

  function attachCommaFormatting(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', () => {
        el.value = el.value.replace(/,/g, '');
      });
      el.addEventListener('blur', () => {
        const num = getNum(id);
        if (num >= 0) el.value = num.toLocaleString('en-US');
      });
    });
  }

  function wireDayConverters() {
    const recalc = () => {
      const rpd = getNum('cost-rpd');
      const inDay = getNum('cost-in-day');
      const outDay = getNum('cost-out-day');
      if (rpd > 0) {
        if (inDay > 0) setNum('cost-in', Math.floor(inDay / rpd));
        if (outDay > 0) setNum('cost-out', Math.floor(outDay / rpd));
      }
    };
    ['cost-in-day', 'cost-out-day', 'cost-rpd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', recalc);
    });
    recalc();
  }

  // Export public API
  window.UiHelpers = {
    bindCollapsibleSections,
    bindResizableSidepanel,
    getNum,
    setNum,
    attachCommaFormatting,
    wireDayConverters
  };

  console.log('[UiHelpers] Loaded');
})();
