// AGRO GUI - Glossary Module
// Renders all tooltip content as searchable, filterable glossary cards
(function() {
    'use strict';

    // Category definitions for organizing tooltips
    const CATEGORIES = {
        infrastructure: {
            title: 'Infrastructure',
            icon: '🔧',
            keywords: ['QDRANT', 'REDIS', 'REPO', 'COLLECTION', 'OUT_DIR', 'MCP', 'DOCKER']
        },
        models: {
            title: 'Models & Providers',
            icon: '🤖',
            keywords: ['MODEL', 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'OLLAMA', 'VOYAGE', 'COHERE', 'API_KEY', 'EMBEDDING']
        },
        retrieval: {
            title: 'Retrieval & Search',
            icon: '🔍',
            keywords: ['TOPK', 'FINAL_K', 'HYBRID', 'ALPHA', 'BM25', 'DENSE', 'SEARCH', 'QUERY']
        },
        reranking: {
            title: 'Reranking',
            icon: '🎯',
            keywords: ['RERANK', 'CROSS_ENCODER', 'LEARNING_RANKER', 'TRAINING']
        },
        evaluation: {
            title: 'Evaluation',
            icon: '📊',
            keywords: ['EVAL', 'GOLDEN', 'BASELINE', 'METRICS']
        },
        advanced: {
            title: 'Advanced',
            icon: '⚙️',
            keywords: ['CUSTOM', 'BOOST', 'LAYER', 'CONTEXT', 'STOP_WORDS', 'MQ_REWRITES']
        }
    };

    let allGlossaryItems = [];
    let currentFilter = 'all';
    let searchQuery = '';

    /**
     * Parse tooltip HTML to extract structured data
     */
    function parseTooltipHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;

        const titleEl = div.querySelector('.tt-title');
        const linksEl = div.querySelector('.tt-links');
        const badgesEl = div.querySelector('.tt-badges');

        // Get body text (everything except title, links, badges)
        const cloned = div.cloneNode(true);
        const titleToRemove = cloned.querySelector('.tt-title');
        const linksToRemove = cloned.querySelector('.tt-links');
        const badgesToRemove = cloned.querySelector('.tt-badges');
        if (titleToRemove) titleToRemove.remove();
        if (linksToRemove) linksToRemove.remove();
        if (badgesToRemove) badgesToRemove.remove();
        const body = cloned.textContent.trim();

        const links = linksEl ? Array.from(linksEl.querySelectorAll('a')).map(a => ({
            text: a.textContent,
            href: a.href
        })) : [];

        const badges = badgesEl ? Array.from(badgesEl.querySelectorAll('.tt-badge')).map(badge => ({
            text: badge.textContent,
            class: badge.className.replace('tt-badge', '').trim()
        })) : [];

        return {
            title: titleEl ? titleEl.textContent : '',
            body,
            links,
            badges
        };
    }

    /**
     * Categorize a tooltip based on its parameter name
     */
    function categorizeTooltip(paramName) {
        for (const [categoryId, category] of Object.entries(CATEGORIES)) {
            if (category.keywords.some(keyword => paramName.toUpperCase().includes(keyword))) {
                return categoryId;
            }
        }
        return 'advanced'; // Default category
    }

    /**
     * Build glossary items from tooltips
     *
     * IMPORTANT: This function is FULLY DYNAMIC - it reads from tooltips.js at runtime.
     * When new tooltips are added to tooltips.js, they automatically appear in the glossary.
     * No manual updates needed. Categories are auto-assigned based on parameter name keywords.
     *
     * This ensures the glossary stays in sync with the latest RAG configuration options.
     */
    function buildGlossaryItems() {
        if (!window.Tooltips || !window.Tooltips.buildTooltipMap) {
            console.error('[Glossary] window.Tooltips not found');
            return [];
        }

        // Dynamically fetch ALL tooltips from tooltips.js
        // This includes any new tooltips added since the last page load
        const tooltipMap = window.Tooltips.buildTooltipMap();
        const items = [];

        for (const [paramName, html] of Object.entries(tooltipMap)) {
            const parsed = parseTooltipHTML(html);
            const category = categorizeTooltip(paramName);

            items.push({
                paramName,
                category,
                ...parsed,
                searchText: `${paramName} ${parsed.title} ${parsed.body}`.toLowerCase()
            });
        }

        // Sort by category, then title
        items.sort((a, b) => {
            if (a.category !== b.category) {
                const catOrder = Object.keys(CATEGORIES);
                return catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
            }
            return a.title.localeCompare(b.title);
        });

        return items;
    }

    /**
     * Render a single glossary card
     */
    function renderGlossaryCard(item) {
        const badgesHTML = item.badges.map(badge =>
            `<span class="glossary-badge ${badge.class}">${badge.text}</span>`
        ).join('');

        const linksHTML = item.links.map(link =>
            `<a href="${link.href}" target="_blank" rel="noopener noreferrer" class="glossary-link">
                ${link.text}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>`
        ).join('');

        const categoryInfo = CATEGORIES[item.category] || CATEGORIES.advanced;

        return `
            <div class="glossary-card" data-category="${item.category}">
                <div class="glossary-card-header">
                    <div class="glossary-card-title">
                        <span class="glossary-icon">${categoryInfo.icon}</span>
                        <strong>${item.title}</strong>
                    </div>
                    <code class="glossary-param-name">${item.paramName}</code>
                </div>
                ${badgesHTML ? `<div class="glossary-badges">${badgesHTML}</div>` : ''}
                <p class="glossary-body">${item.body}</p>
                ${linksHTML ? `<div class="glossary-links">${linksHTML}</div>` : ''}
            </div>
        `;
    }

    /**
     * Filter items based on current search and category filter
     */
    function getFilteredItems() {
        let items = allGlossaryItems;

        // Apply category filter
        if (currentFilter !== 'all') {
            items = items.filter(item => item.category === currentFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => item.searchText.includes(query));
        }

        return items;
    }

    /**
     * Render the glossary grid
     */
    function renderGlossary() {
        const grid = document.getElementById('glossary-grid');
        if (!grid) return;

        const filteredItems = getFilteredItems();

        if (filteredItems.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--fg-muted);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; opacity: 0.3;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <p style="font-size: 16px; margin-bottom: 8px;">No parameters found</p>
                    <p style="font-size: 14px; opacity: 0.7;">Try a different search term or category filter</p>
                </div>
            `;
            return;
        }

        const html = filteredItems.map(item => renderGlossaryCard(item)).join('');
        grid.innerHTML = html;

        // Add animation
        setTimeout(() => {
            const cards = grid.querySelectorAll('.glossary-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                }, index * 20); // Stagger animation
            });
        }, 0);
    }

    /**
     * Render category filter buttons
     */
    function renderCategoryFilters() {
        const container = document.getElementById('glossary-category-filters');
        if (!container) return;

        const counts = {};
        allGlossaryItems.forEach(item => {
            counts[item.category] = (counts[item.category] || 0) + 1;
        });

        const buttons = [
            `<button class="category-filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-category="all">
                All <span class="filter-count">${allGlossaryItems.length}</span>
            </button>`
        ];

        for (const [categoryId, category] of Object.entries(CATEGORIES)) {
            const count = counts[categoryId] || 0;
            if (count > 0) {
                buttons.push(`
                    <button class="category-filter-btn ${currentFilter === categoryId ? 'active' : ''}" data-category="${categoryId}">
                        ${category.icon} ${category.title} <span class="filter-count">${count}</span>
                    </button>
                `);
            }
        }

        container.innerHTML = buttons.join('');

        // Add event listeners
        container.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.category;
                renderCategoryFilters();
                renderGlossary();
            });
        });
    }

    /**
     * Initialize the glossary
     */
    function init() {
        // Only initialize if we're on the dashboard tab with glossary elements
        if (!document.getElementById('glossary-grid')) {
            return;
        }

        console.log('[Glossary] Initializing...');

        // Build glossary items
        allGlossaryItems = buildGlossaryItems();
        console.log(`[Glossary] Loaded ${allGlossaryItems.length} parameters`);

        // Set up search
        const searchInput = document.getElementById('glossary-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderGlossary();
            });
        }

        // Render UI
        renderCategoryFilters();
        renderGlossary();

        // Listen for tab changes to reinitialize if needed
        if (window.Navigation) {
            window.addEventListener('nav:tab-change', (e) => {
                if (e.detail && e.detail.tabId === 'dashboard' && e.detail.subtabId === 'help') {
                    // Re-render when help tab is shown
                    renderGlossary();
                }
            });
        }
    }

    // Expose public API
    window.Glossary = {
        init,
        refresh: renderGlossary
    };

    // Auto-initialize after tooltips are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait a bit for tooltips.js to load
            setTimeout(init, 100);
        });
    } else {
        setTimeout(init, 100);
    }

    console.log('[Glossary] Module loaded');
})();
