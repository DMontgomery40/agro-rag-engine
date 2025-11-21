/**
 * SIMPLE INDEX BUTTON - NO BULLSHIT
 */

const $ = id => document.getElementById(id);

async function runRealIndex() {
    const dense = $('simple-dense-check')?.checked;
    const output = $('simple-output');
    const btn = $('simple-index-btn');

    // Try to get repo from dropdown, or fall back to config/env defaults
    let repo = $('simple-repo-select')?.value;

    if (!repo || repo === '' || repo === 'Loading...') {
        // Fallback to config
        try {
            const response = await fetch('/api/config');
            const config = await response.json();

            if (config.env && config.env.REPO) {
                repo = config.env.REPO;
                console.log('[simple_index] Using default repo from config:', repo);
            } else if (config.default_repo) {
                repo = config.default_repo;
                console.log('[simple_index] Using default_repo from config:', repo);
            } else {
                repo = 'agro'; // Final fallback
                console.log('[simple_index] Using hardcoded fallback repo: agro');
            }
        } catch (e) {
            console.error('[simple_index] Failed to fetch config, using hardcoded fallback:', e);
            repo = 'agro';
        }
    }

    if (!repo) {
        const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Repository Required', {
            message: 'No repository was selected and no default found',
            causes: [
                'No repository is selected from the dropdown menu',
                'Repository list failed to load from backend',
                'Configuration file is missing repository definitions',
                'No REPO variable set in .env file'
            ],
            fixes: [
                'Select a repository from the dropdown menu above the Index button',
                'Check Settings > Repositories to verify repos are configured',
                'Set REPO variable in .env file',
                'Refresh the page to reload the repository list'
            ],
            links: [
                ['Repository Configuration', '/docs/CONFIGURATION.md#repositories'],
                ['Indexing Guide', '/docs/INDEXING.md#getting-started'],
                ['Backend Health', '/api/health']
            ]
        }) : 'Select a repo first';
        alert(msg);
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ INDEXING...';
    output.style.display = 'block';
    output.textContent = 'Starting indexer...\n\n';
    
    try {
        const response = await fetch(`/api/index/run?repo=${repo}&dense=${dense}`, {
            method: 'POST'
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value, { stream: true });
            output.textContent += text;
            output.scrollTop = output.scrollHeight;
        }
        
        output.textContent += '\n\n✅ DONE\n';
        btn.textContent = '🚀 INDEX NOW';
        btn.disabled = false;
        
    } catch (e) {
        output.textContent += `\n\n❌ ERROR: ${e.message}\n`;
        btn.textContent = '🚀 INDEX NOW';
        btn.disabled = false;
    }
}

// Load repos on page load
async function loadRepos() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        const select = $('simple-repo-select');
        
        if (config.repos && config.repos.length > 0) {
            select.innerHTML = '';
            config.repos.forEach(repo => {
                const opt = document.createElement('option');
                opt.value = repo.name;
                opt.textContent = repo.name;
                select.appendChild(opt);
            });
            
            // Set default
            if (config.env && config.env.REPO) {
                select.value = config.env.REPO;
            }
        }
    } catch (e) {
        console.error('Failed to load repos:', e);
        const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to Load Repositories', {
            message: e.message,
            causes: [
                'Backend configuration API service is not responding',
                'Repository configuration file (repos.json) is missing or corrupted',
                'Network connectivity issue or timeout',
                'Invalid JSON response from /api/config endpoint'
            ],
            fixes: [
                'Verify backend service is running: check Infrastructure tab',
                'Check that repos.json exists in project root directory',
                'Refresh the page and try loading again',
                'Check backend logs for configuration loading errors'
            ],
            links: [
                ['Repository Configuration', '/docs/CONFIGURATION.md#repositories'],
                ['Backend Health', '/api/health'],
                ['Fetch API Reference', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API']
            ]
        }) : 'Failed to load repos: ' + e.message;
        alert(msg);
    }
}

// Populate indexing repo selector
async function populateIndexingRepoSelector() {
    const select = document.getElementById('indexing-repo-selector');
    if (!select) return;

    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        if (config.repos && config.repos.length > 0) {
            select.innerHTML = '';
            config.repos.forEach(repo => {
                const opt = document.createElement('option');
                opt.value = repo.name;
                opt.textContent = repo.name;
                select.appendChild(opt);
            });

            // Set default
            const currentRepo = config.env && config.env.REPO ? config.env.REPO : config.default_repo || config.repos[0].name;
            if (currentRepo) {
                select.value = currentRepo;
            }

            console.log('[simple_index] Populated indexing repo selector with', config.repos.length, 'repos');
        }
    } catch (e) {
        console.error('[simple_index] Failed to populate indexing repo selector:', e);
    }
}

// Update branch display
async function updateBranchDisplay() {
    const branchDisplay = document.getElementById('indexing-branch-display');
    if (!branchDisplay) return;

    try {
        const response = await fetch('/api/index/stats');
        const stats = await response.json();

        if (stats.current_branch) {
            branchDisplay.textContent = stats.current_branch;
            branchDisplay.style.color = 'var(--link)';
        }
    } catch (e) {
        console.error('[simple_index] Failed to load branch:', e);
        branchDisplay.textContent = 'unknown';
        branchDisplay.style.color = 'var(--err)';
    }
}

// Bind button
document.addEventListener('DOMContentLoaded', () => {
    loadRepos();
    populateIndexingRepoSelector();
    updateBranchDisplay();
    $('simple-index-btn')?.addEventListener('click', runRealIndex);

    // Bind repo selector change handler
    const indexingRepoSelector = document.getElementById('indexing-repo-selector');
    if (indexingRepoSelector) {
        indexingRepoSelector.addEventListener('change', function() {
            const newRepo = this.value;
            console.log('[simple_index] Repo changed to:', newRepo);

            // Sync with simple-repo-select
            const simpleSelect = $('simple-repo-select');
            if (simpleSelect && simpleSelect.value !== newRepo) {
                simpleSelect.value = newRepo;
            }
        });
    }
});

// Export for global access
window.SimpleIndex = { runRealIndex, loadRepos };

