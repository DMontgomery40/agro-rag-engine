import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

export const QuestionsStep: React.FC = () => {
  const { state, setQuestion, askQuestion } = useOnboarding();
  const { questions } = state;
  const [loadingStates, setLoadingStates] = useState<boolean[]>([false, false, false]);
  const [showTrace, setShowTrace] = useState<boolean[]>([false, false, false]);

  const handleAsk = async (index: number) => {
    setLoadingStates((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    try {
      await askQuestion(index);
    } finally {
      setLoadingStates((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const handleQuestionChange = (index: number, text: string) => {
    setQuestion(index, { text });
  };

  const toggleTrace = (index: number) => {
    setShowTrace((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSaveGolden = () => {
    alert('Golden questions saved! These will be used for evaluation.');
  };

  return (
    <div className="ob-main">
      <h2 id="questions-title" className="ob-title">
        Ask Your Codebase
      </h2>
      <p className="ob-subtitle">Try these Golden Questions (you can edit them)</p>

      {/* Questions */}
      <div className="ob-questions-list">
        {questions.map((question, index) => (
          <div key={index} className="ob-question-item">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                id={`onboard-q${index + 1}`}
                className="ob-question-input"
                value={question.text}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                aria-label={`Question ${index + 1}`}
              />
              <button
                className="ob-ask-btn"
                onClick={() => handleAsk(index)}
                disabled={loadingStates[index] || !question.text.trim()}
                data-q={index + 1}
                aria-label={`Ask question ${index + 1}`}
              >
                {loadingStates[index] ? 'Asking...' : 'Ask'}
              </button>
            </div>

            {/* Answer display */}
            {question.answer && (
              <div
                id={`onboard-ans-${index + 1}`}
                className="ob-answer"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--fg-muted)',
                  whiteSpace: 'pre-wrap',
                }}
                role="region"
                aria-label={`Answer to question ${index + 1}`}
              >
                {question.answer}
              </div>
            )}

            {/* Trace link */}
            {question.answer && (
              <>
                <a
                  href="#"
                  id={`onboard-trace-${index + 1}`}
                  className="ob-trace-link"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTrace(index);
                  }}
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    fontSize: '13px',
                    color: 'var(--link)',
                    textDecoration: 'none',
                  }}
                  aria-expanded={showTrace[index]}
                  aria-controls={`onboard-trace-panel-${index + 1}`}
                >
                  {showTrace[index] ? 'Hide trace' : 'What happened under the hood?'}
                </a>

                {/* Trace panel */}
                {showTrace[index] && (
                  <div
                    id={`onboard-trace-panel-${index + 1}`}
                    className="ob-trace-panel"
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginTop: '12px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--fg-muted)',
                      overflow: 'auto',
                      maxHeight: '300px',
                    }}
                    role="region"
                    aria-label={`Trace information for question ${index + 1}`}
                  >
                    <p>
                      Trace information would show the retrieval process, sources used, and
                      reasoning steps. This feature requires backend trace logging to be enabled.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <button
        id="onboard-save-golden"
        className="ob-secondary-btn"
        onClick={handleSaveGolden}
        style={{
          padding: '12px 24px',
          background: 'var(--card-bg)',
          border: '1px solid var(--accent)',
          borderRadius: '8px',
          color: 'var(--accent)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginTop: '20px',
        }}
        aria-label="Save golden questions"
      >
        Save these as Golden Questions
      </button>
    </div>
  );
};
