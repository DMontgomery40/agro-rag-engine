import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { LiveTerminal } from '../components/ui/LiveTerminal';
import { DashboardSubtabs } from '../components/Dashboard/DashboardSubtabs';
import { HelpGlossary } from '../components/Dashboard/HelpGlossary';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubtab, setActiveSubtab] = useState(searchParams.get('subtab') || 'overview');

  // Update URL when subtab changes
  useEffect(() => {
    if (activeSubtab !== 'overview') {
      setSearchParams({ subtab: activeSubtab });
    } else {
      setSearchParams({});
    }
  }, [activeSubtab, setSearchParams]);

  // Listen for URL changes (e.g., from Learn button)
  useEffect(() => {
    const urlSubtab = searchParams.get('subtab');
    if (urlSubtab && urlSubtab !== activeSubtab) {
      setActiveSubtab(urlSubtab);
    }
  }, [searchParams, activeSubtab]);

  const {
    rerankerOptions,
    isEvalDropdownOpen,
    toggleEvalDropdown,
    runEval,
    branch,
    repo,
    health,
    cards,
    mcp,
    autotune,
    runIndexer,
    runKeywords,
    indexStatus,
    isTerminalVisible,
    terminalTitle,
    terminalLines,
    terminalProgress,
    hideTerminal,
  } = useDashboard();

  return (
    <div id="tab-dashboard" className="tab-content active">
      {/* Subtab navigation */}
      <DashboardSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* Subtab content */}
      {activeSubtab === 'overview' && (
        <>
      {/* Compact Status + Quick Actions */}
      <div className="settings-section" style={{ background: 'var(--panel)', borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: System Status */}
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}></span>
              System Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Health</span>
                <span id="dash-health" className="mono" style={{ color: 'var(--ok)', fontWeight: '600' }}>{health}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Repo</span>
                <span id="dash-repo" className="mono" style={{ color: 'var(--fg)', fontWeight: '600' }}>{repo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch</span>
                <span id="dash-branch" className="mono" style={{ color: 'var(--link)', fontWeight: '600' }}>{branch}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cards</span>
                <span id="dash-cards" className="mono" style={{ color: 'var(--link)', fontWeight: '600' }}>{cards}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MCP Servers</span>
                <div id="dash-mcp" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', fontFamily: "'SF Mono', monospace", color: 'var(--link)' }}>
                  <span>{mcp}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Tune</span>
                <span id="dash-autotune" className="mono" style={{ color: 'var(--warn)', fontWeight: '600' }}>{autotune}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Quick Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <button className="action-btn" id="btn-generate-keywords" data-action="generate-keywords" onClick={runKeywords}>
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
              <button className="action-btn" id="dash-index-start" data-action="index" onClick={runIndexer}>
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
              <div style={{ position: 'relative' }}>
                <button className="action-btn" id="dash-eval-trigger" onClick={toggleEvalDropdown} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Run Eval</span>
                  <svg id="dash-eval-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isEvalDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {isEvalDropdownOpen && (
                  <div id="dash-eval-dropdown" style={{
                    display: 'block',
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    marginTop: '4px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--line)', fontSize: '10px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Reranker Model</div>
                    {rerankerOptions.map((option, index) => (
                        <button key={option.id} className="eval-model-btn" data-model={option.id} data-backend={option.backend} onClick={() => runEval(option.id, option.backend)} style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--fg)',
                            fontSize: '12px',
                            borderBottom: index < rerankerOptions.length - 1 ? '1px solid var(--bg-elev2)' : 'none',
                            transition: 'background 0.2s ease',
                        }}>
                            {option.label}
                        </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="action-btn" id="dash-refresh-status" data-action="refresh">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Status Display */}
            <div id="dash-index-status" style={{ background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', fontFamily: "'SF Mono', monospace", fontSize: '12px', lineHeight: '1.6', color: 'var(--fg-muted)', minHeight: '48px' }}>
                {indexStatus?.lines.join('\n')}
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div id="dash-index-bar" style={{ height: '100%', width: indexStatus?.running ? '50%' : (indexStatus?.metadata ? '100%' : '0%'), background: 'linear-gradient(90deg, var(--warn) 0%, var(--accent) 100%)', transition: 'width 0.3s ease, opacity 0.3s ease' }}></div>
            </div>

            {/* Live Terminal Container (shared for keywords, indexer, eval) */}
            <div id="dash-operations-terminal">
                <LiveTerminal 
                    title={terminalTitle}
                    isVisible={isTerminalVisible}
                    onClose={hideTerminal}
                    lines={terminalLines}
                    progress={terminalProgress}
                />
            </div>
          </div>
        </div>
      </div>

      {/* Top Accessed Folders Section */}
      <div className="settings-section" style={{ background: 'var(--panel)', borderLeft: '3px solid var(--warn)' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          Top Folders (Last 5 Days)
        </h3>
        <div id="dash-top-folders-metrics" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>Loading folder data...</div>
      </div>

      <div className="settings-section wizard">
        <h3><span className="accent-blue">●</span> Auto-Profile</h3>
        <p className="small" style={{ marginBottom: '20px', color: 'var(--fg-muted)', lineHeight: '1.6', fontSize: '14px' }}>
          The only platform where you can mix any provider, model, and database.
          We analyze your hardware and budget to configure the optimal RAG automatically.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* Left: Input Panel */}
          <div>
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label>Monthly Budget ($)</label>
              <input type="number" id="budget" defaultValue="0" min="0" placeholder="0" style={{ fontSize: '16px', padding: '12px' }} />
            </div>

            <div className="input-row" style={{ marginBottom: '8px' }}>
              <div className="input-group">
                <label><span style={{ color: 'var(--warn)' }}>Auto‑Profile Engine</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="apv2-enabled" style={{ width: 'auto' }} />
                  <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Use v2 engine (deterministic selector)</span>
                </div>
              </div>
            </div>

            <button className="small-button" id="btn-wizard-oneclick" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', width: '100%', padding: '14px 20px', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
              Configure Automatically
            </button>

            <div id="scan-out" className="result-display" style={{ display: 'none' }}></div>

            <div style={{ marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Quick Options</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="small-button" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)' }} onClick={() => { (document.getElementById('budget') as HTMLInputElement).value = '0'; (document.getElementById('btn-wizard-oneclick') as HTMLButtonElement).click(); }}>
                  Free Tier (Local Only)
                </button>
                <button className="small-button" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)' }} onClick={() => { (document.getElementById('budget') as HTMLInputElement).value = '10'; (document.getElementById('btn-wizard-oneclick') as HTMLButtonElement).click(); }}>
                  Starter ($10/mo)
                </button>
                <button className="small-button" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)' }} onClick={() => { (document.getElementById('budget') as HTMLInputElement).value = '50'; (document.getElementById('btn-wizard-oneclick') as HTMLButtonElement).click(); }}>
                  Professional ($50/mo)
                </button>
                <button className="small-button" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--line)', color: 'var(--fg-muted)' }} onClick={() => { (document.getElementById('budget') as HTMLInputElement).value = '200'; (document.getElementById('btn-wizard-oneclick') as HTMLButtonElement).click(); }}>
                  Enterprise ($200/mo)
                </button>
              </div>
            </div>

            {/* Advanced (v2) */}
            <div style={{ marginTop: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', cursor: 'pointer' }} onClick={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = ((e.currentTarget.nextElementSibling as HTMLElement).style.display === 'none' ? 'block' : 'none'); }}>
                <span style={{ fontSize: '12px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Advanced (v2)</span>
                <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>toggle</span>
              </div>
              <div id="apv2-advanced" style={{ display: 'none' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="openai" className="apv2-prov" style={{ width: 'auto' }} /> openai</label>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="anthropic" className="apv2-prov" style={{ width: 'auto' }} /> anthropic</label>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="google" className="apv2-prov" style={{ width: 'auto' }} /> google</label>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="voyage" className="apv2-prov" style={{ width: 'auto' }} /> voyage</label>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="cohere" className="apv2-prov" style={{ width: 'auto' }} /> cohere</label>
                      <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}><input type="checkbox" value="local" className="apv2-prov" style={{ width: 'auto' }} /> local</label>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="apv2-heuristics" style={{ width: 'auto' }} />
                      <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Use heuristics when prices.json lacks quality_score (advanced)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Results Panel */}
          <div id="profile-results-panel" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '24px', minHeight: '500px' }}>
            <div id="profile-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-muted)', textAlign: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: '0.3' }}>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                <path d="M9 12h6m-6 4h6"></path>
              </svg>
              <p style={{ fontSize: '14px', lineHeight: '1.6', maxWidth: '300px' }}>
                Click "Configure Automatically" or select a quick option to generate your optimized RAG profile based on your hardware and budget.
              </p>
            </div>
            <div id="profile-results-content" style={{ display: 'none' }}></div>
          </div>
        </div>
      </div>

      {/* Monitoring Logs (Dashboard snapshot) */}
      <div className="settings-section" style={{ marginTop: '16px' }}>
        <h3>📜 Monitoring Logs</h3>
        <p className="small" style={{ color: 'var(--fg-muted)', marginBottom: '8px' }}>Recent alerts and system notices from Alertmanager webhook log. Full controls are under Analytics → Performance.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Recent Alerts</h4>
            <div id="alert-status-container" style={{ minHeight: '48px', fontSize: '12px', color: 'var(--fg)' }}></div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--link)' }}>Alert History</h4>
            <div id="alert-history-container" style={{ minHeight: '48px', fontSize: '12px', color: 'var(--fg)' }}></div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Help & Glossary subtab */}
      {activeSubtab === 'help' && <HelpGlossary />}
    </div>
  );
}