// AGRO - Dashboard Quick Actions Component
// 6 action buttons for common operations

import React, { useState } from 'react';
import { QuickActionButton } from './QuickActionButton';
import { LiveTerminalPanel } from './LiveTerminalPanel';
import { TerminalService } from '../../services/TerminalService';

export function QuickActions() {
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [progress, setProgress] = useState(0);

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
      // Get current repo from URL params or default to agro
      const params = new URLSearchParams(window.location.search);
      const repo = params.get('repo') || 'agro';

      const response = await fetch('/api/keywords/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo })
      });
      const data = await response.json();
      
      if (response.ok) {
        // Support both new format (count/keywords) and legacy format (total_count)
        const total = data.count ?? data.total_count ?? 0;
        setStatusMessage(`✓ Loaded ${total} keywords from repos.json`);
        setProgress(100);
        if (terminal) {
          terminal.appendLine(`✓ Loaded ${total} keywords from repos.json\n`);
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
      terminal.clear();
      terminal.appendLine('🚀 Starting indexer...');
    }

    try {
      const response = await fetch('/api/index/start', { method: 'POST' });

      if (!response.ok) {
        const error = await response.text();
        setStatusMessage(`✗ Error: ${error}`);
        if (terminal) {
          terminal.appendLine(`\x1b[31m✗ Failed to start indexer: ${error}\x1b[0m`);
        }
        return;
      }

      setStatusMessage('✓ Indexer started');
      if (terminal) {
        terminal.appendLine('✓ Indexer started, connecting to log stream...');
      }

      // Connect to SSE stream for real logs
      TerminalService.streamOperation('dashboard_indexer', 'index', {
        onLine: (line) => {
          if (terminal) {
            terminal.appendLine(line);
          }
        },
        onProgress: (percent, message) => {
          setProgress(percent);
          setStatusMessage(message || `Indexing: ${Math.round(percent)}%`);
          if (terminal) {
            terminal.updateProgress(percent, message);
          }
        },
        onError: (error) => {
          setStatusMessage(`✗ Error: ${error}`);
          if (terminal) {
            terminal.appendLine(`\x1b[31m✗ Error: ${error}\x1b[0m`);
          }
        },
        onComplete: () => {
          setProgress(100);
          setStatusMessage('✓ Indexing complete');
          if (terminal) {
            terminal.updateProgress(100, 'Complete');
            terminal.appendLine('\x1b[32m✓ Indexing complete\x1b[0m');
          }
        }
      });
    } catch (e) {
      setStatusMessage(`✗ Failed: ${e}`);
      if (terminal) {
        terminal.appendLine(`\x1b[31m✗ Error: ${e}\x1b[0m`);
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

  const handleRunEval = () => {
    // Navigate to Eval Analysis tab with autorun param
    window.location.hash = '#/eval-analysis?autorun=true';
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

        <QuickActionButton
          id="dash-eval-trigger"
          icon="🧪"
          label="Run Eval"
          onClick={handleRunEval}
          dataAction="eval"
        />

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

        <style>{`
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

