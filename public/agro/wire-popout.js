(() => {
  const getWorkspaceState = () => (window.AgroApp?.exportState?.() || {});
  const applyWorkspaceState = (state) => { window.AgroApp?.importState?.(state); };
  const onSyncEvent = (ev) => { window.AgroApp?.applyEvent?.(ev); };
  const pop = (window.Popout?.create) ? window.Popout.create({ getState: getWorkspaceState, applyState: applyWorkspaceState, onSyncEvent }) : null;
  if (pop) pop.bootIfPopout();
  function ensureButton(){
    const parent = document.querySelector('.top-actions') || document.querySelector('.topbar') || document.body;
    if (!parent) return;
    let btn = document.querySelector('[data-action="popout"]');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'small-button';
      btn.setAttribute('data-action','popout');
      btn.title = 'Open in a new tab';
      btn.textContent = 'Pop out';
      parent.appendChild(btn);
    }
    btn.addEventListener('click', () => {
      if (!pop) return;
      pop.openPopout({ path: '/agro/index.html' });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureButton);
  } else {
    ensureButton();
  }
})();