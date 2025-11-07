import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';
import MessageList from './MessageList';

interface ChatInterfaceProps {
  onShowSettings?: () => void;
}

/**
 * Main chat interface component with input, controls, and message display
 */
export default function ChatInterface({ onShowSettings }: ChatInterfaceProps) {
  const {
    messages,
    isStreaming,
    currentRepo,
    setCurrentRepo,
    settings,
    traceData,
    sendMessage,
    clearMessages,
    clearHistory,
    exportHistory,
    stopStreaming,
    getStorageStats
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showTraceDetails, setShowTraceDetails] = useState(false);
  const [copyNotification, setCopyNotification] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const autoResize = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 120);
      inputRef.current.style.height = newHeight + 'px';
    }
  };

  useEffect(() => {
    autoResize();
  }, [inputValue]);

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;

    sendMessage(inputValue, currentRepo);
    setInputValue('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm('Clear all messages?')) {
      clearMessages();
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all saved chat history? This cannot be undone.')) {
      clearHistory();
      clearMessages();
      setShowHistoryDropdown(false);
    }
  };

  const handleExportHistory = () => {
    exportHistory();
    setShowHistoryDropdown(false);
  };

  const handleCopyMessage = () => {
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2000);
  };

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#chat-history-btn') && !target.closest('#history-dropdown')) {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const storageStats = getStorageStats();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>
            <span className="accent-blue">●</span> RAG Chat
          </h3>
          <p className="small" style={{ margin: '0', color: 'var(--fg-muted)' }}>
            Ask questions about your codebase
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Repo selector */}
          <select
            value={currentRepo}
            onChange={(e) => setCurrentRepo(e.target.value)}
            disabled={isStreaming}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              opacity: isStreaming ? 0.6 : 1
            }}
          >
            <option value="">Auto-detect repo</option>
            <option value="agro">agro</option>
            <option value="chat">chat</option>
          </select>

          {/* History button with dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              id="chat-history-btn"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              History
            </button>
            {showHistoryDropdown && (
              <div
                id="history-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '4px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: '180px'
                }}
              >
                <button
                  onClick={handleExportHistory}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--fg)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elev1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  Export History
                </button>
                <div style={{ height: '1px', background: 'var(--line)' }}></div>
                <button
                  onClick={handleClearHistory}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--err)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elev1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  Clear History
                </button>
                <div style={{ height: '1px', background: 'var(--line)' }}></div>
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: 'var(--fg-muted)'
                  }}
                >
                  {storageStats.messageCount} messages ({storageStats.sizeKB}KB)
                </div>
              </div>
            )}
          </div>

          {/* Clear button */}
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--err)',
              border: '1px solid var(--err)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              opacity: messages.length === 0 ? 0.5 : 1
            }}
          >
            Clear
          </button>

          {/* Settings button */}
          {onShowSettings && (
            <button
              onClick={onShowSettings}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--line)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <MessageList
        messages={messages}
        autoScroll={settings.autoScroll}
        onCopyMessage={handleCopyMessage}
      />

      {/* Input Area */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--line)',
          background: 'var(--code-bg)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Ask a question about your codebase..."
            style={{
              flex: 1,
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              minHeight: '60px',
              maxHeight: '120px',
              cursor: isStreaming ? 'not-allowed' : 'text',
              opacity: isStreaming ? 0.6 : 1
            }}
            rows={2}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              style={{
                background: 'var(--err)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                height: 'fit-content',
                alignSelf: 'flex-end'
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{
                background: inputValue.trim() ? 'var(--accent)' : 'var(--bg-elev2)',
                color: inputValue.trim() ? 'var(--accent-contrast)' : 'var(--fg-muted)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                height: 'fit-content',
                alignSelf: 'flex-end',
                opacity: inputValue.trim() ? 1 : 0.5
              }}
            >
              Send
            </button>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '8px' }}>
          Press Ctrl+Enter to send • Citations will appear as clickable file links
        </div>

        {/* Trace Data */}
        {traceData && (
          <details
            open={showTraceDetails}
            onToggle={(e) => setShowTraceDetails(e.currentTarget.open)}
            style={{ marginTop: '8px' }}
          >
            <summary
              style={{
                cursor: 'pointer',
                color: 'var(--fg-muted)',
                fontSize: '12px'
              }}
            >
              Routing Trace
            </summary>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '12px',
                marginTop: '8px',
                fontSize: '12px',
                fontFamily: "'SF Mono', monospace",
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {JSON.stringify(traceData, null, 2)}
            </div>
          </details>
        )}
      </div>

      {/* Copy notification */}
      {copyNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: '13px',
            animation: 'fadeIn 0.2s',
            zIndex: 9999
          }}
        >
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
}
