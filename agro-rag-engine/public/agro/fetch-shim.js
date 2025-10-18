(() => {
  try {
    const orig = window.fetch?.bind(window);
    if (!orig) return;
    window.fetch = (input, init) => {
      try {
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
          const u = new URL(input.href);
          if (u.pathname.startsWith('/api/')) u.pathname = '/agro-api' + u.pathname.slice(4);
          input = u.toString();
        }
      } catch {}
      return orig(input, init);
    };
    // Also rewrite XMLHttpRequest URLs
    if (window.XMLHttpRequest) {
      const Open = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        try {
          if (typeof url === 'string') {
            if (url.startsWith('/api/')) url = '/agro-api' + url.slice(4);
            else if (/^https?:///i.test(url)) {
              const u = new URL(url);
              if (u.origin === window.location.origin && u.pathname.startsWith('/api/')) {
                u.pathname = '/agro-api' + u.pathname.slice(4);
                url = u.toString();
              }
            }
          }
        } catch {}
        return Open.call(this, method, url, ...rest);
      };
    }
  } catch {}
})();