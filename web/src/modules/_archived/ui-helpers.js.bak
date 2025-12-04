// UI Helpers - Common UI utilities and interactions
// Handles collapsible sections, resizable panels, number formatting
;(function() {
  'use strict';

  // Get shared utilities
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));
  const $$ = window.CoreUtils?.$$ || ((s) => Array.from(document.querySelectorAll(s)));

  // ---------------- Collapsible Sections ----------------
  /**
   * ---agentspec
   * what: |
   *   Binds click handlers to collapsible headers. Toggles visibility of target sections by ID. Skips toggle if help icon clicked.
   *
   * why: |
   *   Centralizes collapsible UI logic; prevents accidental collapse when interacting with tooltips.
   *
   * guardrails:
   *   - DO NOT toggle if click originates from .tooltip-wrap; check e.target.closest()
   *   - NOTE: Requires data-target attribute on headers; missing attribute silently fails
   *   - ASK USER: Should collapse state persist across page reloads?
   * ---/agentspec
   */
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

    /**
     * ---agentspec
     * what: |
     *   Syncs theme selection across UI dropdowns and localStorage. Calls window.Theme.applyTheme(v) if available.
     *
     * why: |
     *   Centralizes theme changes to prevent UI inconsistency and persist user preference.
     *
     * guardrails:
     *   - DO NOT assume window.Theme exists; wrapped in typeof check
     *   - NOTE: localStorage write silently fails in private/sandboxed contexts
     * ---/agentspec
     */
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
  /**
   * ---agentspec
   * what: |
   *   Binds mouse drag handler to resize-handle element. Tracks panel width between MIN_WIDTH (280px) and MAX_WIDTH (900px), persists to localStorage under 'agro-sidepanel-width'.
   *
   * why: |
   *   Centralizes resize logic with persistent state to restore user preference on reload.
   *
   * guardrails:
   *   - DO NOT allow width below 280px or above 900px; clamp to viewport % if needed
   *   - NOTE: Requires .resize-handle DOM element; silently returns if missing
   *   - NOTE: localStorage key 'agro-sidepanel-width' must match retrieval logic elsewhere
   * ---/agentspec
   */
  function bindResizableSidepanel() {
    const handle = $('.resize-handle');
    if (!handle) return;

    const MIN_WIDTH = 280;
    const MAX_WIDTH = 900; // soft cap; also clamp to viewport % below
    const DEFAULT_WIDTH = 360;
    const STORAGE_KEY = 'agro-sidepanel-width';

    // Restore saved width with viewport constraints
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      const maxAllowed = Math.min(MAX_WIDTH, window.innerWidth * 0.45);
      if (width >= MIN_WIDTH && width <= maxAllowed) {
        document.documentElement.style.setProperty('--sidepanel-width', width + 'px');
      } else {
        // Reset to default if saved width is out of bounds
        document.documentElement.style.setProperty('--sidepanel-width', DEFAULT_WIDTH + 'px');
        localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH.toString());
      }
    }

    // Export reset function for use in other modules
    window.resetSidepanelWidth = function() {
      document.documentElement.style.setProperty('--sidepanel-width', DEFAULT_WIDTH + 'px');
      localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH.toString());
      console.log('Sidepanel width reset to default');
    };

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    /**
     * ---agentspec
     * what: |
     *   Gets/sets CSS custom property --sidepanel-width. Reads from root, writes with viewport constraint (max 60% or MAX_WIDTH, whichever smaller).
     *
     * why: |
     *   Centralizes width state in CSS var; viewport guard prevents layout breakage on resize.
     *
     * guardrails:
     *   - DO NOT exceed 60% viewport width; hardMax enforces this
     *   - NOTE: parseInt fallback to 400 if var unset or invalid
     *   - ASK USER: Define MAX_WIDTH constant before use
     * ---/agentspec
     */
    function getCurrentWidth() {
      const rootStyle = getComputedStyle(document.documentElement);
      const widthStr = rootStyle.getPropertyValue('--sidepanel-width').trim();
      return parseInt(widthStr, 10) || 400;
    }

    /**
     * ---agentspec
     * what: |
     *   Clamps sidepanel width between MIN_WIDTH and 60% viewport, applies CSS variable, persists to localStorage.
     *
     * why: |
     *   Prevents overflow while respecting user preference and viewport constraints.
     *
     * guardrails:
     *   - DO NOT exceed 60% viewport; hardMax enforces this
     *   - NOTE: localStorage persists across sessions; clear if needed
     * ---/agentspec
     */
    function setWidth(width) {
      const viewportMax = Math.floor(window.innerWidth * 0.6); // never exceed 60% of viewport
      const hardMax = Math.min(MAX_WIDTH, viewportMax);
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(hardMax, width));
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
  /**
   * ---agentspec
   * what: |
   *   getNum: Retrieves numeric value from DOM element by ID, strips commas/spaces, parses as int. Returns 0 if missing/invalid.
   *   setNum: Sets numeric value on DOM element by ID. No-op if element absent.
   *
   * why: |
   *   Centralizes DOM number I/O with consistent parsing and null-safety.
   *
   * guardrails:
   *   - DO NOT assume element exists; both functions silently fail if ID not found
   *   - NOTE: getNum strips commas and whitespace; setNum does not format output
   *   - ASK USER: Should setNum format output (e.g., add commas)?
   * ---/agentspec
   */
  function getNum(id) {
    const v = document.getElementById(id);
    if (!v) return 0;
    return parseInt((v.value || '').toString().replace(/,/g, '').replace(/\s/g, ''), 10) || 0;
  }

  /**
   * ---agentspec
   * what: |
   *   setNum() sets numeric input value with US locale formatting. attachCommaFormatting() binds comma-formatting to input elements by ID list.
   *
   * why: |
   *   Centralizes number formatting logic to ensure consistent locale-aware display across form inputs.
   *
   * guardrails:
   *   - DO NOT call setNum() with non-existent IDs; silently returns but may mask bugs
   *   - NOTE: toLocaleString() formats display only; underlying value remains numeric
   *   - ASK USER: Should attachCommaFormatting() also handle input events for real-time formatting?
   * ---/agentspec
   */
  function setNum(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = (Number(n) || 0).toLocaleString('en-US');
  }

  /**
   * ---agentspec
   * what: |
   *   Attaches focus/blur listeners to DOM elements by ID. On focus, strips commas; on blur, reformats via getNum(). Modifies element.value in-place.
   *
   * why: |
   *   Separates input sanitization (focus) from display formatting (blur) for UX without validation logic.
   *
   * guardrails:
   *   - DO NOT call if elements don't exist; silently skips via early return
   *   - NOTE: Depends on external getNum(id) function; behavior undefined if missing
   *   - DO NOT use for accessibility-critical fields without ARIA labels
   * ---/agentspec
   */
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

  /**
   * ---agentspec
   * what: |
   *   Converts daily token costs to per-request costs by dividing by requests-per-day (RPD). Updates cost-in and cost-out fields on input change.
   *
   * why: |
   *   Enables bidirectional cost modeling: users enter daily budgets, system derives per-request rates.
   *
   * guardrails:
   *   - DO NOT divide by zero; guards rpd > 0 before calculation
   *   - NOTE: Uses Math.floor; rounds down, may underestimate per-request cost
   *   - ASK USER: Should rounding mode be configurable (ceil/round)?
   * ---/agentspec
   */
  function wireDayConverters() {
    /**
     * ---agentspec
     * what: |
     *   Recalculates token costs by dividing daily in/out costs by requests-per-day (RPD). Updates cost-in and cost-out fields with floor division results.
     *
     * why: |
     *   Normalizes daily costs to per-request basis for cost-per-token comparison.
     *
     * guardrails:
     *   - DO NOT divide by zero; RPD must be > 0 before calculation
     *   - NOTE: Uses floor division; fractional tokens truncated
     *   - ASK USER: Should zero RPD show error or skip silently?
     * ---/agentspec
     */
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
