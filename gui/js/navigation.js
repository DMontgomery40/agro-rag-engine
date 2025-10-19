// AGRO GUI - Navigation System
// New navigation with tab registry and compatibility layer for safe migration
// Author: AGRO Redesign (Phase 1)

(function() {
    'use strict';

    const { $, $$, events, state } = window.CoreUtils || {};

    // Tab Registry - Maps old IDs to new structure
    const TAB_REGISTRY = {
        // Current tabs that stay the same
        'dashboard': { 
            newId: 'dashboard', 
            title: '📊 Dashboard',
            icon: '📊',
            order: 2
        },
        'chat': { 
            newId: 'chat', 
            title: '💬 Chat',
            icon: '💬',
            order: 3
        },
        
        // Promoted tabs
        'devtools': {
            newId: 'vscode',
            title: '📝 VS Code',
            icon: '📝',
            order: 4,
            redirect: 'devtools-editor'
        },
        'metrics': {
            newId: 'grafana',
            title: '📈 Grafana',
            icon: '📈',
            order: 5
        },
        
        // New organization
        'start': {
            newId: 'start',
            title: '🚀 Get Started',
            icon: '🚀',
            order: 1
        },
        'config': {
            newId: 'rag',
            title: '🧠 RAG',
            icon: '🧠',
            order: 6,
            subtabs: {
                'config-models': 'rag-retrieval',
                'config-retrieval': 'rag-retrieval',
                'config-infra': 'infrastructure',
                'config-repos': 'rag-data-quality'
            }
        },
        'data': {
            newId: 'rag',
            title: '🧠 RAG',
            icon: '🧠',
            order: 6,
            subtabs: {
                'data-indexing': 'rag-indexing'
            }
        },
        'reranker': {
            newId: 'rag',
            title: '🧠 RAG',
            icon: '🧠',
            order: 6,
            redirect: 'rag-learning-ranker'
        },
        'analytics': {
            newId: 'profiles',
            title: '💾 Profiles',
            icon: '💾',
            order: 7,
            subtabs: {
                'analytics-cost': 'profiles-budget',
                'analytics-performance': 'infrastructure-monitoring',
                'analytics-usage': 'infrastructure-monitoring',
                'analytics-tracing': 'infrastructure-monitoring'
            }
        },
        'settings': {
            newId: 'admin',
            title: '⚙️ Admin',
            icon: '⚙️',
            order: 9,
            subtabs: {
                'settings-general': 'admin-general',
                'settings-docker': 'infrastructure-docker',
                'settings-integrations': 'admin-integrations',
                'settings-profiles': 'profiles-management',
                'settings-secrets': 'admin-secrets'
            }
        }
    };

    // New tab structure definition
    const NEW_TABS = {
        'start': {
            title: '🚀 Get Started',
            order: 1,
            subtabs: []
        },
        'dashboard': {
            title: '📊 Dashboard',
            order: 2,
            subtabs: []
        },
        'chat': {
            title: '💬 Chat',
            order: 3,
            subtabs: []
        },
        'vscode': {
            title: '📝 VS Code',
            order: 4,
            subtabs: []
        },
        'grafana': {
            title: '📈 Grafana',
            order: 5,
            subtabs: []
        },
        'rag': {
            title: '🧠 RAG',
            order: 6,
            subtabs: [
                { id: 'data-quality', title: 'Data Quality' },
                { id: 'retrieval', title: 'Retrieval' },
                { id: 'external-rerankers', title: 'External Rerankers' },
                { id: 'learning-ranker', title: 'Learning Ranker' },
                { id: 'indexing', title: 'Indexing' },
                { id: 'evaluate', title: 'Evaluate' }
            ]
        },
        'profiles': {
            title: '💾 Profiles',
            order: 7,
            subtabs: [
                { id: 'budget', title: 'Budget Calculator' },
                { id: 'management', title: 'Profile Management' },
                { id: 'overrides', title: 'Channel Overrides' }
            ]
        },
        'infrastructure': {
            title: '🔧 Infrastructure',
            order: 8,
            subtabs: [
                { id: 'services', title: 'Services' },
                { id: 'mcp', title: 'MCP Servers' },
                { id: 'paths', title: 'Paths & Stores' },
                { id: 'monitoring', title: 'Monitoring' }
            ]
        },
        'admin': {
            title: '⚙️ Admin',
            order: 9,
            subtabs: [
                { id: 'general', title: 'General' },
                { id: 'git', title: 'Git Integration' },
                { id: 'secrets', title: 'Secrets' },
                { id: 'integrations', title: 'Integrations' }
            ]
        }
    };

    // Navigation state
    const navState = {
        currentTab: 'dashboard',
        currentSubtab: null,
        history: [],
        maxHistory: 10,
        compatibilityMode: true,  // Start in compatibility mode
        featureFlags: {
            NEW_NAVIGATION: false,  // Will be true when ready
            VS_CODE_TAB: true,
            GRAFANA_TAB: true
        }
    };

    /**
     * Resolve old tab ID to new structure
     */
    function resolveTabId(oldId) {
        if (!navState.compatibilityMode) {
            return oldId;
        }

        // Strip 'tab-' prefix if present
        oldId = oldId.replace(/^tab-/, '');

        // Direct mapping
        if (TAB_REGISTRY[oldId]) {
            return TAB_REGISTRY[oldId].newId;
        }

        // Check subtab mappings
        for (const [tabKey, tab] of Object.entries(TAB_REGISTRY)) {
            if (tab.subtabs && tab.subtabs[oldId]) {
                return tab.subtabs[oldId];
            }
        }

        // Check if it's already a new ID
        if (NEW_TABS[oldId]) {
            return oldId;
        }

        console.warn(`[Navigation] Unknown tab ID: ${oldId}`);
        return oldId;
    }

    /**
     * Navigate to a tab (with compatibility)
     */
    function navigateTo(tabId, subtabId = null) {
        const resolvedTab = resolveTabId(tabId);
        const previousTab = navState.currentTab;

        // Call unmount on previous view
        if (previousTab && previousTab !== resolvedTab && window.NavigationViews && window.NavigationViews[previousTab]) {
            const previousView = window.NavigationViews[previousTab];
            if (previousView.unmount) {
                console.log(`[Navigation] Unmounting view: ${previousTab}`);
                previousView.unmount();
            }
        }

        // Update state
        navState.currentTab = resolvedTab;
        navState.currentSubtab = subtabId;

        // Add to history
        if (navState.history[navState.history.length - 1] !== resolvedTab) {
            navState.history.push(resolvedTab);
            if (navState.history.length > navState.maxHistory) {
                navState.history.shift();
            }
        }

        // Emit events for compatibility
        if (events) {
            // New event
            events.emit('nav:tab-change', {
                tabId: resolvedTab,
                previousTab,
                subtabId
            });

            // Old event for compatibility
            events.emit('tab-switched', {
                tab: resolvedTab,
                from: previousTab
            });
        }

        // Update DOM (compatibility mode)
        if (navState.compatibilityMode) {
            updateDOMCompatibility(resolvedTab, subtabId);
        } else {
            updateDOMNew(resolvedTab, subtabId);
        }

        // Update breadcrumb
        updateBreadcrumb([resolvedTab, subtabId].filter(Boolean));

        // Store in localStorage
        try {
            localStorage.setItem('nav_current_tab', resolvedTab);
            if (subtabId) {
                localStorage.setItem('nav_current_subtab', subtabId);
            }
        } catch (e) {
            // Ignore localStorage errors
        }

        // Call mount on new view
        if (window.NavigationViews && window.NavigationViews[resolvedTab]) {
            const currentView = window.NavigationViews[resolvedTab];
            if (currentView.mount) {
                console.log(`[Navigation] Mounting view: ${resolvedTab}`);
                currentView.mount();
            }
        }

        console.log(`[Navigation] Navigated to: ${resolvedTab}${subtabId ? '/' + subtabId : ''}`);
    }

    /**
     * Update DOM in compatibility mode (works with existing HTML)
     * NOTE: Do NOT call window.Tabs.switchTab() or window.switchTab() - that causes infinite recursion
     */
    function updateDOMCompatibility(tabId, subtabId) {
        console.log(`[navigation.js] updateDOMCompatibility called: tab=${tabId}, subtab=${subtabId}`);

        // NO MAPPING NEEDED - all new tab divs use their direct IDs
        // Old compatibility mappings removed - new structure is canonical
        const domTabId = tabId;

        // Manual DOM manipulation (DO NOT delegate to tabs.js to avoid recursion)
        // 1. Hide all tab content
        $$('.tab-content').forEach(el => el.classList.remove('active'));
        console.log(`[navigation.js] Hid all tab content`);

        // 2. Show target content
        const targetContent = $(`#tab-${domTabId}`);
        console.log(`[navigation.js] Looking for #tab-${domTabId}, found: ${!!targetContent}`);
        if (targetContent) {
            console.log(`[navigation.js] Setting .active on #tab-${domTabId}`);
            targetContent.classList.add('active');
            console.log(`[navigation.js] Tab is now active: ${targetContent.classList.contains('active')}`);
            console.log(`[navigation.js] Tab visible height: ${targetContent.offsetHeight}px`);
        } else {
            console.error(`[navigation.js] ERROR: Could not find #tab-${domTabId}`);
        }

        // 2.5 Handle RAG subtabs visibility
        // Handle subtab bars for all tabs uniformly
        const barMap = {
            'dashboard': '#dashboard-subtabs',
            'chat': '#chat-subtabs',
            'vscode': '#vscode-subtabs',
            'grafana': '#grafana-subtabs',
            'rag': '#rag-subtabs',
            'profiles': '#profiles-subtabs',
            'infrastructure': '#infrastructure-subtabs',
            'admin': '#admin-subtabs'
        };
        // Hide all bars first
        $$('.subtab-bar').forEach(el => { el.style.display = 'none'; });
        const showBarSel = barMap[domTabId];
        if (showBarSel) {
            const bar = $(showBarSel);
            if (bar) {
                bar.style.display = 'flex';
                // If RAG, also ensure one subtab content is active
                if (domTabId === 'rag') {
                    const subtabToShow = subtabId || 'data-quality';
                    $$('#tab-rag .rag-subtab-content').forEach(el => el.classList.remove('active'));
                    const firstSubtab = $(`#tab-rag-${subtabToShow}`);
                    if (firstSubtab) firstSubtab.classList.add('active');
                    try {
                        $(`${showBarSel} button.active`)?.classList.remove('active');
                        const btn = $(`${showBarSel} button[data-subtab="${subtabToShow}"]`);
                        if (btn) btn.classList.add('active');
                    } catch {}
                } else if (domTabId === 'chat') {
                    // Default Chat to Interface
                    $$('#tab-chat .section-subtab').forEach(el => el.classList.remove('active'));
                    $('#tab-chat-ui')?.classList.add('active');
                    try {
                        $(`${showBarSel} button.active`)?.classList.remove('active');
                        $(`${showBarSel} button[data-subtab="chat-ui"]`)?.classList.add('active');
                    } catch {}
                } else if (domTabId === 'grafana') {
                    // Default Grafana to Dashboard
                    $$('#tab-grafana .section-subtab').forEach(el => el.classList.remove('active'));
                    $('#tab-grafana-dashboard')?.classList.add('active');
                    try {
                        $(`${showBarSel} button.active`)?.classList.remove('active');
                        $(`${showBarSel} button[data-subtab="dashboard"]`)?.classList.add('active');
                    } catch {}
                } else if (domTabId === 'profiles') {
                    // Default Profiles to Budget
                    $$('#tab-profiles .section-subtab').forEach(el => el.classList.remove('active'));
                    $('#tab-profiles-budget')?.classList.add('active');
                    try {
                        $(`${showBarSel} button.active`)?.classList.remove('active');
                        $(`${showBarSel} button[data-subtab="budget"]`)?.classList.add('active');
                    } catch {}
                }
            }
        }

        // Bind subtab buttons for this bar (once)
        try {
            if (showBarSel) {
                const bar = $(showBarSel);
                if (bar && !bar.dataset.bound) {
                    bar.dataset.bound = '1';
                    bar.addEventListener('click', async (ev) => {
                        const btn = ev.target.closest('button.subtab-btn');
                        if (!btn) return;
                        const sub = btn.getAttribute('data-subtab');
                        const parent = showBarSel.replace('#','').replace('-subtabs','');
                        // Update active button
                        bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        // Toggle by convention: #tab-{parent}-{sub}
                        const container = $(`#tab-${parent}`);
                        if (container) {
                            const sections = container.querySelectorAll('.section-subtab');
                            if (sections && sections.length) {
                                sections.forEach(s => s.classList.remove('active'));
                                const tgt = $(`#tab-${parent}-${sub}`);
                                if (tgt) {
                                    tgt.classList.add('active');
                                    if (parent === 'grafana' && sub === 'dashboard') {
                                        const emb = $('#grafana-embed'); if (emb) emb.style.display = '';
                                    }
                                    return;
                                }
                            }
                        }
                        // Special cross-tab routes per spec
                        if (parent === 'vscode' && sub === 'editor-settings') {
                            if (window.Navigation) {
                                window.Navigation.navigateTo('admin');
                                setTimeout(()=>{ const a = $('#admin-editor-settings-anchor'); if (a) a.scrollIntoView({behavior:'smooth'}); }, 50);
                            }
                            return;
                        }
                        if (parent === 'infrastructure' && sub === 'mcp') {
                            if (window.Navigation) {
                                window.Navigation.navigateTo('admin');
                                setTimeout(()=>{ const a = $('#admin-integrations-anchor'); if (a) a.scrollIntoView({behavior:'smooth'}); }, 50);
                            }
                            return;
                        }
                        if (parent === 'admin' && sub === 'git') {
                            if (window.Navigation) {
                                window.Navigation.navigateTo('infrastructure');
                                setTimeout(()=>{ const a = $('#infra-git-hooks-anchor'); if (a) a.scrollIntoView({behavior:'smooth'}); }, 50);
                            }
                            return;
                        }
                        // Fallback: scroll to anchor within the same tab
                        const anchor = $(`#${parent}-${sub}-anchor`) || $(`#${sub}-anchor`);
                        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                }
            }
        } catch {}

        // 3. Update button states in both old and new tab bars
        $$('.tab-bar button, nav.tabs button').forEach(el => el.classList.remove('active'));

        // 4. Activate button in new tab bar
        const newTabButton = $(`.tab-bar button[data-tab="${tabId}"]`);
        if (newTabButton) {
            newTabButton.classList.add('active');
        }

        // 5. Activate button in old tab bar (compatibility)
        const oldTabButton = $(`nav.tabs button[data-tab="${domTabId}"]`);
        if (oldTabButton) {
            oldTabButton.classList.add('active');
        }
    }

    /**
     * Update DOM in new navigation mode (future)
     */
    function updateDOMNew(tabId, subtabId) {
        // This will be implemented when we create the new HTML structure
        console.log(`[Navigation] New mode navigation to ${tabId}/${subtabId} (not yet implemented)`);
    }

    /**
     * Update breadcrumb trail
     */
    function updateBreadcrumb(items) {
        const breadcrumb = $('#nav-breadcrumb');
        if (!breadcrumb) return;

        const trail = items.map(item => {
            const tab = NEW_TABS[item] || TAB_REGISTRY[item];
            return tab ? tab.title || item : item;
        }).join(' › ');

        breadcrumb.textContent = trail;
    }

    /**
     * Register a view (for modules to register themselves)
     */
    function registerView(config) {
        console.log('[Navigation] View registered:', config.id);
        
        // Store view configuration for future use
        if (!window.NavigationViews) {
            window.NavigationViews = {};
        }
        
        window.NavigationViews[config.id] = config;

        // If this view is currently active, mount it
        if (navState.currentTab === config.id || 
            navState.currentSubtab === config.id) {
            if (config.mount) {
                config.mount();
            }
        }
    }

    /**
     * Show/hide special panels (VS Code, Grafana)
     */
    function showPanel(panelId) {
        if (panelId === 'vscode') {
            navigateTo('vscode');
        } else if (panelId === 'grafana') {
            navigateTo('grafana');
        }
    }

    function hidePanel(panelId) {
        // Navigate away from the panel
        if (navState.currentTab === panelId) {
            navigateTo('dashboard');
        }
    }

    /**
     * Get current navigation state
     */
    function getCurrentTab() {
        return navState.currentTab;
    }

    function getCurrentSubtab() {
        return navState.currentSubtab;
    }

    /**
     * Initialize navigation system
     */
    function init() {
        console.log('[Navigation] Initializing navigation system');

        // Check feature flags
        const newNavEnabled = localStorage.getItem('AGRO_NEW_IA') === '1';
        navState.featureFlags.NEW_NAVIGATION = newNavEnabled;
        navState.compatibilityMode = !newNavEnabled;

        // Restore last tab from localStorage
        try {
            const lastTab = localStorage.getItem('nav_current_tab');
            const lastSubtab = localStorage.getItem('nav_current_subtab');
            if (lastTab && NEW_TABS[lastTab]) {
                navState.currentTab = lastTab;
                navState.currentSubtab = lastSubtab;
            }
        } catch (e) {
            // Ignore localStorage errors
        }

        // Set up compatibility aliases for old code
        if (!window.switchTab_original) {
            window.switchTab_original = window.switchTab;
            window.switchTab = function(tabId) {
                navigateTo(tabId);
            };
        }

        // Ensure DOM reflects current tab on first load (sets RAG subtab visibility correctly)
        try {
            navigateTo(navState.currentTab, navState.currentSubtab);
        } catch (e) {
            console.warn('[Navigation] Initial navigate failed:', e);
        }

        console.log('[Navigation] Initialized in ' + 
                    (navState.compatibilityMode ? 'compatibility' : 'new') + ' mode');
    }

    // Public API
    window.Navigation = {
        // Core navigation
        navigateTo,
        getCurrentTab,
        getCurrentSubtab,
        
        // View registration
        registerView,
        
        // Panel management
        showPanel,
        hidePanel,
        isPanelVisible: (panelId) => navState.currentTab === panelId,
        
        // Breadcrumb
        updateBreadcrumb,
        
        // Compatibility
        resolveTabId,
        aliasTab: (oldId, newId) => {
            TAB_REGISTRY[oldId] = { newId, title: newId };
        },
        
        // Configuration
        setCompatibilityMode: (enabled) => {
            navState.compatibilityMode = enabled;
            localStorage.setItem('AGRO_NEW_IA', enabled ? '0' : '1');
        },
        isCompatibilityMode: () => navState.compatibilityMode,
        
        // Debugging
        getState: () => ({ ...navState }),
        getRegistry: () => ({ ...TAB_REGISTRY }),
        getNewTabs: () => ({ ...NEW_TABS })
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Navigation] Module loaded - use window.Navigation for navigation API');
})();

