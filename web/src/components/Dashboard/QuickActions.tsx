// AGRO - Dashboard Quick Actions Component
// 6 action buttons + eval dropdown with dynamic reranker options

import React, { useState, useEffect } from 'react';
import { QuickActionButton } from './QuickActionButton';
import { LiveTerminalPanel } from './LiveTerminalPanel';

export function QuickActions() {
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [evalDropdownOpen, setEvalDropdownOpen] = useState(false);
  const [rerankerOptions, setRerankerOptions] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [progress, setProgress] = useState(0);

  // Load reranker options from backend
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch('/api/reranker/available');
        if (response.ok) {
          const data = await response.json();
          setRerankerOptions(data.options || []);
        }
      } catch (e) {
        console.error('[QuickActions] Failed to load reranker options:', e);
      }
    };
    loadOptions();
  }, []);

  const handleGenerateKeywords = async () => {
    setTerminalVisible(true);
    setStatusMessage('Generating keywords...');
    setProgress(0);

    const terminal = (window as any)._dashboardTerminal;
    if (terminal) {
      terminal.setTitle('Generate Keywords');
      terminal.updateProgress(0, 'Initializing...');
      terminal.appendLine('🔄 Generating keywords from indexed content...\n');
    }

    try {
      const response = await fetch('/api/keywords/generate', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setStatusMessage('✓ Keywords generated');
        setProgress(100);
        if (terminal) {
          terminal.appendLine(`✓ Generated ${data.count || 0} keywords\n`);
          terminal.updateProgress(100, 'Complete');
        }
      } else {
        setStatusMessage(`✗ Error: ${data.error || 'Unknown'}`);
        if (terminal) {
          terminal.appendLine(`✗ Error: ${data.error}\n`);
        }
      }
    } catch (e) {
      setStatusMessage(`✗ Failed: ${e}`);
      if (terminal) {
        terminal.appendLine(`✗ Error: ${e}\n`);
      }
    }
  };

  const handleChangeRepo = () => {
    const newRepo = prompt('Enter repository name:');
    if (newRepo) {
      window.location.href = `?repo=${newRepo}`;
    }
  };

  const handleRunIndexer = async () => {
    setTerminalVisible(true);
    setStatusMessage('Starting indexer...');
    setProgress(0);

    const terminal = (window as any)._dashboardTerminal;
    if (terminal) {
      terminal.setTitle('Run Indexer');
      terminal.appendLine('🚀 Starting indexer...\n');
    }

    try {
      const response = await fetch('/api/index/start', { method: 'POST' });
      if (response.ok) {
        setStatusMessage('✓ Indexer started');
        if (terminal) {
          terminal.appendLine('✓ Indexer started successfully\n');
        }
        // Poll for progress
        pollIndexStatus(terminal);
      }
    } catch (e) {
      setStatusMessage(`✗ Failed: ${e}`);
      if (terminal) {
        terminal.appendLine(`✗ Error: ${e}\n`);
      }
    }
  };

  const pollIndexStatus = async (terminal: any) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/index/status');
        const data = await response.json();
        
        if (data.active) {
          const prog = data.progress || 0;
          setProgress(prog);
          setStatusMessage(`Indexing: ${Math.round(prog)}%`);
          
          if (terminal) {
            terminal.updateProgress(prog, data.current_file || 'Processing...');
          }
        } else {
          clearInterval(interval);
          setProgress(100);
          setStatusMessage('✓ Indexing complete');
          
          if (terminal) {
            terminal.updateProgress(100, 'Complete');
            terminal.appendLine('✓ Indexing complete\n');
          }
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleReloadConfig = async () => {
    setTerminalVisible(true);
    setStatusMessage('Reloading configuration...');

    const terminal = (window as any)._dashboardTerminal;
    if (terminal) {
      terminal.setTitle('Reload Config');
      terminal.appendLine('🔄 Reloading configuration...\n');
    }

    try {
      const response = await fetch('/api/config/reload', { method: 'POST' });
      if (response.ok) {
        setStatusMessage('✓ Config reloaded');
        if (terminal) {
          terminal.appendLine('✓ Configuration reloaded successfully\n');
        }
      }
    } catch (e) {
      setStatusMessage(`✗ Failed: ${e}`);
      if (terminal) {
        terminal.appendLine(`✗ Error: ${e}\n`);
      }
    }
  };

  const handleRunEval = async (backend: string) => {
    setEvalDropdownOpen(false);
    setTerminalVisible(true);
    setStatusMessage(`Running evaluation with ${backend}...`);

    const terminal = (window as any)._dashboardTerminal;
    if (terminal) {
      terminal.setTitle(`Run Eval (${backend})`);
      terminal.appendLine(`🧪 Running evaluation with ${backend} backend...\n`);
    }

    try {
      const response = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend })
      });

      if (response.ok) {
        setStatusMessage('✓ Evaluation started');
        if (terminal) {
          terminal.appendLine('✓ Evaluation started\n');
        }
      }
    } catch (e) {
      setStatusMessage(`✗ Failed: ${e}`);
      if (terminal) {
        terminal.appendLine(`✗ Error: ${e}\n`);
      }
    }
  };

  const handleRefreshStatus = () => {
    setStatusMessage('Refreshing status...');
    // Trigger reload of all dashboard data
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    setTimeout(() => setStatusMessage('✓ Status refreshed'), 500);
  };

  return (
    <div>
      <h3
        style={{
          fontSize: '14px',
          marginBottom: '16px',
          color: 'var(--warn)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        Quick Actions
      </h3>

      {/* Action Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <QuickActionButton
          id="btn-generate-keywords"
          icon="⭐"
          label="Generate Keywords"
          onClick={handleGenerateKeywords}
          dataAction="generate-keywords"
        />
        <QuickActionButton
          id="dash-change-repo"
          icon="📁"
          label="Change Repo"
          onClick={handleChangeRepo}
          dataAction="change-repo"
        />
        <QuickActionButton
          id="dash-index-start"
          icon="🔄"
          label="Run Indexer"
          onClick={handleRunIndexer}
          dataAction="index"
        />
        <QuickActionButton
          id="dash-reload-config"
          icon="⚙️"
          label="Reload Config"
          onClick={handleReloadConfig}
          dataAction="reload"
        />

        {/* Eval Dropdown Button */}
        <div style={{ position: 'relative' }}>
          <button
            id="dash-eval-trigger"
            className="action-btn"
            onClick={() => setEvalDropdownOpen(!evalDropdownOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--bg-elev1)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <span style={{ fontSize: '24px', color: 'var(--link)' }}>🧪</span>
            <span>Run Eval</span>
            <svg
              id="dash-eval-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                marginLeft: 'auto',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: evalDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown */}
          {evalDropdownOpen && (
            <div
              id="dash-eval-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--bg-elev2)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Select Reranker
              </div>

              {/* Options */}
              {rerankerOptions.length === 0 && (
                <div style={{ padding: '12px', color: 'var(--fg-muted)', fontSize: '12px' }}>
                  Loading options...
                </div>
              )}
              {rerankerOptions.map((option, idx) => (
                <button
                  key={option.id}
                  className="eval-model-btn"
                  data-model={option.id}
                  data-backend={option.backend}
                  onClick={() => handleRunEval(option.id)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: idx < rerankerOptions.length - 1 ? '1px solid var(--bg-elev2)' : 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--fg)',
                    fontSize: '12px',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--panel)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <QuickActionButton
          id="dash-refresh-status"
          icon="🔄"
          label="Refresh Status"
          onClick={handleRefreshStatus}
          dataAction="refresh"
        />
      </div>

      {/* Status Display */}
      <div
        id="dash-index-status"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '12px',
          fontFamily: "'SF Mono', monospace",
          fontSize: '12px',
          lineHeight: 1.6,
          color: 'var(--fg-muted)',
          minHeight: '48px',
        }}
      >
        {statusMessage}
      </div>

      {/* Progress Bar with Shimmer */}
      <div
        style={{
          marginTop: '12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          id="dash-index-bar"
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--warn) 0%, var(--accent) 100%)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            position: 'relative',
          }}
        >
          {progress > 0 && progress < 100 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: 'shine 2s infinite',
              }}
            />
          )}
        </div>

        <style jsx>{`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(400%);
            }
          }
        `}</style>
      </div>

      {/* Live Terminal */}
      <LiveTerminalPanel containerId="dash-operations-terminal" isVisible={terminalVisible} />
    </div>
  );
}

