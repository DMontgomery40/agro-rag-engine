import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useChat';

interface MessageListProps {
  messages: ChatMessage[];
  autoScroll: boolean;
  onCopyMessage?: (content: string) => void;
}

/**
 * Message list component that displays chat messages with auto-scroll
 */
export default function MessageList({ messages, autoScroll, onCopyMessage }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Format assistant message content with file links, code blocks, etc.
  const formatAssistantContent = (content: string, eventId?: string) => {
    let formatted = escapeHtml(content);

    // Convert file paths to clickable links (e.g., server/app.py:123-145)
    formatted = formatted.replace(
      /([a-zA-Z0-9_\-\/\.]+\.(py|js|ts|tsx|jsx|rb|go|rs|java|cs|yml|yaml|json|md|txt))(?::(\d+)(?:-(\d+))?)?/g,
      (match, filePath, ext, startLine, endLine) => {
        const lineRange = startLine ? `:${startLine}${endLine ? `-${endLine}` : ''}` : '';
        const displayText = `${filePath}${lineRange}`;
        const docId = `${filePath}${lineRange}`;
        const clickHandler = eventId ? `onclick="trackFileClick('${eventId}', '${docId}')"` : '';
        return `<a href="vscode://file/${filePath}${startLine ? ':' + startLine : ''}" ${clickHandler} style="color: var(--link); text-decoration: none; border-bottom: 1px solid var(--link); font-family: 'SF Mono', monospace; font-size: 13px; cursor: pointer;" title="Open in editor">${displayText}</a>`;
      }
    );

    // Format repo tags (e.g., [repo: agro])
    formatted = formatted.replace(
      /\[repo:\s*([^\]]+)\]/g,
      '<span style="background: var(--bg-elev2); color: var(--fg-muted); padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: \'SF Mono\', monospace;">repo: $1</span>'
    );

    // Format inline code
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code style="background: var(--bg-elev2); color: var(--accent); padding: 2px 6px; border-radius: 3px; font-family: \'SF Mono\', monospace; font-size: 13px;">$1</code>'
    );

    // Format multi-line code blocks
    formatted = formatted.replace(
      /```([^\n]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const escapedCode = code.trim();
        const langLabel = lang ? `<div style="color: var(--fg-muted); font-size: 11px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${lang}</div>` : '';
        return `<pre style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; overflow-x: auto; margin: 8px 0;">${langLabel}<code style="color: var(--fg); font-family: 'SF Mono', monospace; font-size: 13px; line-height: 1.5;">${escapedCode}</code></pre>`;
      }
    );

    return formatted;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      if (onCopyMessage) {
        onCopyMessage(content);
      }
    }).catch(err => {
      console.error('Failed to copy message:', err);
    });
  };

  // Empty state
  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: '1',
          overflowY: 'auto',
          padding: '16px',
          background: 'var(--card-bg)'
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: '40px 20px' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ opacity: '0.3', marginBottom: '12px' }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <div>Start a conversation with your codebase</div>
          <div style={{ fontSize: '11px', marginTop: '8px' }}>
            Try: "Where is OAuth token validated?" or "How do we handle API errors?"
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: '1',
        overflowY: 'auto',
        padding: '16px',
        background: 'var(--card-bg)'
      }}
    >
      {messages.map((message) => {
        const roleColor = message.role === 'user' ? 'var(--link)' : 'var(--accent)';
        const roleBg = message.role === 'user'
          ? 'color-mix(in oklch, var(--link) 12%, var(--card-bg))'
          : 'color-mix(in oklch, var(--accent) 12%, var(--card-bg))';
        const roleLabel = message.role === 'user' ? 'You' : 'Assistant';

        // Process content based on role
        const processedContent = message.role === 'assistant' && !message.isLoading
          ? formatAssistantContent(message.content, message.eventId)
          : escapeHtml(message.content);

        return (
          <div
            key={message.id}
            style={{
              marginBottom: '16px',
              animation: 'fadeIn 0.2s'
            }}
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  flexShrink: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: roleBg,
                  border: `1px solid ${roleColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: roleColor
                }}
              >
                {roleLabel[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--fg-muted)',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{roleLabel}</span>
                  {!message.isLoading && !message.isError && (
                    <button
                      onClick={() => handleCopy(message.content)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--fg-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '11px',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.6';
                      }}
                      title="Copy to clipboard"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
                <div
                  style={{
                    color: message.isError ? 'var(--err)' : 'var(--fg)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
                {message.confidence !== undefined && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-muted)',
                      marginTop: '8px'
                    }}
                  >
                    Confidence: {(message.confidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
