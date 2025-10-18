// AGRO GUI - Tabs Module
// Handles main tab navigation, subtab switching, and lazy loading

(function () {
    'use strict';

    // Import utilities
    const { $$, $ } = window.CoreUtils || {};

    if (!$$ || !$) {
        console.error('[tabs.js] CoreUtils not loaded!');
        return;
    }

    // State
    let storageCalculatorLoaded = false;

    /**
     * Lazy load storage calculator when analytics tab is opened
     */
    function loadStorageCalculator() {
        if (storageCalculatorLoaded) return;
        const container = document.getElementById('storage-calculator-container');
        if (!container) return;

        // Load the HTML template
        if (typeof getStorageCalculatorHTML === 'function') {
            container.innerHTML = getStorageCalculatorHTML();

            // Initialize the calculator
            if (typeof initStorageCalculator === 'function') {
                initStorageCalculator();
            }

            storageCalculatorLoaded = true;
        }
    }

    /**
     * Switch to a main tab and its default subtabs
     * @param {string} tabName - Main tab identifier (e.g., 'config', 'data', 'analytics')
     */
    function switchTab(tabName) {
        const groups = {
            start: ['onboarding'],
            dashboard: ['dashboard'],
            chat: ['chat'],
            config: ['config-models'],  // Show only first subtab initially
            data: ['data-indexing'],
            devtools: ['devtools-editor'],  // Show only first subtab initially
            analytics: ['analytics-cost'],  // Show only first subtab initially
            settings: ['settings-general']  // Show only first subtab initially
        };
        const show = groups[tabName] || [tabName];
        $$('.tab-content').forEach(el => el.classList.remove('active'));
        show.forEach(id => { const el = document.getElementById(`tab-${id}`); if (el) el.classList.add('active'); });
        $$('.tab-bar button').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`.tab-bar button[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');

        // Load storage calculator when the tab is opened
        if (tabName === 'analytics') {
            loadStorageCalculator();
        }

        // Initialize onboarding when first opened
        if (tabName === 'start') {
            if (typeof window.ensureOnboardingInit === 'function') {
                window.ensureOnboardingInit();
            }
        }
    }

    /**
     * Bind click handlers to main tab buttons
     */
    function bindTabs() {
        $$('.tab-bar button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchTab(tab);
            });
        });
        const traceBtn = document.getElementById('btn-trace-latest');
        if (traceBtn) {
            traceBtn.addEventListener('click', () => {
                if (typeof window.loadLatestTrace === 'function') {
                    window.loadLatestTrace();
                }
            });
        }
    }

    /**
     * Bind click handlers to subtab buttons
     */
    function bindSubtabs() {
        $$('.subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const subtab = btn.getAttribute('data-subtab');
                const parent = btn.getAttribute('data-parent');

                // Stop editor health check when leaving editor subtab
                const wasEditorActive = document.querySelector('.subtab-btn[data-subtab="devtools-editor"].active');
                if (wasEditorActive && subtab !== 'devtools-editor') {
                    if (typeof window.stopEditorHealthCheck === 'function') {
                        window.stopEditorHealthCheck();
                    }
                }

                // Hide all tabs
                $$('.tab-content').forEach(el => el.classList.remove('active'));

                // Show the selected subtab
                const target = document.getElementById(`tab-${subtab}`);
                if (target) target.classList.add('active');

                // Update button states for this parent group
                $$(`.subtab-btn[data-parent="${parent}"]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Trigger editor health check if editor subtab is activated
                if (subtab === 'devtools-editor') {
                    console.log('[Editor] devtools-editor subtab clicked');
                    if (typeof window.initEditorHealthCheck === 'function') {
                        window.initEditorHealthCheck();
                    } else {
                        console.error('[Editor] initEditorHealthCheck not found!');
                    }
                }
            });
        });
    }

    // Export to window
    window.Tabs = {
        switchTab,
        bindTabs,
        bindSubtabs,
        loadStorageCalculator
    };

    console.log('[tabs.js] Module loaded');
})();
