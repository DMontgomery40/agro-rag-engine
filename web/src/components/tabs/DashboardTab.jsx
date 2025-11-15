export default function DashboardTab() {
  return (
    <div id="tab-dashboard" className="tab-content active">
      {/* Compact Status + Quick Actions */}
                <div className="settings-section" style={{background: 'var(--panel)', borderLeft: '3px solid var(--accent)'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start'}}>
                        {/* Left: Status Overview */}
                        <div>
                            <h3 style={{fontSize: '14px', marginBottom: '16px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)'}}></span>
                                System Status
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)'}}>
                                    <span style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Health</span>
                                    <span id="dash-health" className="mono" style={{color: 'var(--ok)', fontWeight: '600'}}>—</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)'}}>
                                    <span style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Repo</span>
                                    <span id="dash-repo" className="mono" style={{color: 'var(--fg)', fontWeight: '600'}}>—</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)'}}>
                                    <span style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Cards</span>
                                    <span id="dash-cards" className="mono" style={{color: 'var(--link)', fontWeight: '600'}}>—</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)'}}>
                                    <span style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>MCP</span>
                                    <span id="dash-mcp" className="mono" style={{color: 'var(--link)', fontWeight: '600'}}>—</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)'}}>
                                    <span style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Auto-Tune</span>
                                    <span id="dash-autotune" className="mono" style={{color: 'var(--warn)', fontWeight: '600'}}>—</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Quick Actions */}
                        <div>
                            <h3 style={{fontSize: '14px', marginBottom: '16px', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                Quick Actions
                            </h3>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px'}}>
                                <button className="action-btn" id="btn-generate-keywords" data-action="generate-keywords">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2l2.39 4.85L20 8l-4 3.9.95 5.54L12 15.77 7.05 17.45 8 11.9 4 8l5.61-1.15L12 2z"></path>
                                    </svg>
                                    <span>Generate Keywords</span>
                                </button>
                                <button className="action-btn" id="dash-change-repo" data-action="change-repo">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                    </svg>
                                    <span>Change Repo</span>
                                </button>
                                <button className="action-btn" id="dash-index-start" data-action="index">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                    </svg>
                                    <span>Run Indexer</span>
                                </button>
                                <button className="action-btn" id="dash-reload-config" data-action="reload">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <span>Reload Config</span>
                                </button>
                                <button className="action-btn" id="dash-cards-refresh" data-action="refresh">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="1 4 1 10 7 10"></polyline>
                                        <polyline points="23 20 23 14 17 14"></polyline>
                                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                                    </svg>
                                    <span>Refresh Status</span>
                                </button>
                            </div>

                            {/* Status Display */}
                            <div id="dash-index-status" style={{background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', fontFamily: "'SF Mono', monospace", fontSize: '12px', lineHeight: '1.6', color: 'var(--fg-muted)', minHeight: '48px'}}></div>

                            {/* Progress Bar */}
                            <div style={{marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '4px', height: '8px', overflow: 'hidden'}}>
                                <div id="dash-index-bar" style={{height: '100%', width: '0%', background: 'linear-gradient(90deg, var(--warn) 0%, var(--accent) 100%)', transition: 'width 0.3s ease, opacity 0.3s ease'}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section wizard">
                    <h3><span className="accent-blue">●</span> Auto-Profile</h3>
                    <p className="small" style={{marginBottom: '20px', color: 'var(--fg-muted)', lineHeight: '1.6', fontSize: '14px'}}>
                        The only platform where you can mix any provider, model, and database.
                        We analyze your hardware and budget to configure the optimal RAG automatically.
                    </p>

                    <div style={{display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px'}}>
                        {/* Left: Input Panel */}
                        <div>
                            <div className="input-group" style={{marginBottom: '20px'}}>
                                <label>Monthly Budget ($)</label>
                                <input type="number" id="budget" value="0" min="0" placeholder="0" style={{fontSize: '16px', padding: '12px'}} />
                            </div>

                            <div className="input-row" style={{marginBottom: '8px'}}>
                                <div className="input-group">
                                    <label><span style={{color: 'var(--warn)'}}>Auto‑Profile Engine</span></label>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <input type="checkbox" id="apv2-enabled" style={{width: 'auto'}} />
                                        <span style={{fontSize: '12px', color: 'var(--fg-muted)'}}>Use v2 engine (deterministic selector)</span>
                                    </div>
                                </div>
                            </div>

                            <button className="small-button" id="btn-wizard-oneclick" style={{background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', width: '100%', padding: '14px 20px', fontSize: '15px', fontWeight: '700', marginBottom: '16px'}}>
                                Configure Automatically
                            </button>

                            <div id="scan-out" className="result-display" style={{display: 'none'}}></div>

                            <div style={{marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px'}}>
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                                    <span style={{fontSize: '12px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600'}}>Quick Options</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <button className="small-button" style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)'}} onClick={() => { document.getElementById('budget').value=0; document.getElementById('btn-wizard-oneclick').click(); }}>
                                        Free Tier (Local Only)
                                    </button>
                                    <button className="small-button" style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)'}} onClick={() => { document.getElementById('budget').value=10; document.getElementById('btn-wizard-oneclick').click(); }}>
                                        Starter ($10/mo)
                                    </button>
                                    <button className="small-button" style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)'}} onClick={() => { document.getElementById('budget').value=50; document.getElementById('btn-wizard-oneclick').click(); }}>
                                        Professional ($50/mo)
                                    </button>
                                    <button className="small-button" style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)'}} onClick={() => { document.getElementById('budget').value=200; document.getElementById('btn-wizard-oneclick').click(); }}>
                                        Enterprise ($200/mo)
                                    </button>
                                </div>
                            </div>

                            {/* Advanced (v2) */}
                            <div style={{marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px'}}>
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', cursor: 'pointer'}} onClick={(e) => { e.currentTarget.nextElementSibling.style.display = (e.currentTarget.nextElementSibling.style.display==='none'?'block':'none'); }}>
                                    <span style={{fontSize: '12px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600'}}>Advanced (v2)</span>
                                    <span style={{fontSize: '12px', color: 'var(--fg-muted)'}}>toggle</span>
                                </div>
                                <div id="apv2-advanced" style={{display: 'none'}}>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Objective</label>
                                            <select id="apv2-mode">
                                                <option value="balanced">Balanced</option>
                                                <option value="cost">Cost</option>
                                                <option value="performance">Performance</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Monthly Budget (override)</label>
                                            <input type="number" id="apv2-budget" placeholder="uses Budget if empty" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group full-width">
                                            <label>Providers Allowed</label>
                                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="openai" className="apv2-prov" style={{width: 'auto'}} /> openai</label>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="anthropic" className="apv2-prov" style={{width: 'auto'}} /> anthropic</label>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="google" className="apv2-prov" style={{width: 'auto'}} /> google</label>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="voyage" className="apv2-prov" style={{width: 'auto'}} /> voyage</label>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="cohere" className="apv2-prov" style={{width: 'auto'}} /> cohere</label>
                                                <label style={{fontSize: '12px', color: 'var(--fg-muted)'}}><input type="checkbox" value="local" className="apv2-prov" style={{width: 'auto'}} /> local</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Regions Allowed (CSV)</label>
                                            <input type="text" id="apv2-regions" placeholder="us,eu" />
                                        </div>
                                        <div className="input-group">
                                            <label>Compliance (CSV)</label>
                                            <input type="text" id="apv2-compliance" placeholder="soc2,hipaa" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Requests/Day</label>
                                            <input type="number" id="apv2-rpd" placeholder="e.g. 100" />
                                        </div>
                                        <div className="input-group">
                                            <label>Tokens In / Request</label>
                                            <input type="number" id="apv2-tin" placeholder="e.g. 600" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Tokens Out / Request</label>
                                            <input type="number" id="apv2-tout" placeholder="e.g. 1200" />
                                        </div>
                                        <div className="input-group">
                                            <label>Multi‑Query Rewrites</label>
                                            <input type="number" id="apv2-mq" placeholder="e.g. 4" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Embed Tokens / Request</label>
                                            <input type="number" id="apv2-embt" placeholder="optional" />
                                        </div>
                                        <div className="input-group">
                                            <label>Rerank Tokens / Request</label>
                                            <input type="number" id="apv2-rrt" placeholder="optional" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Latency Target (ms)</label>
                                            <input type="number" id="apv2-latency" placeholder="optional" />
                                        </div>
                                        <div className="input-group">
                                            <label>Min Throughput (QPS)</label>
                                            <input type="number" id="apv2-minqps" placeholder="optional" />
                                        </div>
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group full-width">
                                            <label>Heuristic Quality Fallback</label>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                <input type="checkbox" id="apv2-heuristics" style={{width: 'auto'}} />
                                                <span style={{fontSize: '12px', color: 'var(--fg-muted)'}}>Use heuristics when prices.json lacks quality_score (advanced)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Results Panel */}
                        <div id="profile-results-panel" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '24px', minHeight: '500px'}}>
                            <div id="profile-placeholder" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-muted)', textAlign: 'center'}}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{marginBottom: '16px', opacity: '0.3'}}>
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    <path d="M9 12h6m-6 4h6"/>
                                </svg>
                                <p style={{fontSize: '14px', lineHeight: '1.6', maxWidth: '300px'}}>
                                    Click "Configure Automatically" or select a quick option to generate your optimized RAG profile based on your hardware and budget.
                                </p>
                            </div>
                            <div id="profile-results-content" style={{display: 'none'}}></div>
                        </div>
                    </div>
                </div>

                {/* Monitoring Logs (Dashboard snapshot) */}
                <div className="settings-section" style={{marginTop: '16px'}}>
                    <h3>📜 Monitoring Logs</h3>
                    <p className="small" style={{color: 'var(--fg-muted)', marginBottom: '8px'}}>Recent alerts and system notices from Alertmanager webhook log. Full controls are under Analytics → Performance.</p>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start'}}>
                        <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px'}}>
                            <h4 style={{margin: '0 0 8px 0', color: 'var(--accent)'}}>Recent Alerts</h4>
                            <div id="alert-status-container" style={{minHeight: '48px', fontSize: '12px', color: 'var(--fg)'}}></div>
                        </div>
                        <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px'}}>
                            <h4 style={{margin: '0 0 8px 0', color: 'var(--link)'}}>Alert History</h4>
                            <div id="alert-history-container" style={{minHeight: '48px', fontSize: '12px', color: 'var(--fg)'}}></div>
                        </div>
                    </div>
                </div>
    </div>
  );
}
