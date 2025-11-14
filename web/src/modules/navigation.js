// Copied from react/rag-tab-and-modules for React compatibility
// See gui/js/navigation.js for legacy. This module is not loaded by legacy GUI.
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
        compatibilityMode: true,
        featureFlags: {
            NEW_NAVIGATION: false,
            VS_CODE_TAB: true,
            GRAFANA_TAB: true
        }
    };

    function resolveTabId(oldId) {
        if (!navState.compatibilityMode) {
            return oldId;
        }
        oldId = oldId.replace(/^tab-/, '');
        if (TAB_REGISTRY[oldId]) return TAB_REGISTRY[oldId].newId;
        for (const [tabKey, tab] of Object.entries(TAB_REGISTRY)) {
            if (tab.subtabs && tab.subtabs[oldId]) return tab.subtabs[oldId];
        }
        if (NEW_TABS[oldId]) return oldId;
        console.warn(`[Navigation] Unknown tab ID: ${oldId}`);
        return oldId;
    }

    function navigateTo(tabId, subtabId = null) {
        const resolvedTab = resolveTabId(tabId);
        const previousTab = navState.currentTab;
        if (previousTab && previousTab !== resolvedTab && window.NavigationViews && window.NavigationViews[previousTab]) {
            const previousView = window.NavigationViews[previousTab];
            if (previousView.unmount) previousView.unmount();
        }
        navState.currentTab = resolvedTab;
        navState.currentSubtab = subtabId;
        if (navState.history[navState.history.length - 1] !== resolvedTab) {
            navState.history.push(resolvedTab);
            if (navState.history.length > navState.maxHistory) navState.history.shift();
        }
        if (events) {
            events.emit('nav:tab-change', { tabId: resolvedTab, previousTab, subtabId });
            events.emit('tab-switched', { tab: resolvedTab, from: previousTab });
        }
        updateDOMCompatibility(resolvedTab, subtabId);
        updateBreadcrumb([resolvedTab, subtabId].filter(Boolean));
        try {
            localStorage.setItem('nav_current_tab', resolvedTab);
            if (subtabId) localStorage.setItem('nav_current_subtab', subtabId);
        } catch {}
        if (window.NavigationViews && window.NavigationViews[resolvedTab]) {
            const currentView = window.NavigationViews[resolvedTab];
            if (currentView.mount) currentView.mount();
        }
    }

    function updateDOMCompatibility(tabId, subtabId) {
        $$('.tab-content').forEach(el => el.classList.remove('active'));
        const targetContent = $(`#tab-${tabId}`);
        if (targetContent) targetContent.classList.add('active');
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
        $$('.subtab-bar').forEach(el => { el.style.display = 'none'; });
        const showBarSel = barMap[tabId];
        if (showBarSel) {
            const bar = $(showBarSel);
            if (bar) {
                bar.style.display = 'flex';
                if (tabId === 'rag') {
                    const subtabToShow = subtabId || 'data-quality';
                    $$('#tab-rag .rag-subtab-content').forEach(el => el.classList.remove('active'));
                    const firstSubtab = $(`#tab-rag-${subtabToShow}`);
                    if (firstSubtab) firstSubtab.classList.add('active');
                    try {
                        $(`${showBarSel} button.active`)?.classList.remove('active');
                        const btn = $(`${showBarSel} button[data-subtab="${subtabToShow}"]`);
                        if (btn) btn.classList.add('active');
                    } catch {}
                }
            }
        }
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
                        bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        const container = $(`#tab-${parent}`);
                        if (container) {
                            const sections = container.querySelectorAll('.section-subtab');
                            if (sections && sections.length) {
                                sections.forEach(s => s.classList.remove('active'));
                                const tgt = $(`#tab-${parent}-${sub}`);
                                if (tgt) {
                                    tgt.classList.add('active');
                                    return;
                                }
                            }
                        }
                        const anchor = $(`#${parent}-${sub}-anchor`) || $(`#${sub}-anchor`);
                        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                }
            }
        } catch {}
        $$('.tab-bar button, nav.tabs button').forEach(el => el.classList.remove('active'));
        const newTabButton = $(`.tab-bar button[data-tab="${tabId}"]`);
        if (newTabButton) newTabButton.classList.add('active');
        const oldTabButton = $(`nav.tabs button[data-tab="${tabId}"]`);
        if (oldTabButton) oldTabButton.classList.add('active');
    }

    function updateBreadcrumb(items) {
        const breadcrumb = $('#nav-breadcrumb');
        if (!breadcrumb) return;
        const trail = items.map(item => {
            const tab = NEW_TABS[item] || TAB_REGISTRY[item];
            return tab ? tab.title || item : item;
        }).join(' › ');
        breadcrumb.textContent = trail;
    }

    function registerView(config) {
        if (!window.NavigationViews) window.NavigationViews = {};
        window.NavigationViews[config.id] = config;
        if (navState.currentTab === config.id || navState.currentSubtab === config.id) {
            if (config.mount) config.mount();
        }
    }

    function showPanel(panelId) {
        if (panelId === 'vscode') navigateTo('vscode');
        else if (panelId === 'grafana') navigateTo('grafana');
    }
    function hidePanel(panelId) {
        if (navState.currentTab === panelId) navigateTo('dashboard');
    }
    function getCurrentTab() { return navState.currentTab; }
    function getCurrentSubtab() { return navState.currentSubtab; }

    function init() {
        const newNavEnabled = localStorage.getItem('AGRO_NEW_IA') === '1';
        navState.featureFlags.NEW_NAVIGATION = newNavEnabled;
        navState.compatibilityMode = !newNavEnabled;
        try {
            const lastTab = localStorage.getItem('nav_current_tab');
            const lastSubtab = localStorage.getItem('nav_current_subtab');
            if (lastTab && NEW_TABS[lastTab]) {
                navState.currentTab = lastTab;
                navState.currentSubtab = lastSubtab;
            }
        } catch {}
        if (!window.switchTab_original) {
            window.switchTab_original = window.switchTab;
            window.switchTab = function(tabId) { navigateTo(tabId); };
        }
        try { navigateTo(navState.currentTab, navState.currentSubtab); } catch (e) {}
    }

    window.Navigation = {
        navigateTo,
        getCurrentTab,
        getCurrentSubtab,
        registerView,
        showPanel,
        hidePanel,
        isPanelVisible: (panelId) => navState.currentTab === panelId,
        updateBreadcrumb,
        resolveTabId,
        aliasTab: (oldId, newId) => { TAB_REGISTRY[oldId] = { newId, title: newId }; },
        setCompatibilityMode: (enabled) => {
            navState.compatibilityMode = enabled;
            localStorage.setItem('AGRO_NEW_IA', enabled ? '0' : '1');
        },
        isCompatibilityMode: () => navState.compatibilityMode,
        getState: () => ({ ...navState }),
        getRegistry: () => ({ ...TAB_REGISTRY }),
        getNewTabs: () => ({ ...NEW_TABS })
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

