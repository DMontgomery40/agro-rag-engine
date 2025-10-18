// AGRO DOM DIAGNOSTICS - Paste this into browser console at http://127.0.0.1:8012

console.log("=== CONTENT CHECK ===");
const tabs = ['start', 'dashboard', 'chat', 'vscode', 'grafana', 'rag', 'profiles', 'infrastructure', 'admin'];
tabs.forEach(id => {
  const el = document.getElementById('tab-' + id);
  if (!el) {
    console.log(`%ctab-${id}: ✗ NOT FOUND`, 'color: red');
  } else {
    const size = el.innerHTML.length;
    const visible = el.offsetHeight > 0;
    const active = el.classList.contains('active');
    const display = window.getComputedStyle(el).display;
    console.log(`%ctab-${id}: ${size > 0 ? '✓ ' + size.toLocaleString() + ' chars' : '✗ EMPTY'} | Visible: ${visible ? 'YES' : 'NO'} | Active: ${active ? 'YES' : 'NO'} | Display: ${display}`, size > 0 ? 'color: green' : 'color: red');
  }
});

console.log("\n=== ACTIVE TAB ===");
const active = document.querySelector('.tab-content.active');
if (active) {
  console.log('%cActive tab ID: ' + active.id, 'color: green');
  console.log('%cActive tab content length: ' + active.innerHTML.length.toLocaleString() + ' chars', 'color: green');
  console.log('%cActive tab visible: ' + (active.offsetHeight > 0 ? 'YES' : 'NO'), active.offsetHeight > 0 ? 'color: green' : 'color: red');
  console.log('%cActive tab display: ' + window.getComputedStyle(active).display, 'color: yellow');
} else {
  console.log('%cNO ACTIVE TAB FOUND!', 'color: red; font-weight: bold');
}

console.log("\n=== TAB BUTTONS ===");
const buttons = document.querySelectorAll('[data-tab]');
console.log('%cTotal buttons: ' + buttons.length, 'color: green');
buttons.forEach(btn => {
  const tabId = btn.getAttribute('data-tab');
  const isActive = btn.classList.contains('active');
  console.log(`%cButton: ${tabId} - Active: ${isActive ? 'YES' : 'NO'}`, isActive ? 'color: green' : 'color: gray');
});

console.log("\n=== CSS CLASSES ===");
const allTabContents = document.querySelectorAll('.tab-content');
console.log('%cTotal .tab-content divs: ' + allTabContents.length, 'color: green');

console.log("\n=== CHECKING tabs.js ===");
const tabsLoaded = typeof window.Tabs !== 'undefined';
console.log('%cwindow.Tabs exists: ' + tabsLoaded, tabsLoaded ? 'color: green' : 'color: red');
if (tabsLoaded) {
  console.log('%cwindow.Tabs methods: ' + Object.keys(window.Tabs).join(', '), 'color: yellow');
}

console.log("\n=== CSS INSPECTION ===");
const style = document.createElement('style');
console.log('%cChecking .tab-content CSS rules...', 'color: cyan');
const sheets = Array.from(document.styleSheets);
sheets.forEach((sheet, idx) => {
  try {
    const rules = Array.from(sheet.cssRules || sheet.rules);
    rules.forEach(rule => {
      if (rule.selectorText && rule.selectorText.includes('tab-content')) {
        console.log('%cSheet ' + idx + ': ' + rule.selectorText + ' { ' + rule.style.cssText + ' }', 'color: yellow');
      }
    });
  } catch (e) {
    console.log('%cSheet ' + idx + ': Cannot access (CORS)', 'color: gray');
  }
});

console.log("\n=== TESTING TAB SWITCH ===");
const dashboardBtn = document.querySelector('[data-tab="dashboard"]');
if (dashboardBtn) {
  console.log('%cFound dashboard button, clicking...', 'color: cyan');
  dashboardBtn.click();

  setTimeout(() => {
    const dashboard = document.getElementById('tab-dashboard');
    console.log('%cAfter clicking dashboard:', 'color: cyan');
    console.log('  Button .active: %c' + dashboardBtn.classList.contains('active'), dashboardBtn.classList.contains('active') ? 'color: green' : 'color: red');
    console.log('  Div .active: %c' + (dashboard?.classList.contains('active')), dashboard?.classList.contains('active') ? 'color: green' : 'color: red');
    console.log('  Div visible: %c' + (dashboard?.offsetHeight > 0), dashboard?.offsetHeight > 0 ? 'color: green' : 'color: red');
    console.log('  Div height: %c' + (dashboard?.offsetHeight || 0) + 'px', 'color: yellow');
    console.log('  Div display: %c' + window.getComputedStyle(dashboard).display, 'color: yellow');

    // Try chat too
    const chatBtn = document.querySelector('[data-tab="chat"]');
    if (chatBtn) {
      console.log('\n%cNow clicking chat button...', 'color: cyan');
      chatBtn.click();

      setTimeout(() => {
        const chat = document.getElementById('tab-chat');
        console.log('%cAfter clicking chat:', 'color: cyan');
        console.log('  Button .active: %c' + chatBtn.classList.contains('active'), chatBtn.classList.contains('active') ? 'color: green' : 'color: red');
        console.log('  Div .active: %c' + (chat?.classList.contains('active')), chat?.classList.contains('active') ? 'color: green' : 'color: red');
        console.log('  Div visible: %c' + (chat?.offsetHeight > 0), chat?.offsetHeight > 0 ? 'color: green' : 'color: red');
        console.log('  Div height: %c' + (chat?.offsetHeight || 0) + 'px', 'color: yellow');
        console.log('  Div display: %c' + window.getComputedStyle(chat).display, 'color: yellow');
      }, 100);
    }
  }, 100);
} else {
  console.log('%cDashboard button not found!', 'color: red; font-weight: bold');
}

console.log("\n%c=== DIAGNOSTICS COMPLETE ===", 'color: cyan; font-weight: bold; font-size: 16px');
console.log("%cWait 500ms for async results...", 'color: gray');
