// gui/js/reranker.js - Learning Reranker UI Module
// Handles feedback collection, triplet mining, training, evaluation, and all reranker features

// ============ FEEDBACK SYSTEM ============

// Track file link clicks
window.trackFileClick = async function(eventId, docId) {
    if (!eventId || !docId) return;
    
    try {
        await fetch('/api/reranker/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, doc_id: docId })
        });
    } catch (error) {
        console.error('Failed to track click:', error);
    }
};

// Add feedback buttons to a chat message (thumbs + stars + note)
function addFeedbackButtons(messageElement, eventId) {
    if (!eventId) return;
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.style.cssText = 'margin-top:12px; padding:12px; background:var(--card-bg); border-radius:6px; border-left:3px solid var(--link);';
    feedbackDiv.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
            <button class="feedback-btn" data-event-id="${eventId}" data-signal="thumbsup" 
                style="background:var(--accent); color:var(--accent-contrast); border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">
                👍 Helpful
            </button>
            <button class="feedback-btn" data-event-id="${eventId}" data-signal="thumbsdown"
                style="background:var(--err); color:var(--accent-contrast); border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">
                👎 Not Helpful
            </button>
            <span style="color:var(--fg-muted);font-size:11px;">or rate:</span>
            ${[1,2,3,4,5].map(n => `<button class="star-btn" data-event-id="${eventId}" data-rating="${n}" 
                style="background:transparent; color:var(--warn); border:1px solid var(--line); padding:4px 10px; border-radius:4px; cursor:pointer; font-size:13px;">
                ${'⭐'.repeat(n)}
            </button>`).join('')}
        </div>
        <details style="margin-top:8px;">
            <summary style="cursor:pointer; font-size:11px; color:var(--fg-muted);">What was missing? (optional)</summary>
            <textarea class="feedback-note" data-event-id="${eventId}" 
                placeholder="Help us improve: What information were you looking for?" 
                style="width:100%; margin-top:8px; padding:8px; background: var(--code-bg); color: var(--fg); border:1px solid var(--bg-elev2); border-radius:4px; font-size:11px; font-family:'SF Mono',monospace; resize:vertical; min-height:50px;"></textarea>
            <button class="submit-note-btn" data-event-id="${eventId}"
                style="margin-top:8px; background:var(--link); color: var(--fg); border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:11px;">
                Submit Note
            </button>
        </details>
        <div class="feedback-status" style="font-size:11px; color:var(--fg-muted); margin-top:8px;"></div>
        <div style="font-size:10px; color:var(--fg-muted); margin-top:8px; font-style:italic;">
            💡 This helps train search quality (only the reranker, not the chat model)
        </div>
    `;
    
    messageElement.appendChild(feedbackDiv);
    
    // Bind thumbs buttons
    feedbackDiv.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await submitFeedback(e.currentTarget.dataset.eventId, e.currentTarget.dataset.signal, null, feedbackDiv);
        });
    });
    
    // Bind star buttons
    feedbackDiv.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rating = e.currentTarget.dataset.rating;
            await submitFeedback(e.currentTarget.dataset.eventId, `star${rating}`, null, feedbackDiv);
        });
    });
    
    // Bind note submit
    const submitNoteBtn = feedbackDiv.querySelector('.submit-note-btn');
    if (submitNoteBtn) {
        submitNoteBtn.addEventListener('click', async (e) => {
            const note = feedbackDiv.querySelector('.feedback-note').value.trim();
            if (note) {
                await submitFeedback(e.currentTarget.dataset.eventId, 'note', note, feedbackDiv);
            }
        });
    }
}

async function submitFeedback(eventId, signal, note, feedbackDiv) {
    const statusSpan = feedbackDiv.querySelector('.feedback-status');
    
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                event_id: eventId, 
                signal: signal,
                note: note
            })
        });
        
        if (response.ok) {
            const label = signal.startsWith('star') ? `${signal.replace('star', '')} stars` : signal;
            statusSpan.textContent = `✓ Feedback recorded: ${label}`;
            statusSpan.style.color = 'var(--accent)';
            // Disable buttons after feedback
            feedbackDiv.querySelectorAll('.feedback-btn, .star-btn').forEach(b => b.disabled = true);
        } else {
            statusSpan.textContent = '✗ Failed to save';
            statusSpan.style.color = 'var(--err)';
        }
    } catch (error) {
        statusSpan.textContent = '✗ Error: ' + error.message;
        statusSpan.style.color = 'var(--err)';
    }
}

// ============ TRAINING WORKFLOW ============

async function mineTriplets() {
    const resultDiv = document.getElementById('reranker-mine-result');
    try {
        const response = await fetch('/api/reranker/mine', { method: 'POST' });
        const data = await response.json();
        if (resultDiv) resultDiv.textContent = 'Mining started...';
        startStatusPolling();
        return data;
    } catch (error) {
        if (resultDiv) resultDiv.textContent = '✗ ' + error.message;
        throw error;
    }
}

async function trainReranker(options = {}) {
    const resultDiv = document.getElementById('reranker-train-result');
    try {
        const response = await fetch('/api/reranker/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });
        const data = await response.json();
        if (resultDiv) resultDiv.textContent = 'Training started...';
        startStatusPolling();
        return data;
    } catch (error) {
        if (resultDiv) resultDiv.textContent = '✗ ' + error.message;
        throw error;
    }
}

async function evaluateReranker() {
    const resultDiv = document.getElementById('reranker-eval-result');
    try {
        const response = await fetch('/api/reranker/evaluate', { method: 'POST' });
        const data = await response.json();
        if (resultDiv) resultDiv.textContent = 'Evaluating...';
        startStatusPolling();
        return data;
    } catch (error) {
        if (resultDiv) resultDiv.textContent = '✗ ' + error.message;
        throw error;
    }
}

async function getRerankerStatus() {
    try {
        const response = await fetch('/api/reranker/status');
        const data = await response.json();
        return data;
    } catch (error) {
        return { running: false, progress: 0, task: '', message: '', result: null };
    }
}

// ============ UI UPDATES ============

let statusPollInterval = null;

function startStatusPolling() {
    if (statusPollInterval) return;
    
    statusPollInterval = setInterval(async () => {
        const status = await getRerankerStatus();
        updateRerankerStatusUI(status);
        
        // Stop polling when task completes
        if (!status.running && statusPollInterval) {
            clearInterval(statusPollInterval);
            statusPollInterval = null;
            
            // Update results display
            if (status.result) {
                updateTaskResults(status);
            }
        }
    }, 1000);
}

function updateRerankerStatusUI(status) {
    const statusEl = document.getElementById('reranker-status');
    if (!statusEl) return;
    
    if (status.running) {
        statusEl.textContent = status.message || `Running ${status.task}...`;
        statusEl.style.color = 'var(--accent)';
    } else if (status.result) {
        if (status.result.ok) {
            statusEl.textContent = status.message || 'Task complete';
            statusEl.style.color = 'var(--accent)';
        } else {
            statusEl.textContent = status.result.error || 'Task failed';
            statusEl.style.color = 'var(--err)';
        }
    } else {
        statusEl.textContent = 'Ready';
        statusEl.style.color = 'var(--fg-muted)';
    }
}

function updateTaskResults(status) {
    const task = status.task;
    const result = status.result;
    
    if (task === 'mining' && result?.output) {
        const mineDiv = document.getElementById('reranker-mine-result');
        if (mineDiv) {
            // Parse "mined X triplets from Y query events"
            const match = result.output.match(/mined (\d+) triplets from (\d+) query events/);
            if (match) {
                mineDiv.innerHTML = `✓ Mined <strong>${match[1]}</strong> triplets from ${match[2]} queries`;
                mineDiv.style.color = 'var(--accent)';
                updateTripletCount(match[1]);
            } else {
                mineDiv.textContent = '✓ ' + result.output;
                mineDiv.style.color = 'var(--accent)';
            }
        }
    } else if (task === 'training' && result?.output) {
        const trainDiv = document.getElementById('reranker-train-result');
        if (trainDiv) {
            // Parse "dev pairwise accuracy: 0.XXXX"
            const match = result.output.match(/dev pairwise accuracy: ([\d\.]+)/);
            if (match) {
                const acc = (parseFloat(match[1]) * 100).toFixed(1);
                trainDiv.innerHTML = `✓ Training complete! Dev accuracy: <strong>${acc}%</strong>`;
                trainDiv.style.color = 'var(--accent)';
            } else {
                trainDiv.textContent = '✓ Training complete';
                trainDiv.style.color = 'var(--accent)';
            }
        }
    } else if (task === 'evaluating' && result?.output) {
        const evalDiv = document.getElementById('reranker-eval-result');
        if (evalDiv) {
            evalDiv.textContent = '✓ Evaluation complete';
            evalDiv.style.color = 'var(--accent)';
        }
        // Parse and display metrics
        parseAndDisplayMetrics(result.output);
    }
}

function parseAndDisplayMetrics(output) {
    const metricsDiv = document.getElementById('reranker-metrics-display');
    if (!metricsDiv || !output) return;
    
    // Parse lines like "MRR@all: 0.XXXX" and "Hit@K: 0.XXXX"
    const mrrMatch = output.match(/MRR@all:\s*([\d\.]+)/);
    const hit1Match = output.match(/Hit@1:\s*([\d\.]+)/);
    const hit3Match = output.match(/Hit@3:\s*([\d\.]+)/);
    const hit5Match = output.match(/Hit@5:\s*([\d\.]+)/);
    const hit10Match = output.match(/Hit@10:\s*([\d\.]+)/);
    const evalMatch = output.match(/Evaluated on (\d+) items/);
    
    if (mrrMatch) {
        const mrr = (parseFloat(mrrMatch[1]) * 100).toFixed(1);
        const hit1 = hit1Match ? (parseFloat(hit1Match[1]) * 100).toFixed(1) : 'N/A';
        const hit3 = hit3Match ? (parseFloat(hit3Match[1]) * 100).toFixed(1) : 'N/A';
        const hit5 = hit5Match ? (parseFloat(hit5Match[1]) * 100).toFixed(1) : 'N/A';
        const hit10 = hit10Match ? (parseFloat(hit10Match[1]) * 100).toFixed(1) : 'N/A';
        const n = evalMatch ? evalMatch[1] : '?';
        
        metricsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div>
                    <div style="font-size:11px; color:var(--fg-muted); margin-bottom:4px;">MRR (Mean Reciprocal Rank)</div>
                    <div style="font-size:32px; color:var(--accent); font-weight:700;">${mrr}%</div>
                    <div style="font-size:10px; color:var(--fg-muted);">Evaluated on ${n} items</div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px;">
                    <div>
                        <div style="font-size:10px; color:var(--fg-muted);">Hit@1</div>
                        <div style="font-size:20px; color:var(--link); font-weight:600;">${hit1}%</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--fg-muted);">Hit@3</div>
                        <div style="font-size:20px; color:var(--link); font-weight:600;">${hit3}%</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--fg-muted);">Hit@5</div>
                        <div style="font-size:20px; color:var(--link); font-weight:600;">${hit5}%</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--fg-muted);">Hit@10</div>
                        <div style="font-size:20px; color:var(--link); font-weight:600;">${hit10}%</div>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateTripletCount(count) {
    const countDiv = document.getElementById('reranker-triplet-count');
    if (countDiv) {
        countDiv.textContent = count + ' triplets';
        countDiv.style.color = 'var(--accent)';
    }
}

// ============ STATUS & STATS ============

async function updateRerankerStats() {
    // Check if reranker is enabled
    const statusDiv = document.getElementById('reranker-enabled-status');
    if (statusDiv) {
        const config = await fetch('/api/config').then(r => r.json()).catch(() => ({env:{}}));
        const enabled = config.env?.AGRO_RERANKER_ENABLED === '1';
        statusDiv.textContent = enabled ? '✓ Enabled' : '✗ Disabled';
        statusDiv.style.color = enabled ? 'var(--accent)' : 'var(--err)';
    }
    
    // Count logged queries
    const queryCountDiv = document.getElementById('reranker-query-count');
    if (queryCountDiv) {
        try {
            const logsResp = await fetch('/api/reranker/logs/count');
            const data = await logsResp.json();
            queryCountDiv.textContent = (data.count || 0) + ' queries';
            queryCountDiv.style.color = 'var(--accent)';
        } catch {
            queryCountDiv.textContent = 'N/A';
        }
    }
    
    // Count triplets
    const tripletCountDiv = document.getElementById('reranker-triplet-count');
    if (tripletCountDiv) {
        try {
            const tripletsResp = await fetch('/api/reranker/triplets/count');
            const data = await tripletsResp.json();
            tripletCountDiv.textContent = (data.count || 0) + ' triplets';
            tripletCountDiv.style.color = 'var(--accent)';
        } catch {
            tripletCountDiv.textContent = 'N/A';
        }
    }
    
    // Load cost stats
    try {
        const costsResp = await fetch('/api/reranker/costs');
        const data = await costsResp.json();
        const cost24h = document.getElementById('reranker-cost-24h');
        const costAvg = document.getElementById('reranker-cost-avg');
        if (cost24h) {
            cost24h.textContent = '$' + (data.total_24h || 0).toFixed(4);
        }
        if (costAvg) {
            costAvg.textContent = '$' + (data.avg_per_query || 0).toFixed(6);
        }
    } catch {}
    
    // Load no-hit queries
    try {
        const nohitsResp = await fetch('/api/reranker/nohits');
        const data = await nohitsResp.json();
        const nohitsList = document.getElementById('reranker-nohits-list');
        if (nohitsList && data.queries && data.queries.length > 0) {
            nohitsList.innerHTML = data.queries.map(q => 
                `<div style="padding:6px; border-bottom:1px solid var(--line);">
                    <div style="color: var(--fg);">${q.query}</div>
                    <div style="font-size:10px; color:var(--fg-muted);">${q.ts}</div>
                </div>`
            ).join('');
        }
    } catch {}
}

// ============ LOG VIEWER ============

async function viewLogs() {
    const viewer = document.getElementById('reranker-logs-viewer');
    if (!viewer) return;
    
    try {
        const response = await fetch('/api/reranker/logs');
        const data = await response.json();
        
        if (data.logs && data.logs.length > 0) {
            viewer.innerHTML = data.logs.slice(-50).map(log => {
                const color = log.type === 'query' ? 'var(--link)' : 'var(--warn)';
                return `<div style="margin-bottom:8px; padding:8px; background: var(--code-bg); border-left:2px solid ${color};">
                    <div style="color:${color}; font-size:10px;">${log.ts} - ${log.type}</div>
                    <div style="color: var(--fg);">${log.query_raw || JSON.stringify(log).slice(0, 100)}</div>
                </div>`;
            }).join('');
            viewer.style.display = 'block';
        } else {
            viewer.innerHTML = '<div style="color:var(--fg-muted); text-align:center; padding:20px;">No logs found</div>';
            viewer.style.display = 'block';
        }
    } catch (error) {
        viewer.innerHTML = `<div style="color:var(--err);">Error loading logs: ${error.message}</div>`;
        viewer.style.display = 'block';
    }
}

async function downloadLogs() {
    try {
        const response = await fetch('/api/reranker/logs/download');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `queries-${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Failed to download logs: ' + error.message);
    }
}

async function clearLogs() {
    if (!confirm('Clear all query logs? This will delete training data. Continue?')) return;
    try {
        await fetch('/api/reranker/logs/clear', { method: 'POST' });
        alert('Logs cleared');
        updateRerankerStats();
    } catch (error) {
        alert('Failed to clear logs: ' + error.message);
    }
}

// ============ AUTOMATION ============

async function setupNightlyJob() {
    const timeInput = document.getElementById('reranker-cron-time');
    const statusDiv = document.getElementById('reranker-cron-status');
    const time = timeInput?.value || '02:15';
    
    try {
        const response = await fetch('/api/reranker/cron/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: time })
        });
        const data = await response.json();
        if (statusDiv) {
            statusDiv.textContent = data.ok ? `✓ Nightly job scheduled for ${time}` : '✗ ' + (data.error || 'Failed');
            statusDiv.style.color = data.ok ? 'var(--accent)' : 'var(--err)';
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.textContent = '✗ ' + error.message;
            statusDiv.style.color = 'var(--err)';
        }
    }
}

async function removeNightlyJob() {
    const statusDiv = document.getElementById('reranker-cron-status');
    try {
        const response = await fetch('/api/reranker/cron/remove', { method: 'POST' });
        const data = await response.json();
        if (statusDiv) {
            statusDiv.textContent = data.ok ? '✓ Nightly job removed' : '✗ ' + (data.error || 'Failed');
            statusDiv.style.color = data.ok ? 'var(--accent)' : 'var(--err)';
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.textContent = '✗ ' + error.message;
            statusDiv.style.color = 'var(--err)';
        }
    }
}

// ============ BASELINES ============

async function saveBaseline() {
    try {
        const response = await fetch('/api/reranker/baseline/save', { method: 'POST' });
        const data = await response.json();
        if (data.ok) {
            alert('✓ Baseline saved! Model backed up to .baseline');
        } else {
            alert('Failed: ' + (data.error || 'Unknown'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function compareBaseline() {
    try {
        const response = await fetch('/api/reranker/baseline/compare');
        const data = await response.json();
        if (data.ok) {
            const delta = data.delta || {};
            const mrrDelta = (delta.mrr * 100).toFixed(1);
            const hit1Delta = (delta.hit1 * 100).toFixed(1);
            
            let message = `📊 Comparison vs Baseline:\n\n`;
            message += `MRR: ${delta.mrr > 0 ? '+' : ''}${mrrDelta}%\n`;
            message += `Hit@1: ${delta.hit1 > 0 ? '+' : ''}${hit1Delta}%\n\n`;
            
            // Promotion gating
            if (delta.mrr < -0.02 || delta.hit1 < -0.05) {
                message += '⚠️ WARNING: Metrics WORSE than baseline!\nConsider rolling back or retraining.';
            } else if (delta.mrr > 0.02 || delta.hit1 > 0.05) {
                message += '✓ IMPROVEMENT detected!\nSafe to enable in production.';
            } else {
                message += '→ Marginal change. Consider more training data.';
            }
            
            alert(message);
        } else {
            alert('No baseline found or comparison failed');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function rollbackModel() {
    if (!confirm('Rollback to previous model? This will copy models/cross-encoder-agro.backup to active.')) return;
    try {
        const response = await fetch('/api/reranker/rollback', { method: 'POST' });
        const data = await response.json();
        alert(data.ok ? '✓ Model rolled back. Restart server to use.' : '✗ ' + (data.error || 'Failed'));
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ============ SMOKE TEST ============

async function runSmokeTest() {
    const queryInput = document.getElementById('reranker-test-query');
    const resultDiv = document.getElementById('reranker-smoke-result');
    const query = queryInput?.value?.trim();
    
    if (!query) {
        alert('Enter a test query');
        return;
    }
    
    if (resultDiv) resultDiv.style.display = 'block';
    if (resultDiv) resultDiv.textContent = 'Running smoke test...';
    
    try {
        const response = await fetch('/api/reranker/smoketest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const data = await response.json();
        
        if (resultDiv && data.ok) {
            resultDiv.innerHTML = `
                <div style="color:var(--accent); margin-bottom:8px;">✓ Smoke test passed!</div>
                <div>Query logged: ${data.logged ? '✓' : '✗'}</div>
                <div>Results retrieved: ${data.results_count || 0}</div>
                <div>Reranker applied: ${data.reranked ? '✓' : '✗'}</div>
                <div>Event ID: <code>${data.event_id || 'N/A'}</code></div>
                <div style="margin-top:8px; color:var(--fg-muted);">Full log entry created successfully.</div>
            `;
        } else if (resultDiv) {
            resultDiv.innerHTML = `<div style="color:var(--err);">✗ Test failed: ${data.error || 'Unknown'}</div>`;
        }
    } catch (error) {
        if (resultDiv) {
            resultDiv.innerHTML = `<div style="color:var(--err);">✗ Error: ${error.message}</div>`;
        }
    }
}

// ============ INITIALIZE ============

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Mine button
        const mineBtn = document.getElementById('reranker-mine-btn');
        if (mineBtn) {
            mineBtn.addEventListener('click', async () => {
                mineBtn.disabled = true;
                mineBtn.textContent = 'Mining...';
                try {
                    await mineTriplets();
                } catch (error) {
                    alert(error.message);
                } finally {
                    setTimeout(() => {
                        mineBtn.disabled = false;
                        mineBtn.textContent = 'Mine Triplets';
                    }, 2000);
                }
            });
        }
        
        // Train button
        const trainBtn = document.getElementById('reranker-train-btn');
        if (trainBtn) {
            trainBtn.addEventListener('click', async () => {
                const epochs = parseInt(document.getElementById('reranker-epochs')?.value || '2');
                const batchSize = parseInt(document.getElementById('reranker-batch')?.value || '16');
                
                trainBtn.disabled = true;
                trainBtn.textContent = 'Training...';
                try {
                    await trainReranker({ epochs, batch_size: batchSize });
                } catch (error) {
                    alert(error.message);
                } finally {
                    setTimeout(() => {
                        trainBtn.disabled = false;
                        trainBtn.textContent = 'Train Model';
                    }, 2000);
                }
            });
        }
        
        // Eval button
        const evalBtn = document.getElementById('reranker-eval-btn');
        if (evalBtn) {
            evalBtn.addEventListener('click', async () => {
                evalBtn.disabled = true;
                evalBtn.textContent = 'Evaluating...';
                try {
                    await evaluateReranker();
                } catch (error) {
                    alert(error.message);
                } finally {
                    setTimeout(() => {
                        evalBtn.disabled = false;
                        evalBtn.textContent = 'Evaluate';
                    }, 2000);
                }
            });
        }
        
        // Log viewer buttons
        const viewLogsBtn = document.getElementById('reranker-view-logs');
        if (viewLogsBtn) viewLogsBtn.addEventListener('click', viewLogs);
        
        const downloadLogsBtn = document.getElementById('reranker-download-logs');
        if (downloadLogsBtn) downloadLogsBtn.addEventListener('click', downloadLogs);
        
        const clearLogsBtn = document.getElementById('reranker-clear-logs');
        if (clearLogsBtn) clearLogsBtn.addEventListener('click', clearLogs);
        
        // Automation buttons
        const setupCronBtn = document.getElementById('reranker-setup-cron');
        if (setupCronBtn) setupCronBtn.addEventListener('click', setupNightlyJob);
        
        const removeCronBtn = document.getElementById('reranker-remove-cron');
        if (removeCronBtn) removeCronBtn.addEventListener('click', removeNightlyJob);
        
        // Baseline buttons
        const saveBaselineBtn = document.getElementById('reranker-save-baseline');
        if (saveBaselineBtn) saveBaselineBtn.addEventListener('click', saveBaseline);
        
        const compareBaselineBtn = document.getElementById('reranker-compare-baseline');
        if (compareBaselineBtn) compareBaselineBtn.addEventListener('click', compareBaseline);
        
        const rollbackBtn = document.getElementById('reranker-rollback');
        if (rollbackBtn) rollbackBtn.addEventListener('click', rollbackModel);
        
        // Smoke test button
        const smokeTestBtn = document.getElementById('reranker-smoke-test');
        if (smokeTestBtn) smokeTestBtn.addEventListener('click', runSmokeTest);
        
        // Load initial stats when reranker tab is activated
        const rerankerTab = document.querySelector('[data-tab="reranker"]');
        if (rerankerTab) {
            rerankerTab.addEventListener('click', () => {
                setTimeout(updateRerankerStats, 100);
            });
        }
    });
}

console.log('✓ Reranker module loaded');
