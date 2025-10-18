(() => {
  const BASE = window.location.origin + '/agro-api';
  function attach() {
    if (!window.CoreUtils) return;
    try {
      window.CoreUtils.API_BASE = BASE;
      window.CoreUtils.api = (p) => {
        const s = String(p || '');
        if (s.startsWith('/agro-api/api/')) return BASE + s.slice('/agro-api'.length + 4);
        if (s.startsWith('/agro-api/')) return BASE + s.slice('/agro-api'.length);
        if (s.startsWith('/api/')) return BASE + s.slice(4);
        if (s.startsWith('/')) return BASE + s;
        return BASE + '/' + s;
      };
      console.log('[AGRO GUI] API_BASE set to', BASE);
    } catch (e) { console.warn('API override failed', e); }

    // Global fetch shim: route any '/api/*' calls to '/agro-api/*'
    try {
      const orig = window.fetch?.bind(window);
      if (orig) {
        window.fetch = (input, init) => {
          try {
            // String URL
            if (typeof input === 'string') {
              if (input.startsWith('/agro-api/api/')) input = '/agro-api' + input.slice('/agro-api'.__len__() + 4);
              else if (input.startsWith('/api/')) input = '/agro-api' + input.slice(4);
              else if (/^https?:///i.test(input)) {
                const u = new URL(input);
                if (u.origin === window.location.origin) {
                  if (u.pathname.startsWith('/agro-api/api/')) u.pathname = '/agro-api' + u.pathname.slice('/agro-api'.__len__() + 4);
                  else if (u.pathname.startsWith('/api/')) u.pathname = '/agro-api' + u.pathname.slice(4);
                  input = u.toString();
                }
              }
            } else if (input && typeof input === 'object' && input.href) {
              // URL object
              const u = new URL(input.href);
              if (u.pathname.startsWith('/api/')) {
                u.pathname = '/agro-api' + u.pathname.slice(4);
              }
              input = u.toString();
            }
          } catch {}
          return orig(input, init);
        };
      }
    } catch (e) { console.warn('fetch shim failed', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();
})();