// Evaluation Runner
// Handles running full evaluation suite and displaying results

let evalResults = null;
let evalPollingInterval = null;

// Run full evaluation
async function runEvaluation() {
    const useMulti = document.getElementById('eval-use-multi').value === '1';
    const finalK = parseInt(document.getElementById('eval-final-k').value) || 5;

    const btn = document.getElementById('btn-eval-run');
    btn.disabled = true;
    btn.textContent = 'Starting...';

    try {
        const response = await fetch('/api/eval/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ use_multi: useMulti, final_k: finalK })
        });

        const data = await response.json();

        if (data.ok) {
            showEvalProgress();
            startPolling();
        } else {
            throw new Error(data.error || 'Failed to start evaluation');
        }
    } catch (error) {
        console.error('Failed to start evaluation:', error);
        alert('Failed to start evaluation: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Run Full Evaluation';
    }
}

// Show progress UI
function showEvalProgress() {
    document.getElementById('eval-progress').style.display = 'block';
    document.getElementById('eval-results').style.display = 'none';
    document.getElementById('eval-comparison').style.display = 'none';
    document.getElementById('eval-status').textContent = 'Initializing...';
    document.getElementById('eval-progress-bar').style.width = '0%';
}

// Start polling for status
function startPolling() {
    if (evalPollingInterval) clearInterval(evalPollingInterval);

    evalPollingInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/eval/status');
            const status = await response.json();

            if (status.running) {
                const progress = status.total > 0 ? (status.progress / status.total * 100) : 10;
                document.getElementById('eval-progress-bar').style.width = progress + '%';
                document.getElementById('eval-status').textContent =
                    `Running... ${status.progress}/${status.total} questions`;
            } else {
                // Evaluation finished
                clearInterval(evalPollingInterval);
                evalPollingInterval = null;
                await loadEvalResults();
            }
        } catch (error) {
            console.error('Failed to poll status:', error);
        }
    }, 1000);
}

// Load evaluation results
async function loadEvalResults() {
    try {
        const response = await fetch('/api/eval/results');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        evalResults = data;
        renderEvalResults();

        // Re-enable button
        const btn = document.getElementById('btn-eval-run');
        btn.disabled = false;
        btn.textContent = 'Run Full Evaluation';

        // Hide progress
        document.getElementById('eval-progress').style.display = 'none';
    } catch (error) {
        console.error('Failed to load results:', error);
        document.getElementById('eval-status').textContent = 'Error: ' + error.message;
        document.getElementById('eval-status').style.color = 'var(--err)';
        const btn = document.getElementById('btn-eval-run');
        btn.disabled = false;
        btn.textContent = 'Run Full Evaluation';
    }
}

// Render evaluation results
function renderEvalResults() {
    if (!evalResults) return;

    // Show results section
    document.getElementById('eval-results').style.display = 'block';

    // Overall metrics
    const top1Pct = (evalResults.top1_accuracy * 100).toFixed(1) + '%';
    const topkPct = (evalResults.topk_accuracy * 100).toFixed(1) + '%';
    const duration = evalResults.duration_secs + 's';

    document.getElementById('eval-top1-acc').textContent = top1Pct;
    document.getElementById('eval-topk-acc').textContent = topkPct;
    document.getElementById('eval-duration').textContent = duration;

    // Per-question details
    const detailsContainer = document.getElementById('eval-details');
    const results = evalResults.results || [];
    const failures = results.filter(r => !r.topk_hit);
    const passes = results.filter(r => r.topk_hit);

    let html = `
        <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: var(--fg-muted); margin-bottom: 8px;">
                <span style="color: var(--ok);">✓ ${passes.length} passed</span>
                <span style="margin-left: 16px; color: var(--err);">✗ ${failures.length} failed</span>
            </div>
        </div>
    `;

    // Show failures first
    if (failures.length > 0) {
        html += '<div style="margin-bottom: 16px;"><div style="font-size: 12px; font-weight: 600; color: var(--err); margin-bottom: 8px;">FAILURES</div>';
        failures.forEach((r, i) => {
            html += renderQuestionResult(r, true);
        });
        html += '</div>';
    }

    // Show passes (collapsed by default)
    if (passes.length > 0) {
        html += `
            <details style="margin-top: 12px;">
                <summary style="font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 8px; cursor: pointer;">
                    PASSES (${passes.length})
                </summary>
                <div style="margin-top: 8px;">
        `;
        passes.forEach((r, i) => {
            html += renderQuestionResult(r, false);
        });
        html += '</div></details>';
    }

    detailsContainer.innerHTML = html;
}

// Render individual question result
function renderQuestionResult(r, isFailure) {
    const top1Color = r.top1_hit ? 'var(--ok)' : 'var(--err)';
    const topkColor = r.topk_hit ? 'var(--ok)' : 'var(--warn)';

    return `
        <div style="background: var(--card-bg); border-left: 3px solid ${isFailure ? 'var(--err)' : 'var(--ok)'}; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <div style="flex: 1; font-size: 12px; color: var(--fg); font-weight: 500;">${escapeHtml(r.question)}</div>
                <div style="font-size: 11px; margin-left: 12px;">
                    <span style="background: var(--bg-elev2); padding: 2px 6px; border-radius: 3px;">${r.repo}</span>
                </div>
            </div>
            <div style="font-size: 11px; color: var(--fg-muted); margin-bottom: 4px;">
                <strong>Expected:</strong> ${(r.expect_paths || []).join(', ')}
            </div>
            <div style="font-size: 11px;">
                <span style="color: ${top1Color}; font-weight: 600;">${r.top1_hit ? '✓' : '✗'} Top-1</span>
                <span style="margin-left: 12px; color: ${topkColor}; font-weight: 600;">${r.topk_hit ? '✓' : '✗'} Top-K</span>
            </div>
            <div style="margin-top: 6px; font-size: 10px; font-family: 'SF Mono', monospace; color: var(--fg-muted);">
                ${(r.top_paths || []).slice(0, 3).map((p, i) => {
                    const match = (r.expect_paths || []).some(exp => p.includes(exp));
                    const color = match ? 'var(--ok)' : 'var(--fg-muted)';
                    return `<div style="color: ${color};">${i + 1}. ${escapeHtml(p)}</div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// Save baseline
async function saveBaseline() {
    if (!evalResults) {
        alert('No evaluation results to save');
        return;
    }

    try {
        const response = await fetch('/api/eval/baseline/save', {
            method: 'POST'
        });

        const data = await response.json();
        if (data.ok) {
            showToast('Baseline saved successfully', 'success');
        } else {
            throw new Error('Failed to save baseline');
        }
    } catch (error) {
        console.error('Failed to save baseline:', error);
        alert('Failed to save baseline: ' + error.message);
    }
}

// Compare with baseline
async function compareWithBaseline() {
    if (!evalResults) {
        alert('No current evaluation results');
        return;
    }

    try {
        const response = await fetch('/api/eval/baseline/compare');
        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'No baseline found');
        }

        renderComparison(data);
    } catch (error) {
        console.error('Failed to compare:', error);
        alert(error.message);
    }
}

// Render comparison results
function renderComparison(data) {
    const container = document.getElementById('eval-comparison');
    container.style.display = 'block';

    const deltaTop1 = data.delta.top1;
    const deltaTopk = data.delta.topk;
    const deltaTop1Pct = (deltaTop1 * 100).toFixed(1) + '%';
    const deltaTopkPct = (deltaTopk * 100).toFixed(1) + '%';

    const top1Icon = deltaTop1 >= 0 ? '✓' : '✗';
    const topkIcon = deltaTopk >= 0 ? '✓' : '✗';
    const top1Color = deltaTop1 >= 0 ? 'var(--ok)' : 'var(--err)';
    const topkColor = deltaTopk >= 0 ? 'var(--ok)' : 'var(--err)';

    let html = `
        <div style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
            <h4 style="font-size: 14px; color: var(--link); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Baseline Comparison
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 4px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Top-1 Accuracy</div>
                    <div style="font-size: 14px; color: var(--fg-muted); margin-bottom: 4px;">
                        Baseline: ${(data.baseline.top1_accuracy * 100).toFixed(1)}%
                    </div>
                    <div style="font-size: 14px; color: var(--fg); margin-bottom: 4px;">
                        Current: ${(data.current.top1_accuracy * 100).toFixed(1)}%
                    </div>
                    <div style="font-size: 16px; color: ${top1Color}; font-weight: 700;">
                        ${top1Icon} ${deltaTop1 >= 0 ? '+' : ''}${deltaTop1Pct}
                    </div>
                </div>
                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 4px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Top-K Accuracy</div>
                    <div style="font-size: 14px; color: var(--fg-muted); margin-bottom: 4px;">
                        Baseline: ${(data.baseline.topk_accuracy * 100).toFixed(1)}%
                    </div>
                    <div style="font-size: 14px; color: var(--fg); margin-bottom: 4px;">
                        Current: ${(data.current.topk_accuracy * 100).toFixed(1)}%
                    </div>
                    <div style="font-size: 16px; color: ${topkColor}; font-weight: 700;">
                        ${topkIcon} ${deltaTopk >= 0 ? '+' : ''}${deltaTopkPct}
                    </div>
                </div>
            </div>
    `;

    if (data.regressions && data.regressions.length > 0) {
        html += `
            <div style="background: color-mix(in oklch, var(--err) 8%, var(--bg)); border: 1px solid var(--err); border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 12px; font-weight: 600; color: var(--err); margin-bottom: 8px;">
                    ⚠ REGRESSIONS (${data.regressions.length})
                </div>
                ${data.regressions.map(r => `
                    <div style="font-size: 11px; color: var(--err); opacity: .85; margin-bottom: 4px;">
                        <span style="background: var(--bg-elev2); padding: 2px 6px; border-radius: 2px; margin-right: 6px;">${r.repo}</span>
                        ${escapeHtml(r.question)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (data.improvements && data.improvements.length > 0) {
        html += `
            <div style="background: color-mix(in oklch, var(--ok) 8%, var(--bg)); border: 1px solid var(--ok); border-radius: 4px; padding: 12px;">
                <div style="font-size: 12px; font-weight: 600; color: var(--ok); margin-bottom: 8px;">
                    ✓ IMPROVEMENTS (${data.improvements.length})
                </div>
                ${data.improvements.map(r => `
                    <div style="font-size: 11px; color: var(--ok); opacity:.85; margin-bottom: 4px;">
                        <span style="background: var(--bg-elev2); padding: 2px 6px; border-radius: 2px; margin-right: 6px;">${r.repo}</span>
                        ${escapeHtml(r.question)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (!data.has_regressions) {
        html += `
            <div style="background: color-mix(in oklch, var(--ok) 8%, var(--bg)); border: 1px solid var(--ok); border-radius: 4px; padding: 12px; text-align: center; color: var(--ok); font-weight: 600;">
                ✓ No significant regressions detected
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Export results
function exportEvalResults() {
    if (!evalResults) {
        alert('No results to export');
        return;
    }

    const dataStr = JSON.stringify(evalResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toLocaleString().replace(/[\/\s:,]/g, '-').replace(/--+/g, '-');
    a.download = `eval_results_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Results exported', 'success');
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const color = type === 'success' ? 'var(--ok)' : type === 'error' ? 'var(--err)' : 'var(--link)';
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 24px;
        background: var(--panel);
        color: ${color};
        border: 1px solid ${color};
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 13px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize
if (typeof window !== 'undefined') {
    // Initialization function called by golden_questions.js when rag-evaluate view mounts
    // Does NOT register view - golden_questions.js handles that
    window.initEvalRunner = function() {
        console.log('[eval_runner.js] Initializing eval runner for rag-evaluate view');
        const btnRun = document.getElementById('btn-eval-run');
        const btnSaveBaseline = document.getElementById('btn-eval-save-baseline');
        const btnCompare = document.getElementById('btn-eval-compare');
        const btnExport = document.getElementById('btn-eval-export');

        if (btnRun) btnRun.addEventListener('click', runEvaluation);
        if (btnSaveBaseline) btnSaveBaseline.addEventListener('click', saveBaseline);
        if (btnCompare) btnCompare.addEventListener('click', compareWithBaseline);
        if (btnExport) btnExport.addEventListener('click', exportEvalResults);
    };

    // Legacy mode support
    window.addEventListener('DOMContentLoaded', () => {
        const btnRun = document.getElementById('btn-eval-run');
        const btnSaveBaseline = document.getElementById('btn-eval-save-baseline');
        const btnCompare = document.getElementById('btn-eval-compare');
        const btnExport = document.getElementById('btn-eval-export');

        if (btnRun) btnRun.addEventListener('click', runEvaluation);
        if (btnSaveBaseline) btnSaveBaseline.addEventListener('click', saveBaseline);
        if (btnCompare) btnCompare.addEventListener('click', compareWithBaseline);
        if (btnExport) btnExport.addEventListener('click', exportEvalResults);
    });

    console.log('[eval_runner.js] Module loaded (coordination with golden_questions.js for rag-evaluate view)');
}
