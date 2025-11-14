// AGRO - Chat Interface Component
// Main chat UI with message list, input, streaming, and trace panel
// Reference: /assets/chat tab.png, /assets/chat_built_in.png

import { useState, useEffect, useRef } from 'react';
import { useAPI } from '@/hooks';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: string[];
  traceData?: any;
}

interface TraceStep {
  step: string;
  duration: number;
  details: any;
}

export function ChatInterface() {
  const { api } = useAPI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repositories, setRepositories] = useState<string[]>([]);
  const [showTrace, setShowTrace] = useState(false);
  const [currentTrace, setCurrentTrace] = useState<TraceStep[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chat settings state
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [topP, setTopP] = useState(1);

  // Load repositories
  useEffect(() => {
    loadRepositories();
    // Load chat history from localStorage
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRepositories = async () => {
    try {
      const response = await fetch(api('/repos/list'));
      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repos || ['agro']);
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to load repositories:', error);
      setRepositories(['agro']);
    }
  };

  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('agro-chat-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to load chat history:', error);
    }
  };

  const saveChatHistory = (msgs: Message[]) => {
    try {
      localStorage.setItem('agro-chat-history', JSON.stringify(msgs));
    } catch (error) {
      console.error('[ChatInterface] Failed to save chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveChatHistory(newMessages);
    setInput('');
    setSending(true);
    setCurrentTrace([]);

    try {
      // Check if streaming is enabled
      const streamingEnabled = localStorage.getItem('chat-streaming') !== 'false';

      if (streamingEnabled) {
        // Use Server-Sent Events for streaming
        await handleStreamingResponse(userMessage);
      } else {
        // Regular fetch request
        await handleRegularResponse(userMessage);
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now()
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } finally {
      setSending(false);
      setStreaming(false);
    }
  };

  const handleStreamingResponse = async (userMessage: Message) => {
    setStreaming(true);

    const response = await fetch(api('/chat/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        repo: selectedRepo || undefined,
        model,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let assistantMessageId = `assistant-${Date.now()}`;
    let citations: string[] = [];
    let traceData: any = null;

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              accumulatedContent += parsed.content;
            }
            if (parsed.citations) {
              citations = parsed.citations;
            }
            if (parsed.trace) {
              traceData = parsed.trace;
              setCurrentTrace(parsed.trace.steps || []);
            }

            // Update message in real-time
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: accumulatedContent,
              timestamp: Date.now(),
              citations,
              traceData
            };

            setMessages(prev => {
              const withoutLast = prev.filter(m => m.id !== assistantMessageId);
              return [...withoutLast, assistantMessage];
            });
          } catch (error) {
            console.error('[ChatInterface] Failed to parse SSE data:', error);
          }
        }
      }
    }

    // Save final state
    setMessages(prev => {
      saveChatHistory(prev);
      return prev;
    });
  };

  const handleRegularResponse = async (userMessage: Message) => {
    const response = await fetch(api('/chat/answer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        repo: selectedRepo || undefined,
        model,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: data.answer || data.content || '',
      timestamp: Date.now(),
      citations: data.citations || [],
      traceData: data.trace
    };

    if (data.trace) {
      setCurrentTrace(data.trace.steps || []);
    }

    const updatedMessages = [...messages, userMessage, assistantMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
  };

  const handleClear = () => {
    if (confirm('Clear all messages?')) {
      setMessages([]);
      setCurrentTrace([]);
      localStorage.removeItem('agro-chat-history');
    }
  };

  const handleExport = () => {
    const exportData = {
      exported: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add a toast notification here
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '70vh',
      border: '1px solid var(--line)',
      borderRadius: '6px',
      overflow: 'hidden',
      background: 'var(--card-bg)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-elev1)'
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
            <span style={{ color: 'var(--accent)' }}>●</span> RAG Chat
          </h3>
          <p style={{
            margin: '0',
            fontSize: '12px',
            color: 'var(--fg-muted)'
          }}>
            Ask questions about your codebase
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            aria-label="Auto-detect repo"
          >
            <option value="">Auto-detect repo</option>
            {repositories.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
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
            aria-label="Export conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>

          <button
            onClick={handleClear}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--err)',
              border: '1px solid var(--err)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            aria-label="Clear chat"
          >
            Clear
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            aria-label="Toggle settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main content area with messages and optional settings sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Messages area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'var(--fg-muted)',
                padding: '40px 20px'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                     style={{ opacity: 0.3, marginBottom: '12px' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div style={{ fontSize: '14px' }}>Start a conversation with your codebase</div>
                <div style={{ fontSize: '11px', marginTop: '8px' }}>
                  Try: "Where is OAuth token validated?" or "How do we handle API errors?"
                </div>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    background: message.role === 'user' ? 'var(--accent)' : 'var(--bg-elev1)',
                    color: message.role === 'user' ? 'var(--accent-contrast)' : 'var(--fg)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    position: 'relative'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {message.content}
                    </div>

                    {message.citations && message.citations.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--line)',
                        fontSize: '11px',
                        opacity: 0.8
                      }}>
                        <strong>Citations:</strong>
                        {message.citations.map((citation, idx) => (
                          <div key={idx} style={{ marginTop: '4px' }}>
                            {citation}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{
                      marginTop: '8px',
                      fontSize: '10px',
                      opacity: 0.6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleCopy(message.content)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: '10px'
                        }}
                        aria-label="Copy message"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {streaming && (
              <div style={{
                color: 'var(--fg-muted)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                Streaming response...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid var(--line)',
            background: 'var(--bg-elev1)'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your codebase..."
                disabled={sending}
                style={{
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '60px',
                  maxHeight: '120px'
                }}
                rows={2}
                aria-label="Chat input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  background: input.trim() && !sending ? 'var(--accent)' : 'var(--bg-elev2)',
                  color: input.trim() && !sending ? 'var(--accent-contrast)' : 'var(--fg-muted)',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  height: 'fit-content',
                  alignSelf: 'flex-end'
                }}
                aria-label="Send message"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
              Press Ctrl+Enter to send • Citations will appear as clickable file links
            </div>

            {/* Trace panel */}
            {currentTrace.length > 0 && (
              <details
                open={showTrace}
                onToggle={(e: any) => setShowTrace(e.target.open)}
                style={{ marginTop: '8px' }}
              >
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--accent)'
                }}>
                  Routing Trace ({currentTrace.length} steps)
                </summary>
                <div style={{
                  marginTop: '8px',
                  background: 'var(--code-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {currentTrace.map((step, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <div style={{ color: 'var(--accent)', fontWeight: '600' }}>
                        {idx + 1}. {step.step}
                      </div>
                      <div style={{ color: 'var(--fg-muted)', marginLeft: '16px' }}>
                        Duration: {step.duration}ms
                      </div>
                      {step.details && (
                        <pre style={{
                          marginLeft: '16px',
                          marginTop: '4px',
                          fontSize: '10px',
                          color: 'var(--fg)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Settings sidebar (toggle) */}
        {showSettings && (
          <div style={{
            width: '280px',
            borderLeft: '1px solid var(--line)',
            padding: '16px',
            overflowY: 'auto',
            background: 'var(--bg-elev1)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600' }}>
              Quick Settings
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--fg-muted)',
                marginBottom: '4px'
              }}>
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--fg-muted)',
                marginBottom: '4px'
              }}>
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--fg-muted)',
                marginBottom: '4px'
              }}>
                Max Tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                min="1"
                max="32000"
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--fg-muted)',
                marginBottom: '4px'
              }}>
                Top-p: {topP}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
