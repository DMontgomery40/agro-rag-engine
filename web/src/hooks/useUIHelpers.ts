import { useCallback, useEffect } from 'react';

/**
 * useUIHelpers Hook
 * Provides UI utility functions for DOM manipulation, formatting, and interactions
 * Converts ui-helpers.js functionality to React
 */
export function useUIHelpers() {
  // DOM query selectors
  const $ = useCallback(<T extends Element = Element>(selector: string): T | null => {
    return document.querySelector<T>(selector);
  }, []);

  const $$ = useCallback(<T extends Element = Element>(selector: string): T[] => {
    return Array.from(document.querySelectorAll<T>(selector));
  }, []);

  // Number formatting helpers
  const getNum = useCallback((id: string): number => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return 0;
    const value = (el.value || '').toString().replace(/,/g, '').replace(/\s/g, '');
    return parseInt(value, 10) || 0;
  }, []);

  const setNum = useCallback((id: string, n: number): void => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.value = (Number(n) || 0).toLocaleString('en-US');
  }, []);

  const attachCommaFormatting = useCallback((ids: string[]): void => {
    ids.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return;

      const onFocus = () => {
        el.value = el.value.replace(/,/g, '');
      };

      const onBlur = () => {
        const num = getNum(id);
        if (num >= 0) {
          el.value = num.toLocaleString('en-US');
        }
      };

      el.addEventListener('focus', onFocus);
      el.addEventListener('blur', onBlur);
    });
  }, [getNum]);

  // Collapsible sections management
  const bindCollapsibleSections = useCallback(() => {
    const headers = $$<HTMLElement>('.collapsible-header');

    headers.forEach(header => {
      const onClick = (e: Event) => {
        // Don't collapse if clicking on help icon
        if ((e.target as HTMLElement).closest('.tooltip-wrap')) return;

        const targetId = header.getAttribute('data-target');
        const content = targetId ? document.getElementById(targetId) : null;

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
      };

      header.addEventListener('click', onClick);

      // Restore collapsed state from localStorage
      const targetId = header.getAttribute('data-target');
      if (targetId) {
        const storageKey = `collapsed-${targetId}`;
        const savedState = localStorage.getItem(storageKey);

        if (savedState === '1') {
          const content = document.getElementById(targetId);
          if (content) {
            content.classList.add('collapsed');
            header.classList.add('collapsed');
          }
        }
      }
    });
  }, [$$]);

  // Resizable sidepanel management
  const bindResizableSidepanel = useCallback(() => {
    const handle = $<HTMLElement>('.resize-handle');
    if (!handle) return;

    const MIN_WIDTH = 280;
    const MAX_WIDTH = 900;
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
        document.documentElement.style.setProperty('--sidepanel-width', DEFAULT_WIDTH + 'px');
        localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH.toString());
      }
    }

    // Export reset function
    (window as any).resetSidepanelWidth = function() {
      document.documentElement.style.setProperty('--sidepanel-width', DEFAULT_WIDTH + 'px');
      localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH.toString());
      console.log('Sidepanel width reset to default');
    };

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    const getCurrentWidth = (): number => {
      const rootStyle = getComputedStyle(document.documentElement);
      const widthStr = rootStyle.getPropertyValue('--sidepanel-width').trim();
      return parseInt(widthStr, 10) || 400;
    };

    const setWidth = (width: number): void => {
      const viewportMax = Math.floor(window.innerWidth * 0.6);
      const hardMax = Math.min(MAX_WIDTH, viewportMax);
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(hardMax, width));
      document.documentElement.style.setProperty('--sidepanel-width', clampedWidth + 'px');
      localStorage.setItem(STORAGE_KEY, clampedWidth.toString());
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = getCurrentWidth();
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = startX - e.clientX;
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [$]);

  // Day conversion helpers
  const wireDayConverters = useCallback(() => {
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
      if (el) {
        el.addEventListener('input', recalc);
      }
    });

    recalc();
  }, [getNum, setNum]);

  // Sync theme selectors across different locations
  const syncThemeSelectors = useCallback(() => {
    const selTop = $<HTMLSelectElement>('#theme-mode');
    const selMisc = $<HTMLSelectElement>('#misc-theme-mode');

    const onThemeChange = (src: HTMLSelectElement) => {
      const v = src.value;
      if (selTop && selTop !== src) selTop.value = v;
      if (selMisc && selMisc !== src) selMisc.value = v;

      try {
        localStorage.setItem('THEME_MODE', v);
      } catch {}

      // Call theme apply function if available
      if (typeof (window as any).Theme?.applyTheme === 'function') {
        (window as any).Theme.applyTheme(v);
      }
    };

    if (selTop) {
      selTop.addEventListener('change', () => onThemeChange(selTop));
    }
    if (selMisc) {
      selMisc.addEventListener('change', () => onThemeChange(selMisc));
    }
  }, [$]);

  // Expose helpers to window for backwards compatibility during migration
  useEffect(() => {
    (window as any).UiHelpers = {
      bindCollapsibleSections,
      bindResizableSidepanel,
      getNum,
      setNum,
      attachCommaFormatting,
      wireDayConverters
    };

    console.log('[useUIHelpers] Loaded');
  }, [bindCollapsibleSections, bindResizableSidepanel, getNum, setNum, attachCommaFormatting, wireDayConverters]);

  return {
    $,
    $$,
    getNum,
    setNum,
    attachCommaFormatting,
    bindCollapsibleSections,
    bindResizableSidepanel,
    wireDayConverters,
    syncThemeSelectors
  };
}
