// AGRO GUI - RAG Tab Navigation
// Handles the mega-tab structure for RAG with subtabs
// Author: AGRO Redesign (Phase 2)

(function() {
    'use strict';

    const { $, $$, events } = window.CoreUtils || {};

    // RAG Subtab mappings to existing content
    const RAG_SUBTAB_MAP = {
        'data-quality': ['config-repos', 'keywords', 'cards'],
        'retrieval': ['config-models', 'config-retrieval'],
        'external-rerankers': ['config-reranking'],
        'learning-ranker': ['reranker'],
        'indexing': ['data-indexing', 'index-profiles'],
        'evaluate': ['devtools-golden', 'devtools-eval']
    };

    // Current subtab state
    let currentSubtab = 'data-quality';
    let currentViewId = null;

    /**
     * Show RAG subtab navigation
     */
    function showRagSubtabs() {
        const subtabBar = $('#rag-subtabs');
        if (subtabBar) {
            subtabBar.style.display = 'flex';
        }
    }

    /**
     * Hide RAG subtab navigation
     */
    function hideRagSubtabs() {
        const subtabBar = $('#rag-subtabs');
        if (subtabBar) {
            subtabBar.style.display = 'none';
        }
    }

    function unmountCurrentRagView() {
        if (!currentViewId) return;
        if (window.NavigationViews) {
            const view = window.NavigationViews[currentViewId];
            if (view && typeof view.unmount === 'function') {
                try {
                    view.unmount();
                } catch (e) {
                    console.warn(`[RAG] Failed to unmount view ${currentViewId}:`, e);
                }
            }
        }
        currentViewId = null;
    }

    function activateRagView(subtabName) {
        const viewId = `rag-${subtabName}`;
        if (currentViewId === viewId) {
            // Already active
            return;
        }

        if (currentViewId && window.NavigationViews) {
            const previous = window.NavigationViews[currentViewId];
            if (previous && typeof previous.unmount === 'function') {
                try {
                    previous.unmount();
                } catch (e) {
                    console.warn(`[RAG] Failed to unmount view ${currentViewId}:`, e);
                }
            }
        }

        currentViewId = viewId;

        if (!window.NavigationViews) return;
        const view = window.NavigationViews[viewId];
        if (view && typeof view.mount === 'function') {
            try {
                view.mount();
            } catch (e) {
                console.error(`[RAG] Failed to mount view ${viewId}:`, e);
            }
        } else {
            console.debug(`[RAG] View ${viewId} not registered yet; will mount on registration.`);
        }
    }

    /**
     * Switch to a RAG subtab
     */
    function switchRagSubtab(subtabName) {
        console.log(`[RAG] Switching to subtab: ${subtabName}`);
        currentSubtab = subtabName;

        if (window.Navigation &&
            typeof window.Navigation.getCurrentTab === 'function' &&
            typeof window.Navigation.getCurrentSubtab === 'function' &&
            typeof window.Navigation.navigateTo === 'function') {
            const currentTab = window.Navigation.getCurrentTab();
            const navSubtab = window.Navigation.getCurrentSubtab();
            if (!(currentTab === 'rag' && navSubtab === subtabName)) {
                window.Navigation.navigateTo('rag', subtabName);
                return;
            }
        }

        // Ensure RAG main tab is visible
        const ragTab = $('#tab-rag');
        if (ragTab) {
            $$('.tab-content').forEach(el => el.classList.remove('active'));
            ragTab.classList.add('active');
        }

        // Update active subtab button
        $$('#rag-subtabs button').forEach(btn => {
            const isActive = btn.getAttribute('data-subtab') === subtabName;
            btn.classList.toggle('active', isActive);
        });

        // Toggle internal RAG content panels
        $$('#tab-rag .rag-subtab-content').forEach(el => el.classList.remove('active'));
        const target = $(`#tab-rag-${subtabName}`);
        if (target) {
            target.classList.add('active');
        } else {
            console.warn(`[RAG] Missing panel for subtab: #tab-rag-${subtabName}`);
        }

        // Emit event
        if (events) {
            events.emit('rag:subtab-change', { subtab: subtabName });
        }

        activateRagView(subtabName);
    }

    /**
     * Handle main tab changes
     */
    function handleTabChange(tabId) {
        if (tabId === 'rag') {
            showRagSubtabs();
            // Ensure RAG container is active and a subtab is selected
            const ragTab = $('#tab-rag');
            if (ragTab) {
                $$('.tab-content').forEach(el => el.classList.remove('active'));
                ragTab.classList.add('active');
            }
            switchRagSubtab(currentSubtab);
        } else {
            unmountCurrentRagView();
            hideRagSubtabs();
        }
        
        // Handle VS Code tab
        if (tabId === 'vscode') {
            if (window.VSCode) {
                window.VSCode.showEditor();
            }
            // Show VS Code content
            const vsCodeTab = $('#tab-vscode');
            if (vsCodeTab) {
                $$('.tab-content').forEach(content => content.classList.remove('active'));
                vsCodeTab.classList.add('active');
            }
        }
        
        // Handle Grafana tab
        if (tabId === 'grafana') {
            if (window.Grafana) {
                window.Grafana.preview();
            }
            // Show Grafana content
            const grafanaTab = $('#tab-metrics');
            if (grafanaTab) {
                $$('.tab-content').forEach(content => content.classList.remove('active'));
                grafanaTab.classList.add('active');
            }
        }
        
        // Handle Profiles tab (was Analytics)
        if (tabId === 'profiles') {
            const profilesTab = $('#tab-analytics-cost');
            if (profilesTab) {
                $$('.tab-content').forEach(content => content.classList.remove('active'));
                profilesTab.classList.add('active');
            }
        }
        
        // Handle Infrastructure tab
        if (tabId === 'infrastructure') {
            const infraTab = $('#tab-settings-docker');
            if (infraTab) {
                $$('.tab-content').forEach(content => content.classList.remove('active'));
                infraTab.classList.add('active');
            }
        }
        
        // Handle Admin tab
        if (tabId === 'admin') {
            const adminTab = $('#tab-settings-general');
            if (adminTab) {
                $$('.tab-content').forEach(content => content.classList.remove('active'));
                adminTab.classList.add('active');
            }
        }
    }

    /**
     * Initialize RAG navigation
     */
    function init() {
        console.log('[RAG] Initializing RAG navigation');
        
        // Listen for navigation changes
        if (events) {
            events.on('nav:tab-change', (data) => {
                handleTabChange(data.tabId);
            });
        }
        
        // Bind RAG subtab clicks
        $$('#rag-subtabs button').forEach(btn => {
            btn.addEventListener('click', () => {
                const subtab = btn.getAttribute('data-subtab');
                if (subtab) {
                    switchRagSubtab(subtab);
                }
            });
        });
        
        // Override tab bar clicks to use Navigation system
        $$('.tab-bar button[data-nav="desktop"][data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const tabId = btn.getAttribute('data-tab');
                if (tabId && window.Navigation) {
                    window.Navigation.navigateTo(tabId);
                }
            });
        });
        
        console.log('[RAG] RAG navigation initialized');
    }

    // Public API
    window.RAGNavigation = {
        showRagSubtabs,
        hideRagSubtabs,
        switchRagSubtab,
        getCurrentSubtab: () => currentSubtab,
        init
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[RAG] RAG Navigation module loaded');
})();
