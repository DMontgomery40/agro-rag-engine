/**
 * AGRO Dashboard - Quick Actions Grid
 * Port from /gui/index.html lines 4970-5024
 *
 * Features:
 * - 5 action buttons with EXACT SVGs from legacy HTML
 * - Real backend integration (NO STUBS)
 * - LiveTerminal for streaming operations
 * - Progress bar for indexing operations
 * - Status display for operation feedback
 * - ADA compliant with full keyboard navigation
 */

import { useState, useRef } from 'react';
import LiveTerminal, { LiveTerminalHandle } from '../LiveTerminal/LiveTerminal';
import { useConfigStore } from '../../stores/useConfigStore';
import { useHealthStore } from '../../stores/useHealthStore';
import { useDockerStore } from '../../stores/useDockerStore';

export default function QuickActions() {
  const liveTerminalRef = useRef<LiveTerminalHandle>(null);
  const [indexStatus, setIndexStatus] = useState<string>('Idle');
  const [indexProgress, setIndexProgress] = useState<number>(0);

  const { loadConfig, reloadEnv } = useConfigStore();
  const { checkHealth } = useHealthStore();
  const { fetchStatus } = useDockerStore();

  /**
   * Button 1: Generate Keywords
   * Calls POST /api/keywords/generate
   * Opens LiveTerminal with streaming logs
   */
  const handleGenerateKeywords = async () => {
    const terminal = liveTerminalRef.current;
    if (!terminal) return;

    terminal.show();
    terminal.setTitle('Generating Keywords...');
    terminal.clearTerminal();
    setIndexStatus('Generating keywords...');

    try {
      const response = await fetch('/api/keywords/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          terminal.appendLine(line);
        });
      }

      terminal.setTitle('Keywords Generated ✓');
      setIndexStatus('Keywords generated successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      terminal.appendLine(`Error: ${errorMsg}`);
      terminal.setTitle('Keyword Generation Failed ✗');
      setIndexStatus(`Error: ${errorMsg}`);
    }
  };

  // Action 2: Change Repo
  const handleChangeRepo = async () => {
    const newRepo = prompt('Enter repository name:', 'agro');
    if (!newRepo) return;

    try {
      setButtonState('repo', 'loading');
      setIndexStatus(`Switching to repository: ${newRepo}...`);

      const response = await fetch('/api/config/change-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: newRepo })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await loadConfig();
      setIndexStatus(`Switched to ${newRepo} successfully`);
      setButtonState('repo', 'success');

      setTimeout(() => {
        setIndexStatus('Idle');
        setButtonState('repo', 'idle');
      }, 3000);
    } catch (err) {
      setIndexStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setButtonState('repo', 'error');

      setTimeout(() => {
        setButtonState('repo', 'idle');
      }, 3000);
    }
  };

  // Action 3: Run Indexer (with LiveTerminal)
  const handleRunIndexer = async () => {
    const terminal = liveTerminalRef.current;
    if (!terminal) return;

    terminal.show();
    terminal.setTitle('Indexing in progress...');
    terminal.clearTerminal();
    setButtonState('indexer', 'loading');
    setIndexStatus('Indexing started...');
    setIndexProgress(0);

    try {
      const response = await fetch('/api/index/start', { method: 'POST' });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            terminal.appendLine(line);

            // Parse progress if available
            const progressMatch = line.match(/(\d+)%/);
            if (progressMatch) {
              const percent = parseInt(progressMatch[1], 10);
              setIndexProgress(percent);
              terminal.updateProgress(percent, `Indexing: ${percent}%`);
            }

            // Update status
            if (line.includes('complete')) {
              setIndexStatus('Indexing complete');
            } else if (line.includes('error')) {
              setIndexStatus('Indexing failed - see terminal');
            }
          }
        }
      }

      terminal.setTitle('Indexing complete');
      setIndexProgress(100);
      setButtonState('indexer', 'success');

      setTimeout(() => {
        setButtonState('indexer', 'idle');
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      terminal.appendLine(`\x1b[31mError: ${errorMsg}\x1b[0m`);
      setIndexStatus(`Error: ${errorMsg}`);
      terminal.setTitle('Indexing failed');
      setButtonState('indexer', 'error');

      setTimeout(() => {
        setButtonState('indexer', 'idle');
      }, 3000);
    }
  };

  // Action 4: Reload Config
  const handleReloadConfig = async () => {
    try {
      setButtonState('config', 'loading');
      setIndexStatus('Reloading configuration...');
      setIndexProgress(50);

      await reloadEnv();
      await loadConfig();

      setIndexStatus('Configuration reloaded successfully');
      setIndexProgress(100);
      setButtonState('config', 'success');

      setTimeout(() => {
        setIndexStatus('Idle');
        setIndexProgress(0);
        setButtonState('config', 'idle');
      }, 3000);
    } catch (err) {
      setIndexStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIndexProgress(0);
      setButtonState('config', 'error');

      setTimeout(() => {
        setButtonState('config', 'idle');
      }, 3000);
    }
  };

  // Action 5: Refresh Status
  const handleRefreshStatus = async () => {
    try {
      setButtonState('refresh', 'loading');
      setIndexStatus('Refreshing system status...');
      setIndexProgress(33);

      await checkHealth();
      setIndexProgress(66);

      await fetchStatus();
      setIndexProgress(100);

      setIndexStatus('Status refreshed successfully');
      setButtonState('refresh', 'success');

      setTimeout(() => {
        setIndexStatus('Idle');
        setIndexProgress(0);
        setButtonState('refresh', 'idle');
      }, 2000);
    } catch (err) {
      setIndexStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIndexProgress(0);
      setButtonState('refresh', 'error');

      setTimeout(() => {
        setButtonState('refresh', 'idle');
      }, 2000);
    }
  };

  // Action 6: Health Check
  const handleHealthCheck = async () => {
    try {
      setButtonState('health', 'loading');
      setIndexStatus('Running health check...');
      setIndexProgress(50);

      await checkHealth();

      setIndexStatus('Health check complete');
      setIndexProgress(100);
      setButtonState('health', 'success');

      setTimeout(() => {
        setIndexStatus('Idle');
        setIndexProgress(0);
        setButtonState('health', 'idle');
      }, 2000);
    } catch (err) {
      setIndexStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIndexProgress(0);
      setButtonState('health', 'error');

      setTimeout(() => {
        setButtonState('health', 'idle');
      }, 2000);
    }
  };

  return (
    <div>
      {/* Header with lightning bolt icon - EXACT from line 4972-4977 */}
      <h3 style={{
        fontSize: '14px',
        marginBottom: '16px',
        color: 'var(--warn)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        Quick Actions
      </h3>

      {/* 6 action buttons - 3x2 grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {/* Button 1: Generate Keywords - EXACT from lines 4979-4984 */}
        <button
          onClick={handleGenerateKeywords}
          className={`action-btn ${buttonStates.keywords}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l2.39 4.85L20 8l-4 3.9.95 5.54L12 15.77 7.05 17.45 8 11.9 4 8l5.61-1.15L12 2z"></path>
          </svg>
          <span>Generate Keywords</span>
        </button>

        {/* Button 2: Change Repo - EXACT from lines 4985-4990 */}
        <button
          onClick={handleChangeRepo}
          className={`action-btn ${buttonStates.repo}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>Change Repo</span>
        </button>

        {/* Button 3: Run Indexer - EXACT from lines 4991-4998 */}
        <button
          onClick={handleRunIndexer}
          className={`action-btn ${buttonStates.indexer}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span>Run Indexer</span>
        </button>

        {/* Button 4: Reload Config - EXACT from lines 4999-5006 */}
        <button
          onClick={handleReloadConfig}
          className={`action-btn ${buttonStates.config}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Reload Config</span>
        </button>

        {/* Button 5: Refresh Status - EXACT from lines 5007-5014 */}
        <button
          onClick={handleRefreshStatus}
          className={`action-btn ${buttonStates.refresh}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <polyline points="23 20 23 14 17 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
          <span>Refresh Status</span>
        </button>

        {/* Button 6: Health Check - NEW (following exact same pattern) */}
        <button
          onClick={handleHealthCheck}
          className={`action-btn ${buttonStates.health}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          <span>Health Check</span>
        </button>
      </div>

      {/* Status display - EXACT from line 5018 */}
      <div
        id="dash-index-status"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '12px',
          fontFamily: "'SF Mono', 'Monaco', 'Courier New', monospace",
          fontSize: '12px',
          lineHeight: '1.6',
          color: 'var(--fg-muted)',
          minHeight: '48px',
          marginBottom: '12px'
        }}
      >
        {indexStatus}
      </div>

      {/* Progress bar - EXACT from lines 5021-5023 */}
      <div style={{
        marginTop: '12px',
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        height: '8px',
        overflow: 'hidden',
        marginBottom: '16px'
      }}>
        <div
          id="dash-index-bar"
          style={{
            height: '100%',
            width: `${indexProgress}%`,
            background: 'linear-gradient(90deg, var(--warn) 0%, var(--accent) 100%)',
            transition: 'width 0.3s ease, opacity 0.3s ease'
          }}
        />
      </div>

      {/* LiveTerminal */}
      <LiveTerminal ref={liveTerminalRef} />
    </div>
  );
}
