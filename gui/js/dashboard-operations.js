/**
 * AGRO Dashboard Operations
 * Handles Generate Keywords, Run Indexer, Run Eval operations
 * with streaming terminal output and metrics
 */

(function() {
    'use strict';

    const api = (window.CoreUtils && window.CoreUtils.api) ? window.CoreUtils.api : (p => p);
    let liveTerminal = null;
    let operationInProgress = false;

    class DashboardOperations {
        constructor() {
            this.loadRerankerOptions(); // Load dynamic reranker options first
            this.setupEventListeners();
            this.initMetrics();
        }

        /**
         * Load available reranker options from API and populate dropdown
         */
        async loadRerankerOptions() {
            try {
                const response = await fetch(api('/api/reranker/available'));
                if (!response.ok) {
                    console.error('[DashboardOperations] Failed to load reranker options');
                    return;
                }

                const data = await response.json();
                const dropdown = document.getElementById('dash-eval-dropdown');
                if (!dropdown || !data.options || data.options.length === 0) {
                    return;
                }

                // Find the header and preserve it
                const header = dropdown.querySelector('div[style*="border-bottom"]');

                // Clear existing buttons (but keep header)
                const existingButtons = dropdown.querySelectorAll('.eval-model-btn');
                existingButtons.forEach(btn => btn.remove());

                // Add buttons for each available option
                data.options.forEach((option, index) => {
                    const button = document.createElement('button');
                    button.className = 'eval-model-btn';
                    button.setAttribute('data-model', option.id);
                    button.setAttribute('data-backend', option.backend);
                    button.style.cssText = `
                        width: 100%;
                        padding: 10px 12px;
                        background: transparent;
                        border: none;
                        text-align: left;
                        cursor: pointer;
                        color: var(--fg);
                        font-size: 12px;
                        ${index < data.options.length - 1 ? 'border-bottom: 1px solid var(--bg-elev2);' : ''}
                        transition: background 0.2s ease;
                    `;
                    button.textContent = option.label;
                    button.title = option.description;

                    // Add hover effect via JS
                    button.addEventListener('mouseenter', () => {
                        button.style.background = 'var(--panel)';
                    });
                    button.addEventListener('mouseleave', () => {
                        button.style.background = 'transparent';
                    });

                    dropdown.appendChild(button);
                });

                // Re-wire event listeners for new buttons
                this.setupEvalButtonListeners();
            } catch (e) {
                console.error('[DashboardOperations] Error loading reranker options:', e);
            }
        }

        /**
         * Setup event listeners for eval model selection buttons
         */
        setupEvalButtonListeners() {
            document.querySelectorAll('.eval-model-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const model = e.currentTarget.getAttribute('data-model');
                    const backend = e.currentTarget.getAttribute('data-backend');
                    this.handleRunEval(model, backend);
                    const dropdown = document.getElementById('dash-eval-dropdown');
                    const chevron = document.getElementById('dash-eval-chevron');
                    if (dropdown) dropdown.style.display = 'none';
                    if (chevron) chevron.style.transform = 'rotate(0deg)';
                });
            });
        }

        setupEventListeners() {
            // Generate Keywords button
            const keywordsBtn = document.getElementById('btn-generate-keywords');
            if (keywordsBtn) {
                keywordsBtn.addEventListener('click', () => this.handleGenerateKeywords());
            }

            // Run Indexer button
            const indexerBtn = document.getElementById('dash-index-start');
            if (indexerBtn) {
                indexerBtn.addEventListener('click', () => this.handleRunIndexer());
            }

            // Run Eval dropdown trigger
            const evalTrigger = document.getElementById('dash-eval-trigger');
            if (evalTrigger) {
                evalTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdown = document.getElementById('dash-eval-dropdown');
                    const chevron = document.getElementById('dash-eval-chevron');
                    if (dropdown) {
                        const isOpen = dropdown.style.display === 'block';
                        dropdown.style.display = isOpen ? 'none' : 'block';
                        if (chevron) {
                            chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                        }
                    }
                });
            }

            // Eval model selection handled by setupEvalButtonListeners()
            // (called after dynamic options are loaded)

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (e.target.closest('#dash-eval-trigger')) return;
                const dropdown = document.getElementById('dash-eval-dropdown');
                const chevron = document.getElementById('dash-eval-chevron');
                if (dropdown && dropdown.style.display === 'block') {
                    dropdown.style.display = 'none';
                    if (chevron) {
                        chevron.style.transform = 'rotate(0deg)';
                    }
                }
            });
        }

        /**
         * Initialize live terminal if it doesn't exist
         */
        ensureTerminal() {
            if (!liveTerminal) {
                const container = document.getElementById('dash-operations-terminal');
                if (container && typeof window.LiveTerminal !== 'undefined') {
                    liveTerminal = new window.LiveTerminal('dash-operations-terminal');
                }
            }
            return liveTerminal;
        }

        /**
         * Handle Generate Keywords operation
         */
        async handleGenerateKeywords() {
            if (operationInProgress) {
                if (window.showStatus) window.showStatus('Operation already in progress', 'warning');
                return;
            }

            operationInProgress = true;
            const terminal = this.ensureTerminal();
            if (!terminal) {
                if (window.showStatus) window.showStatus('Terminal not available', 'error');
                return;
            }

            if (window.showStatus) window.showStatus('Starting keyword generation...', 'loading');

            terminal.clear();
            terminal.show();
            terminal.setTitle('Generate Keywords');
            terminal.updateProgress(0, 'Initializing...');

            try {
                terminal.appendLine('🔄 Generating keywords from indexed content...\n');

                const response = await fetch(api('/api/keywords/generate'), {
                    method: 'POST'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Try streaming if available, otherwise just read as text
                try {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let chunks = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = decoder.decode(value, { stream: true });
                        const lines = text.split('\n').filter(l => l.trim());
                        lines.forEach(line => terminal.appendLine(line));
                        chunks++;
                    }
                } catch {
                    // Fallback to regular JSON response
                    const data = await response.json();
                    if (data.keywords) {
                        terminal.appendLine(`✅ Generated ${data.keywords.length} keywords`);
                        terminal.appendLine(data.keywords.join(', '));
                    } else if (data.message) {
                        terminal.appendLine(data.message);
                    }
                }

                terminal.updateProgress(100, 'Complete');
                if (window.showStatus) window.showStatus('Keyword generation complete', 'success');
                setTimeout(() => { operationInProgress = false; }, 1000);
            } catch (e) {
                terminal.appendLine(`\n❌ Error: ${e.message}`);
                if (window.showStatus) window.showStatus('Keyword generation failed', 'error');
                operationInProgress = false;
            }
        }

        /**
         * Handle Run Indexer operation
         */
        async handleRunIndexer() {
            if (operationInProgress) {
                if (window.showStatus) window.showStatus('Operation already in progress', 'warning');
                return;
            }

            operationInProgress = true;
            const terminal = this.ensureTerminal();
            if (!terminal) {
                if (window.showStatus) window.showStatus('Terminal not available', 'error');
                return;
            }

            if (window.showStatus) window.showStatus('Starting indexer...', 'loading');

            terminal.clear();
            terminal.show();
            terminal.setTitle('Run Indexer');

            try {
                const response = await fetch(api('/api/index/start'), {
                    method: 'POST'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const lines = text.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) terminal.appendLine(line);
                    });
                }

                if (window.showStatus) window.showStatus('Indexing complete', 'success');
                setTimeout(() => { operationInProgress = false; }, 1000);
            } catch (e) {
                terminal.appendLine(`❌ Error: ${e.message}`);
                if (window.showStatus) window.showStatus('Indexing failed', 'error');
                operationInProgress = false;
            }
        }

        /**
         * Handle Run Eval operation with model selection
         */
        async handleRunEval(model, backend) {
            if (operationInProgress) {
                if (window.showStatus) window.showStatus('Operation already in progress', 'warning');
                return;
            }

            operationInProgress = true;
            const terminal = this.ensureTerminal();
            if (!terminal) {
                if (window.showStatus) window.showStatus('Terminal not available', 'error');
                operationInProgress = false;
                return;
            }

            if (window.showStatus) window.showStatus(`Running evaluation with ${model}...`, 'loading');

            terminal.clear();
            terminal.show();
            terminal.setTitle(`Evaluate - ${model}`);
            terminal.updateProgress(0, 'Starting evaluation...');

            try {
                // Start the evaluation
                const response = await fetch(api('/api/eval/run'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model,
                        backend: backend || 'local'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (!data.ok) {
                    throw new Error(data.error || 'Failed to start evaluation');
                }

                if (data.warning) {
                    terminal.appendLine(`⚠️  ${data.warning}\n`);
                }

                terminal.appendLine(`✅ ${data.message}\n`);
                terminal.appendLine('Polling for progress updates...\n');

                // Poll for status updates
                let lastProgress = 0;
                let lastQuestion = '';
                const pollInterval = setInterval(async () => {
                    try {
                        const statusResp = await fetch(api('/api/eval/status'));
                        if (!statusResp.ok) {
                            clearInterval(pollInterval);
                            terminal.appendLine('\n❌ Failed to fetch status');
                            operationInProgress = false;
                            return;
                        }

                        const status = await statusResp.json();

                        // Update progress bar
                        if (status.total > 0) {
                            const percent = Math.round((status.progress / status.total) * 100);
                            if (percent !== lastProgress) {
                                terminal.updateProgress(percent, `${status.progress}/${status.total} questions`);
                                lastProgress = percent;
                            }
                        }

                        // Show current question
                        if (status.current_question && status.current_question !== lastQuestion) {
                            terminal.appendLine(`[${status.progress}/${status.total}] ${status.current_question}`);
                            lastQuestion = status.current_question;
                        }

                        // Check if complete
                        if (!status.running && status.progress > 0) {
                            clearInterval(pollInterval);
                            terminal.appendLine('\n✅ Evaluation complete!');
                            terminal.updateProgress(100, 'Complete');

                            // Fetch final results
                            const resultsResp = await fetch(api('/api/eval/results'));
                            if (resultsResp.ok) {
                                const results = await resultsResp.json();
                                if (results && results.scores) {
                                    terminal.appendLine(`\n📊 Results:`);
                                    terminal.appendLine(`   Hit Rate: ${(results.scores.hit_rate * 100).toFixed(1)}%`);
                                    terminal.appendLine(`   MRR: ${results.scores.mrr.toFixed(3)}`);
                                    terminal.appendLine(`   NDCG@5: ${results.scores.ndcg5.toFixed(3)}`);
                                    if (results.scores.precision) {
                                        terminal.appendLine(`   Precision: ${(results.scores.precision * 100).toFixed(1)}%`);
                                    }
                                }
                            }

                            if (window.showStatus) window.showStatus('Evaluation complete', 'success');
                            setTimeout(() => { operationInProgress = false; }, 1000);
                        }
                    } catch (e) {
                        console.error('[DashboardOperations] Status poll error:', e);
                    }
                }, 1000); // Poll every second

            } catch (e) {
                terminal.appendLine(`\n❌ Error: ${e.message}`);
                if (window.showStatus) window.showStatus('Evaluation failed', 'error');
                operationInProgress = false;
            }
        }

        /**
         * Initialize metrics display
         */
        async initMetrics() {
            // Load metrics on a longer interval (30 seconds)
            this.loadMetrics();
            setInterval(() => this.loadMetrics(), 30000);
        }

        /**
         * Load and display all metrics
         */
        async loadMetrics() {
            if (typeof window.DashboardMetrics === 'undefined') {
                console.log('[DashboardOperations] DashboardMetrics module not available');
                return;
            }

            const metrics = new window.DashboardMetrics();

            // Load API Performance
            const perf = await metrics.getAPIPerformance();
            const perfContainer = document.getElementById('dash-api-perf-metrics');
            if (perfContainer && perf) {
                perfContainer.innerHTML = metrics.formatAPIPerformanceHTML(perf);
            }

            // Load Index Health
            const health = await metrics.getIndexHealth();
            const healthContainer = document.getElementById('dash-index-health-metrics');
            if (healthContainer && health) {
                healthContainer.innerHTML = metrics.formatIndexHealthHTML(health);
            }

            // Load Top Folders
            const folders = await metrics.getTopFolders();
            const foldersContainer = document.getElementById('dash-top-folders-metrics');
            if (foldersContainer) {
                foldersContainer.innerHTML = metrics.formatTopFoldersHTML(folders);
            }
        }
    }

    // Initialize on document ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.DashboardOperations = new DashboardOperations();
        });
    } else {
        window.DashboardOperations = new DashboardOperations();
    }
})();
