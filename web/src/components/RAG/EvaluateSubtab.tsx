// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function EvaluateSubtab() {
  const htmlContent = `                    <!-- Golden Questions Manager -->
                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span class="accent-blue">●</span> Golden Questions Manager
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Golden Questions</span>
                                    Questions with known-good answers used to measure RAG quality. Each question should have expected file paths that contain the answer.
                                    <div class="tt-badges">
                                        <span class="tt-badge info">Quality Assurance</span>
                                        <span class="tt-badge">No Re-index</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p class="small">Manage test questions for evaluating retrieval quality. Add, edit, test individual questions, or run full evaluation suite.</p>

                        <!-- Add New Question Form -->
                        <div id="golden-add-form" style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                            <h4 style="font-size: 13px; color: var(--accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Add New Question</h4>
                            <div class="input-group" style="margin-bottom: 12px;">
                                <label>Question Text</label>
                                <textarea id="golden-new-q" placeholder="e.g., Where is OAuth token validated?" style="min-height: 60px;"></textarea>
                            </div>
                            <div class="input-row" style="margin-bottom: 12px;">
                                <div class="input-group">
                                    <label>Repository</label>
                                    <select id="golden-new-repo">
                                        <option value="agro">agro</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Expected Paths (comma-separated)</label>
                                    <input type="text" id="golden-new-paths" placeholder="auth, oauth, token">
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="small-button" id="btn-golden-add" style="background: var(--accent); color: var(--accent-contrast); border: none; width: auto; flex: 1;">Add Question</button>
                                <button class="small-button" id="btn-golden-test-new" style="width: auto;">Test First</button>
                            </div>
                        </div>

                        <!-- Questions List -->
                        <div id="golden-questions-list" style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px; max-height: 400px; overflow-y: auto;">
                            <div id="golden-questions-content" style="font-size: 13px; color: var(--fg-muted);">
                                Loading questions...
                            </div>
                        </div>

                        <div class="action-buttons" style="margin-top: 16px; display:flex; gap:8px; flex-wrap:wrap;">
                            <button id="btn-golden-refresh" style="flex: 1;">Refresh List</button>
                            <button id="btn-golden-load-recommended" style="flex: 1; background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link);">Load Recommended</button>
                            <button id="btn-golden-run-tests" style="flex: 1; background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link);">Run All Tests</button>
                            <button id="btn-golden-export" style="flex: 1; background: var(--bg-elev2); color: var(--accent);">Export JSON</button>
                        </div>
                    </div>

                    <!-- Evaluation Runner -->
                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span class="accent-purple">●</span> Evaluation Runner
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Evaluation System</span>
                                    Runs all golden questions and measures retrieval accuracy. Tracks regressions vs. saved baseline.
                                    <div class="tt-badges">
                                        <span class="tt-badge info">Accuracy Metrics</span>
                                        <span class="tt-badge warn">Can Be Slow</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p class="small">Run full evaluation suite to measure RAG quality. Compare against baseline to detect regressions.</p>

                        <!-- Settings -->
                        <div class="input-row" style="margin-bottom: 16px;">
                            <div class="input-group">
                                <label>
                                    Use Multi-Query
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Multi-Query Expansion</span>
                                            Generate multiple query variations for better recall. Increases API costs but improves accuracy. Recommended: enabled.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Better Recall</span>
                                                <span class="tt-badge warn">Higher Cost</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select id="eval-use-multi">
                                    <option value="1">Yes</option>
                                    <option value="0">No</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Final K Results
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Results Count</span>
                                            Number of results to return per question. Higher = more context but more noise. Recommended: 5-10.
                                        </div>
                                    </span>
                                </label>
                                <input type="number" id="eval-final-k" name="EVAL_FINAL_K" value="5" min="1" max="20">
                            </div>
                            <div class="input-group">
                                <label>
                                    Sample Size
                                    <span class="help-icon" data-tooltip="EVAL_SAMPLE_SIZE">?</span>
                                </label>
                                <select id="eval-sample-size" name="eval_sample_size">
                                    <option value="">Full (All Questions)</option>
                                    <option value="10">Quick (10 Questions)</option>
                                    <option value="25">Medium (25 Questions)</option>
                                    <option value="50">Large (50 Questions)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Eval Paths -->
                        <div class="input-row" style="margin-bottom: 16px;">
                            <div class="input-group" style="flex: 2;">
                                <label>
                                    Golden Questions Path
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">GOLDEN_PATH</span>
                                            Path to your evaluation questions JSON. Defaults to data/golden.json.
                                        </div>
                                    </span>
                                </label>
                                <input type="text" id="eval-golden-path" name="EVAL_GOLDEN_PATH" placeholder="data/golden.json">
                            </div>
                            <div class="input-group" style="flex: 2;">
                                <label>
                                    Baseline Path
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">BASELINE_PATH</span>
                                            Where evaluation baselines are saved/compared. Defaults to data/evals/eval_baseline.json.
                                        </div>
                                    </span>
                                </label>
                                <input type="text" id="eval-baseline-path" name="EVAL_BASELINE_PATH" placeholder="data/evals/eval_baseline.json">
                            </div>
                        </div>

                        <div class="input-row" style="margin-bottom: 16px; justify-content: flex-end;">
                            <button id="btn-eval-save-settings" class="small-button" style="background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link); padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                                Save Eval Settings
                            </button>
                        </div>

                        <!-- Run Button -->
                        <button class="action-buttons" id="btn-eval-run" style="width: 100%; background: var(--link); color: var(--accent-contrast); font-size: 15px; padding: 14px;">
                            Run Full Evaluation
                        </button>

                        <!-- Progress -->
                        <div id="eval-progress" style="margin-top: 16px; display: none;">
                            <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                                <div id="eval-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--link) 0%, var(--accent) 100%); transition: width 0.3s ease;"></div>
                            </div>
                            <div id="eval-status" class="mono" style="font-size: 12px; color: var(--fg-muted); text-align: center;">—</div>
                        </div>

                        <!-- Results Display -->
                        <div id="eval-results" style="margin-top: 16px; display: none;">
                            <!-- Overall Metrics -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Top-1 Accuracy</div>
                                    <div id="eval-top1-acc" class="mono" style="font-size: 24px; color: var(--accent); font-weight: 700;">—</div>
                                </div>
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Top-K Accuracy</div>
                                    <div id="eval-topk-acc" class="mono" style="font-size: 24px; color: var(--accent); font-weight: 700;">—</div>
                                </div>
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Duration</div>
                                    <div id="eval-duration" class="mono" style="font-size: 24px; color: var(--link); font-weight: 700;">—</div>
                                </div>
                            </div>

                            <!-- Per-Question Results -->
                            <div id="eval-details" style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px; max-height: 300px; overflow-y: auto;"></div>

                            <!-- Baseline Actions -->
                            <div class="action-buttons" style="margin-top: 16px;">
                                <button id="btn-eval-save-baseline" style="flex: 1;">Save as Baseline</button>
                                <button id="btn-eval-compare" style="flex: 1; background: var(--bg-elev2); color: var(--accent);">Compare to Baseline</button>
                                <button id="btn-eval-export" style="flex: 1; background: var(--bg-elev2); color: var(--accent);">Export Results</button>
                            </div>
                        </div>

                        <!-- Comparison Results -->
                        <div id="eval-comparison" style="margin-top: 16px; display: none;"></div>

                        <!-- Evaluation Run History -->
                        <div style="margin-top: 24px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 8px; padding: 20px;">
                            <h4 style="margin: 0 0 8px 0; color: var(--fg); display: flex; align-items: center; gap: 8px;">
                                <span style="color: var(--accent-green);">●</span>
                                Evaluation Run History
                            </h4>
                            <p class="small" style="color: var(--fg-muted); margin: 0 0 16px 0;">Compare BM25-only baseline vs trained cross-encoder performance across runs.</p>

                            <div style="overflow-x: auto;">
                                <table id="eval-history-table" style="width: 100%; font-size: 12px; border-collapse: collapse; background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px;">
                                    <thead>
                                        <tr style="background: var(--bg-elev2); border-bottom: 2px solid var(--line);">
                                            <th style="padding: 10px; text-align: left; color: var(--fg-muted); font-weight: 600;">Timestamp</th>
                                            <th style="padding: 10px; text-align: left; color: var(--fg-muted); font-weight: 600;">Configuration</th>
                                            <th style="padding: 10px; text-align: center; color: var(--fg-muted); font-weight: 600;">Top-1</th>
                                            <th style="padding: 10px; text-align: center; color: var(--fg-muted); font-weight: 600;">Top-5</th>
                                            <th style="padding: 10px; text-align: center; color: var(--fg-muted); font-weight: 600;">Time (s)</th>
                                            <th style="padding: 10px; text-align: center; color: var(--fg-muted); font-weight: 600;">Δ Top-5</th>
                                        </tr>
                                    </thead>
                                    <tbody id="eval-history-tbody">
                                        <tr>
                                            <td colspan="6" style="padding: 20px; text-align: center; color: var(--fg-muted);">No evaluation history yet. Run evaluations to see comparisons.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style="margin-top: 12px; display: flex; gap: 8px;">
                                <button id="btn-eval-history-refresh" style="flex: 1; background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link); padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Refresh History</button>
                                <button id="btn-eval-history-clear" style="flex: 1; background: var(--bg-elev2); color: var(--warn); border: 1px solid var(--warn); padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear History</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Profiles (NEW - consolidates analytics-cost + settings-profiles) -->
            <div id="tab-profiles" class="tab-content">
                <div id="tab-profiles-budget" class="section-subtab active">
                <!-- Budget Calculator & Cost Tracking (from analytics-cost) -->
                <div class="settings-section" style="border-left: 3px solid var(--warn);">
                    <h3>⚠️ Cost & Token Burn Alerts</h3>
                    <p class="small">Set thresholds to receive alerts when costs or token consumption spike or sustain high rates.</p>

                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Cost Spike Alert (USD/hour)
                                <span class="help-icon" data-tooltip="ALERT_COST_BURN_SPIKE_USD_PER_HOUR">?</span>
                            </label>
                            <input type="number" id="alert_cost_burn_spike_usd_per_hour" min="0.01" max="100" step="0.01" placeholder="0.10">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Alert when hourly burn exceeds this amount</p>
                        </div>
                        <div class="input-group">
                            <label>
                                Token Spike (tokens/min)
                                <span class="help-icon" data-tooltip="ALERT_TOKEN_BURN_SPIKE_PER_MINUTE">?</span>
                            </label>
                            <input type="number" id="alert_token_burn_spike_per_minute" min="100" max="100000" step="100" placeholder="5000">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Alert on sudden spike above this rate</p>
                        </div>
                    </div>

                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Token Burn Sustained (tokens/min)
                                <span class="help-icon" data-tooltip="ALERT_TOKEN_BURN_SUSTAINED_PER_MINUTE">?</span>
                            </label>
                            <input type="number" id="alert_token_burn_sustained_per_minute" min="100" max="100000" step="100" placeholder="2000">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Alert if sustained for 15+ minutes</p>
                        </div>
                    </div>
                </div>

                <!-- Budget Alerts -->
                <div class="settings-section" style="border-left: 3px solid var(--accent);">
                    <h3>💰 Budget Alerts</h3>
                    <p class="small">Set monthly budget limits and warning thresholds.</p>

                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Monthly Budget (USD)
                                <span class="help-icon" data-tooltip="ALERT_MONTHLY_BUDGET_USD">?</span>
                            </label>
                            <input type="number" id="alert_monthly_budget_usd" min="1" max="10000" step="1" placeholder="500">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Hard limit for monthly spending</p>
                        </div>
                        <div class="input-group">
                            <label>
                                Budget Warning Level (USD)
                                <span class="help-icon" data-tooltip="ALERT_BUDGET_WARNING_USD">?</span>
                            </label>
                            <input type="number" id="alert_budget_warning_usd" min="1" max="10000" step="1" placeholder="400">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Alert when spending exceeds this</p>
                        </div>
                    </div>

                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Budget Critical Level (USD)
                                <span class="help-icon" data-tooltip="ALERT_BUDGET_CRITICAL_USD">?</span>
                            </label>
                            <input type="number" id="alert_budget_critical_usd" min="1" max="10000" step="1" placeholder="450">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Critical alert when spending exceeds this</p>
                        </div>
                    </div>
                </div>

                <!-- Storage Calculator -->
                <div id="storage-calculator-container"></div>

`;

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
