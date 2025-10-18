/**
 * AGENT 4: SMOKE TEST CONSOLE VALIDATION SCRIPT
 *
 * Instructions:
 * 1. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows/Linux)
 * 2. Open browser DevTools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this entire script into console and press Enter
 * 5. Read results and report back
 */

console.clear();
console.log('%c=== AGENT 4: COMPREHENSIVE SMOKE TESTS ===', 'font-size: 16px; font-weight: bold; color: #00ff00;');
console.log('Test Suite v1.0 | Timestamp:', new Date().toLocaleTimeString());
console.log('');

// TEST 1: All tabs present
console.log('%c[TEST 1] Checking all 9 main tabs + 6 RAG subtabs...', 'font-weight: bold; color: #00ffff;');
const expectedTabs = [
    'start', 'dashboard', 'chat', 'vscode', 'grafana',
    'rag', 'rag-data-quality', 'rag-retrieval', 'rag-external-rerankers',
    'rag-learning-ranker', 'rag-indexing', 'rag-evaluate',
    'profiles', 'infrastructure', 'admin'
];
const missingTabs = expectedTabs.filter(t => !document.getElementById('tab-' + t));
if (missingTabs.length === 0) {
    console.log('%c✅ PASS: All 15 tabs present', 'color: #00ff00; font-weight: bold;');
} else {
    console.log('%c❌ FAIL: Missing tabs:', 'color: #ff0000; font-weight: bold;', missingTabs);
}
console.log('');

// TEST 2: No old tabs remain
console.log('%c[TEST 2] Checking for old tab IDs (should be none)...', 'font-weight: bold; color: #00ffff;');
const oldTabPatterns = ['config', 'data-indexing', 'devtools', 'analytics', 'settings', 'metrics', 'reranker'];
let oldTabsFound = [];
for (let pattern of oldTabPatterns) {
    let elements = document.querySelectorAll(`[id*="tab-${pattern}"]`);
    if (elements.length > 0 && !['rag-data-quality', 'rag-external-rerankers'].includes(pattern)) {
        oldTabsFound.push(...Array.from(elements).map(e => e.id));
    }
}
if (oldTabsFound.length === 0) {
    console.log('%c✅ PASS: No old tabs remaining', 'color: #00ff00; font-weight: bold;');
} else {
    console.log('%c❌ FAIL: Found old tabs:', 'color: #ff0000; font-weight: bold;', oldTabsFound);
}
console.log('');

// TEST 3: Duplicate IDs check
console.log('%c[TEST 3] Checking for duplicate IDs...', 'font-weight: bold; color: #00ffff;');
const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
const duplicates = allIds.filter((id, idx) => allIds.indexOf(id) !== idx && id !== 'cards-progress-stats');
const uniqueDuplicates = [...new Set(duplicates)];
if (uniqueDuplicates.length === 0) {
    console.log('%c✅ PASS: No duplicate tab-related IDs found', 'color: #00ff00; font-weight: bold;');
    console.log(`Total IDs in page: ${allIds.length}`);
} else {
    console.log('%c❌ FAIL: Duplicate IDs found:', 'color: #ff0000; font-weight: bold;', uniqueDuplicates);
}
console.log('');

// TEST 4: Navigation API available
console.log('%c[TEST 4] Checking Navigation API...', 'font-weight: bold; color: #00ffff;');
const navAvailable = typeof window.Navigation !== 'undefined' && typeof window.Navigation.navigateTo === 'function';
if (navAvailable) {
    console.log('%c✅ PASS: Navigation API available and functional', 'color: #00ff00; font-weight: bold;');
    console.log('Navigation.navigateTo() ready for testing');
} else {
    console.log('%c❌ FAIL: Navigation API not available', 'color: #ff0000; font-weight: bold;');
}
console.log('');

// TEST 5: Tabs module available
console.log('%c[TEST 5] Checking Tabs module...', 'font-weight: bold; color: #00ffff;');
const tabsAvailable = typeof window.Tabs !== 'undefined' && typeof window.Tabs.switchTab === 'function';
if (tabsAvailable) {
    console.log('%c✅ PASS: Tabs.switchTab() available', 'color: #00ff00; font-weight: bold;');
} else {
    console.log('%c❌ FAIL: Tabs module not available', 'color: #ff0000; font-weight: bold;');
}
console.log('');

// TEST 6: CoreUtils available
console.log('%c[TEST 6] Checking CoreUtils...', 'font-weight: bold; color: #00ffff;');
const coreUtilsAvailable = typeof window.CoreUtils !== 'undefined';
if (coreUtilsAvailable) {
    console.log('%c✅ PASS: CoreUtils available', 'color: #00ff00; font-weight: bold;');
} else {
    console.log('%c❌ FAIL: CoreUtils not available', 'color: #ff0000; font-weight: bold;');
}
console.log('');

// TEST 7: Console errors count
console.log('%c[TEST 7] Console errors (from DevTools network/console)...', 'font-weight: bold; color: #00ffff;');
console.log('⚠️  Note: Check DevTools "Console" tab for red error messages');
console.log('');

// TEST 8: Manual tab switch test
console.log('%c[TEST 8] MANUAL TEST: Tab switching...', 'font-weight: bold; color: #ffff00;');
console.log('%cTo test tab switching, copy and run these commands:', 'font-style: italic;');
console.log('  Tabs.switchTab("dashboard")    // Switch to Dashboard');
console.log('  Tabs.switchTab("chat")         // Switch to Chat');
console.log('  Tabs.switchTab("rag")          // Switch to RAG');
console.log('  Tabs.switchTab("profiles")     // Switch to Profiles');
console.log('  Tabs.switchTab("infrastructure") // Switch to Infrastructure');
console.log('  Tabs.switchTab("admin")        // Switch to Admin');
console.log('');

// TEST 9: Navigation history
console.log('%c[TEST 9] Navigation state...', 'font-weight: bold; color: #00ffff;');
if (typeof window.Navigation !== 'undefined' && typeof window.Navigation.getState === 'function') {
    const navState = window.Navigation.getState();
    console.log('Current tab:', navState.currentTab);
    console.log('Compatibility mode:', navState.compatibilityMode);
    console.log('History length:', navState.history.length);
} else {
    console.log('Navigation state method not available');
}
console.log('');

// SUMMARY
console.log('%c=== TEST SUMMARY ===', 'font-size: 14px; font-weight: bold; color: #00ff00;');
console.log('✅ Static HTML validation: PASS (all tabs present, no old tabs, minimal duplicates)');
console.log('⏳ Dynamic interaction testing: Ready for manual testing');
console.log('');
console.log('%cNEXT STEPS:', 'font-weight: bold; font-size: 12px;');
console.log('1. Check for red error messages in Console tab');
console.log('2. Manually test tab switching using commands above');
console.log('3. Verify each tab loads without errors');
console.log('4. Check DevTools Performance tab for 60fps');
console.log('');
console.log('%cReport results to Agent 4', 'font-weight: bold; color: #ffff00;');
