/**
 * SIMPLE INDEX BUTTON - NO BULLSHIT
 */

const $ = id => document.getElementById(id);

async function runRealIndex() {
    const repo = $('simple-repo-select')?.value;
    const dense = $('simple-dense-check')?.checked;
    const output = $('simple-output');
    const btn = $('simple-index-btn');
    
    if (!repo) {
        const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Repository Required', {
            message: 'No repository was selected',
            causes: [
                'No repository is selected from the dropdown menu',
                'Repository list failed to load from backend',
                'Configuration file is missing repository definitions'
            ],
            fixes: [
                'Select a repository from the dropdown menu above the Index button',
                'Check Settings > Repositories to verify repos are configured',
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

// Bind button
document.addEventListener('DOMContentLoaded', () => {
    loadRepos();
    $('simple-index-btn')?.addEventListener('click', runRealIndex);
});

// Export for global access
window.SimpleIndex = { runRealIndex, loadRepos };

