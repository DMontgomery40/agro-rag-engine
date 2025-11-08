/**
 * AGRO Live Terminal Component (React Port)
 * Provides real-time streaming output for long-running operations
 *
 * Features:
 * - Smooth slide-down animation (0.4s cubic-bezier)
 * - Auto-scroll to bottom with manual override detection
 * - ANSI color support (16 colors, exact from original)
 * - Collapsible/expandable
 * - Progress bar integration
 * - macOS-style terminal chrome
 * - ADA accessibility compliant
 */

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

interface LiveTerminalProps {
  containerId?: string;
  title?: string;
}

interface TerminalLine {
  text: string;
  timestamp: Date;
  html: string;
}

interface ProgressState {
  percent: number;
  message: string;
  visible: boolean;
}

export interface LiveTerminalHandle {
  show(): void;
  hide(): void;
  appendLine(text: string): void;
  appendLines(lines: string[]): void;
  clearTerminal(): void;
  updateProgress(percent: number, message?: string): void;
  hideProgress(): void;
  setTitle(title: string): void;
}

const LiveTerminal = forwardRef<LiveTerminalHandle, LiveTerminalProps>((props, ref) => {
  const { containerId = 'live-terminal', title: initialTitle = 'Live Output' } = props;

  // State
  const [isVisible, setIsVisible] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [progress, setProgress] = useState<ProgressState>({ percent: 0, message: '', visible: false });
  const [title, setTitle] = useState(initialTitle);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Refs
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(autoScroll);

  // Keep autoScrollRef in sync with state
  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  // ANSI Color Parser - EXACT COPY from lines 265-285
  const parseANSI = useCallback((text: string): string => {
    // Basic ANSI color code support - exact color map from original
    const colorMap: { [key: string]: string } = {
      '30': '#000', '31': '#ff5f57', '32': '#28c840', '33': '#ffbd2e',
      '34': '#5c9fd8', '35': '#c678dd', '36': '#56b6c2', '37': '#e0e0e0',
      '90': '#666', '91': '#ff6b6b', '92': '#5af78e', '93': '#f9f871',
      '94': '#6baeff', '95': '#e599f7', '96': '#76e1ff', '97': '#fff'
    };

    // Store ANSI codes temporarily
    const ansiPlaceholders: string[] = [];
    let placeholderIndex = 0;

    // Replace ANSI codes with placeholders
    let parsed = text.replace(/\x1b\[([0-9;]+)m/g, (_match, code) => {
      const placeholder = `__ANSI_${placeholderIndex}__`;
      if (code === '0') {
        ansiPlaceholders.push('</span>');
      } else {
        const color = colorMap[code];
        ansiPlaceholders.push(color ? `<span style="color: ${color};">` : '');
      }
      placeholderIndex++;
      return placeholder;
    });

    // Escape HTML
    parsed = parsed.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Restore ANSI codes
    placeholderIndex = 0;
    parsed = parsed.replace(/__ANSI_\d+__/g, () => {
      return ansiPlaceholders[placeholderIndex++] || '';
    });

    return parsed;
  }, []);

  // Methods exposed via ref
  useImperativeHandle(ref, () => ({
    show: () => {
      setIsVisible(true);
      setIsCollapsed(false);
    },
    hide: () => {
      setIsVisible(false);
    },
    appendLine: (text: string) => {
      const html = parseANSI(text);
      setLines(prev => [...prev, { text, timestamp: new Date(), html }]);
    },
    appendLines: (textLines: string[]) => {
      const newLines = textLines.map(text => ({
        text,
        timestamp: new Date(),
        html: parseANSI(text)
      }));
      setLines(prev => [...prev, ...newLines]);
    },
    clearTerminal: () => {
      setLines([]);
    },
    updateProgress: (percent: number, message = '') => {
      setProgress({ percent, message, visible: true });
    },
    hideProgress: () => {
      setProgress(prev => ({ ...prev, visible: false }));
    },
    setTitle: (newTitle: string) => setTitle(newTitle)
  }), [parseANSI]);

  // Auto-scroll logic - triggers after lines change
  useEffect(() => {
    if (autoScrollRef.current && terminalBodyRef.current && lines.length > 0) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [lines]);

  // Scroll detection - disable auto-scroll if user scrolls up (lines 192-206)
  const handleScroll = useCallback(() => {
    if (!terminalBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalBodyRef.current;
    const atBottom = scrollHeight - scrollTop <= clientHeight + 50;

    if (!atBottom && autoScrollRef.current) {
      setAutoScroll(false);
    }
  }, []);

  // Toggle auto-scroll
  const toggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => {
      const newValue = !prev;
      if (newValue && terminalBodyRef.current) {
        // Scroll to bottom when re-enabling
        terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
      }
      return newValue;
    });
  }, []);

  // Clear terminal
  const handleClear = useCallback(() => {
    setLines([]);
  }, []);

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <div
      id={containerId}
      style={{
        maxHeight: isVisible ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? 1 : 0,
        marginTop: '16px',
        borderRadius: '8px',
        background: '#1a1a1a',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Terminal Header - macOS Chrome */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#252525',
          borderBottom: '1px solid var(--line)',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* macOS Traffic Lights - EXACT COLORS from lines 59-63 */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <span
            style={{
              fontFamily: "'SF Mono', 'Monaco', monospace",
              fontSize: '13px',
              color: '#e0e0e0',
              fontWeight: 500
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Auto-scroll toggle */}
          <button
            onClick={toggleAutoScroll}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: autoScroll ? 'var(--accent)' : 'var(--fg-muted)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'SF Mono', monospace"
            }}
            title="Toggle auto-scroll"
          >
            {autoScroll ? '📜 Auto' : '📜 Manual'}
          </button>

          {/* Clear button */}
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--fg-muted)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'SF Mono', monospace"
            }}
            title="Clear output"
          >
            🗑️ Clear
          </button>

          {/* Collapse button */}
          <button
            onClick={toggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
            title="Collapse terminal"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress.visible && (
        <div
          style={{
            display: 'block',
            padding: '8px 16px',
            background: '#1f1f1f',
            borderBottom: '1px solid var(--line)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px', color: 'var(--accent)' }}>
              {progress.message}
            </span>
            <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px', color: 'var(--fg-muted)' }}>
              {Math.round(progress.percent)}%
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#0a0a0a', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress.percent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent) 0%, var(--link) 100%)',
                transition: 'width 0.3s ease-out',
                borderRadius: '3px'
              }}
            />
          </div>
        </div>
      )}

      {/* Terminal Body */}
      {!isCollapsed && (
        <div
          ref={terminalBodyRef}
          onScroll={handleScroll}
          style={{
            height: '350px',
            overflowY: 'auto',
            padding: '12px 16px',
            fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#e0e0e0',
            background: '#1a1a1a',
            borderRadius: '0 0 8px 8px'
          }}
        >
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              color: '#e0e0e0'
            }}
          >
            {lines.length === 0 ? (
              <span style={{ color: '#888' }}>Waiting for output...</span>
            ) : (
              lines.map((line, idx) => (
                <div key={idx} dangerouslySetInnerHTML={{ __html: line.html }} />
              ))
            )}
          </pre>
        </div>
      )}
    </div>
  );
});

LiveTerminal.displayName = 'LiveTerminal';

export default LiveTerminal;
export type { LiveTerminalProps, LiveTerminalHandle };
