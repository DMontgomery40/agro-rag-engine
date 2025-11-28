import React from 'react';

// Exact legacy onboarding tab (Get Started) rendered via innerHTML for 1:1 parity
export default function StartTab() {
  const inner = `
            <div class="ob-container">
                <!-- Progress indicator -->
                <div class="ob-progress-dots">
                    <span class="ob-dot active" data-step="1">1</span>
                    <span class="ob-dot" data-step="2">2</span>
                    <span class="ob-dot" data-step="3">3</span>
                    <span class="ob-dot" data-step="4">4</span>
                    <span class="ob-dot" data-step="5">5</span>
                </div>

                <!-- Step 1: Welcome -->
                <div id="onboard-welcome" class="ob-step active">
                    <div class="ob-main">
                        <h2 class="ob-title">Welcome to AGRO</h2>
                        <p class="ob-subtitle">Point AGRO at a folder or repo; in ~3 minutes it will answer questions about it.</p>

                        <div class="ob-info-box">
                            <p>We scan text, markdown, code, and docs. Nothing leaves your computer unless you turn on cloud.</p>
                            <p>You can always start offline (keywords only) and add 'meaning' later.</p>
                        </div>

                        <!-- Source choice cards -->
                        <div class="ob-choice-cards">
                            <button class="ob-card" data-choice="folder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <h3>Use a Folder on This Computer</h3>
                                <p>Index local files and docs</p>
                            </button>
                            <button class="ob-card" data-choice="github">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                </svg>
                                <h3>Use a GitHub Repo</h3>
                                <p>Clone and index a repository</p>
                            </button>
                        </div>

                        <!-- Helpful links -->
                        <div class="ob-links">
                            <h4>Helpful Resources:</h4>
                            <div class="ob-link-grid">
                                <a href="/docs/START_HERE.md" target="_blank">Getting Started</a>
                                <a href="/docs/API_GUI.md" target="_blank">GUI Overview</a>
                                <a href="/docs/QUICKSTART_MCP.md" target="_blank">MCP Quickstart</a>
                                <a href="/docs/MODEL_RECOMMENDATIONS.md" target="_blank">Model Recommendations</a>
                                <a href="/docs/PERFORMANCE_AND_COST.md" target="_blank">Performance & Cost</a>
                                <a href="/docs/MCP_README.md" target="_blank">MCP Details</a>
                                <a href="/files/README.md" target="_blank">README</a>
                                <a href="https://github.com/openai/codex" target="_blank">Codex CLI ↗</a>
                                <a href="https://platform.openai.com/docs/guides/tools-connectors-mcp" target="_blank">MCP Guide ↗</a>
                                <a href="https://openai.github.io/openai-agents-python/" target="_blank">Agents SDK ↗</a>
                                <a href="https://openai.com/index/introducing-agentkit/" target="_blank">AgentKit ↗</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Add Your Stuff -->
                <div id="onboard-source" class="ob-step">
                    <div class="ob-main">
                        <h2 class="ob-title">Add Your Code and Docs</h2>

                        <!-- Mode switcher -->
                        <div class="ob-mode-tabs">
                            <button class="ob-mode-tab active" data-mode="folder">📁 Folder</button>
                            <button class="ob-mode-tab" data-mode="github">🔗 GitHub</button>
                        </div>

                        <!-- Folder mode -->
                        <div id="onboard-folder-mode" class="ob-mode-content active">
                            <div class="ob-input-group">
                                <label>Choose Folder</label>
                                <input type="file" id="onboard-folder-picker" webkitdirectory directory multiple style="display:none;">
                                <div class="ob-file-input">
                                    <button id="onboard-folder-btn" class="ob-browse-btn">Browse...</button>
                                    <span id="onboard-folder-display" class="ob-file-display">No folder selected</span>
                                </div>
                                <p class="ob-hint">Or enter path manually:</p>
                                <input type="text" id="onboard-folder-path" class="ob-text-input" placeholder="/path/to/your/project">
                            </div>
                        </div>

                        <!-- GitHub mode -->
                        <div id="onboard-github-mode" class="ob-mode-content">
                            <div class="ob-input-group">
                                <label>Repository URL</label>
                                <input type="text" id="onboard-github-url" class="ob-text-input" placeholder="https://github.com/owner/repo">
                            </div>
                            <div class="ob-input-group">
                                <label>Branch (optional)</label>
                                <input type="text" id="onboard-github-branch" class="ob-text-input" placeholder="main">
                            </div>
                            <div class="ob-input-group">
                                <label>Personal Access Token (optional)</label>
                                <input type="password" id="onboard-github-token" class="ob-text-input" placeholder="ghp_...">
                                <p class="ob-hint">Only used to clone; not stored unless you save this as a Project.</p>
                            </div>
                        </div>

                        <div class="ob-info-box">
                            We only read files you point us to. Nothing leaves your computer unless you turn on cloud.
                        </div>
                    </div>
                </div>

                <!-- Step 3: Index & Enrich -->
                <div id="onboard-index" class="ob-step">
                    <div class="ob-main">
                        <h2 class="ob-title">Build Your Indexes</h2>

                        <!-- Stage indicators -->
                        <div class="ob-stages">
                            <div class="ob-stage" data-stage="scan">
                                <div class="ob-stage-dot"></div>
                                <span>Light Scan</span>
                            </div>
                            <div class="ob-stage-arrow">→</div>
                            <div class="ob-stage" data-stage="keywords">
                                <div class="ob-stage-dot"></div>
                                <span>Keywords & Cards</span>
                            </div>
                            <div class="ob-stage-arrow">→</div>
                            <div class="ob-stage" data-stage="smart">
                                <div class="ob-stage-dot"></div>
                                <span>Smart Search</span>
                            </div>
                        </div>

                        <!-- Progress bar -->
                        <div class="ob-progress-bar">
                            <div id="onboard-index-bar" class="ob-progress-fill"></div>
                        </div>
                        <div id="onboard-index-status" class="ob-progress-text">Ready to index</div>

                        <!-- Index log -->
                        <div id="onboard-index-log" class="ob-log"></div>

                        <!-- Info tooltip -->
                        <div class="ob-info-box">
                            <div class="ob-tooltip-header">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                <span>How it works</span>
                            </div>
                            <p>We always keep a BM25 'keyword' index (works offline). When available, we add a dense 'meaning' index so it understands phrasing. If the smart part isn't ready, we fall back to keywords—so it always works.</p>
                        </div>

                        <!-- Fallback message -->
                        <div id="onboard-index-fallback" class="ob-warning-box" style="display:none;">
                            Continuing with keywords only. Dense search can be added later.
                        </div>
                    </div>
                </div>

                <!-- Step 4: Ask Your First Questions -->
                <div id="onboard-questions" class="ob-step">
                    <div class="ob-main">
                        <h2 class="ob-title">Ask Your Codebase</h2>
                        <p class="ob-subtitle">Try these Golden Questions (you can edit them)</p>

                        <!-- Questions -->
                        <div class="ob-questions-list">
                            <div class="ob-question-item">
                                <input type="text" id="onboard-q1" class="ob-question-input" value="Where is hybrid retrieval implemented?">
                                <button class="ob-ask-btn" data-q="1">Ask</button>
                                <div id="onboard-ans-1" class="ob-answer"></div>
                                <a href="#" id="onboard-trace-1" class="ob-trace-link" style="display:none;">What happened under the hood?</a>
                                <div id="onboard-trace-panel-1" class="ob-trace-panel" style="display:none;"></div>
                            </div>
                            <div class="ob-question-item">
                                <input type="text" id="onboard-q2" class="ob-question-input" value="Where are indexing settings?">
                                <button class="ob-ask-btn" data-q="2">Ask</button>
                                <div id="onboard-ans-2" class="ob-answer"></div>
                                <a href="#" id="onboard-trace-2" class="ob-trace-link" style="display:none;">What happened under the hood?</a>
                                <div id="onboard-trace-panel-2" class="ob-trace-panel" style="display:none;"></div>
                            </div>
                            <div class="ob-question-item">
                                <input type="text" id="onboard-q3" class="ob-question-input" value="How do I change the default model?">
                                <button class="ob-ask-btn" data-q="3">Ask</button>
                                <div id="onboard-ans-3" class="ob-answer"></div>
                                <a href="#" id="onboard-trace-3" class="ob-trace-link" style="display:none;">What happened under the hood?</a>
                                <div id="onboard-trace-panel-3" class="ob-trace-panel" style="display:none;"></div>
                            </div>
                        </div>

                        <button id="onboard-save-golden" class="ob-secondary-btn">Save these as Golden Questions</button>
                    </div>
                </div>

                <!-- Step 5: Tune & Save -->
                <div id="onboard-tune" class="ob-step">
                    <div class="ob-main">
                        <h2 class="ob-title">Tune and Save Your Project</h2>

                        <!-- Sliders -->
                        <div class="ob-sliders">
                            <div class="ob-slider-group">
                                <label>Faster ← → Thorough</label>
                                <input type="range" id="onboard-slider-speed" min="1" max="4" value="2" step="1">
                                <div class="ob-slider-labels">
                                    <span>Fast</span>
                                    <span>Balanced</span>
                                    <span>Thorough</span>
                                </div>
                            </div>

                            <div class="ob-slider-group">
                                <label>Cheapest ← → Smartest</label>
                                <input type="range" id="onboard-slider-quality" min="1" max="3" value="2" step="1">
                                <div class="ob-slider-labels">
                                    <span>Local/Free</span>
                                    <span>Balanced</span>
                                    <span>Best Quality</span>
                                </div>
                            </div>

                            <div class="ob-slider-group">
                                <label>Local ← → Cloud</label>
                                <input type="range" id="onboard-slider-cloud" min="1" max="2" value="1" step="1">
                                <div class="ob-slider-labels">
                                    <span>Local Only</span>
                                    <span>Cloud APIs</span>
                                </div>
                            </div>
                        </div>

                        <!-- Settings summary -->
                        <div id="onboard-settings-summary" class="ob-settings-box">
                            <h4>Settings to Apply:</h4>
                            <div id="onboard-summary-content" class="ob-summary-content"></div>
                        </div>

                        <!-- Action buttons -->
                        <div class="ob-actions">
                            <button id="onboard-save-project" class="ob-primary-btn">Save as a Project</button>
                            <button id="onboard-run-eval" class="ob-secondary-btn">Run a Tiny Evaluation</button>
                        </div>

                        <!-- Eval progress -->
                        <div id="onboard-eval-progress" class="ob-eval-box" style="display:none;">
                            <div class="ob-progress-bar">
                                <div id="onboard-eval-bar" class="ob-progress-fill"></div>
                            </div>
                            <div id="onboard-eval-status" class="ob-progress-text">Running evaluation...</div>
                            <div id="onboard-eval-result" class="ob-eval-result"></div>
                        </div>
                    </div>
                </div>

                <!-- Mini help panel (persistent) -->
                <div class="ob-help-panel">
                    <h4>Have questions?</h4>
                    <p>Ask in plain English. We'll help.</p>
                    <textarea id="onboard-help-input" class="ob-help-input" placeholder="Type your question..."></textarea>
                    <button id="onboard-help-send" class="ob-help-btn">Ask</button>
                    <div id="onboard-help-results" class="ob-help-results"></div>

                    <div class="ob-help-pills">
                        <button class="ob-help-pill" data-q="What is BM25?">What is BM25?</button>
                        <button class="ob-help-pill" data-q="What is dense retrieval?">What is dense retrieval?</button>
                        <button class="ob-help-pill" data-q="How long does indexing take?">How long does indexing take?</button>
                    </div>

                    <a href="#" id="onboard-open-chat" class="ob-help-link">Open full Chat →</a>
                </div>

                <!-- Navigation footer -->
                <div class="ob-footer">
                    <button id="onboard-back" class="ob-nav-btn" style="display:none;">← Back</button>
                    <button id="onboard-next" class="ob-nav-btn ob-nav-primary">Next →</button>
                </div>
            </div>
  `;

  return (
    <div id="tab-start" className="tab-content" dangerouslySetInnerHTML={{ __html: inner }} />
  );
}
