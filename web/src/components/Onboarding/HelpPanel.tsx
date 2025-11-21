// AGRO - Onboarding Help Panel
// Mini chat interface for getting help during onboarding

import React, { useState } from 'react';

export const HelpPanel: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setResults('Searching...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          repo: 'agro', // Help questions about AGRO itself
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.answer || 'No answer found');
      } else {
        setResults('Error getting answer. Try asking in the Chat tab.');
      }
    } catch (e) {
      setResults('Error: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setQuestion(q);
    setResults('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="ob-help-panel">
      <h4>Have questions?</h4>
      <p>Ask in plain English. We'll help.</p>

      <textarea
        id="onboard-help-input"
        className="ob-help-input"
        placeholder="Type your question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyPress={handleKeyPress}
        aria-label="Help question input"
      />

      <button
        id="onboard-help-send"
        className="ob-help-btn"
        onClick={handleAsk}
        disabled={loading || !question.trim()}
        aria-label="Ask help question"
      >
        {loading ? 'Asking...' : 'Ask'}
      </button>

      <div
        id="onboard-help-results"
        className="ob-help-results"
        style={{
          marginTop: '12px',
          padding: results ? '12px' : '0',
          background: results ? 'var(--code-bg)' : 'transparent',
          border: results ? '1px solid var(--line)' : 'none',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--fg-muted)',
          maxHeight: '300px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}
        role="region"
        aria-live="polite"
        aria-label="Help answer"
      >
        {results}
      </div>

      <div className="ob-help-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
        <button
          className="ob-help-pill"
          data-q="What is BM25?"
          onClick={() => handleQuickQuestion('What is BM25?')}
          style={{
            padding: '6px 12px',
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elev2)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--chip-bg)';
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--fg-muted)';
          }}
        >
          What is BM25?
        </button>

        <button
          className="ob-help-pill"
          data-q="What is dense retrieval?"
          onClick={() => handleQuickQuestion('What is dense retrieval?')}
          style={{
            padding: '6px 12px',
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elev2)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--chip-bg)';
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--fg-muted)';
          }}
        >
          What is dense retrieval?
        </button>

        <button
          className="ob-help-pill"
          data-q="How long does indexing take?"
          onClick={() => handleQuickQuestion('How long does indexing take?')}
          style={{
            padding: '6px 12px',
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elev2)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--chip-bg)';
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.color = 'var(--fg-muted)';
          }}
        >
          How long does indexing take?
        </button>
      </div>

      <a
        href="/chat"
        id="onboard-open-chat"
        className="ob-help-link"
        style={{
          display: 'inline-block',
          marginTop: '16px',
          fontSize: '13px',
          color: 'var(--link)',
          textDecoration: 'none',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--link)';
        }}
      >
        Open full Chat →
      </a>
    </div>
  );
};

