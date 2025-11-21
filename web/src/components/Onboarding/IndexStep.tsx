import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

export const IndexStep: React.FC = () => {
  const { state, startIndexing, nextStep } = useOnboarding();
  const { indexing } = state;
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-start indexing when step becomes active
  useEffect(() => {
    if (!hasStarted && !indexing.running && indexing.stage === 'idle') {
      setHasStarted(true);
      startIndexing();
    }
  }, [hasStarted, indexing.running, indexing.stage, startIndexing]);

  // Auto-advance to next step when indexing completes
  useEffect(() => {
    if (hasStarted && !indexing.running && indexing.progress === 100) {
      // Give user a moment to see completion
      const timer = setTimeout(() => {
        nextStep();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, indexing.running, indexing.progress, nextStep]);

  const handleManualStart = () => {
    if (!indexing.running) {
      setHasStarted(true);
      startIndexing();
    }
  };

  return (
    <div className="ob-main">
      <h2 id="index-title" className="ob-title">
        Build Your Indexes
      </h2>

      {/* Stage indicators */}
      <div className="ob-stages" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indexing.progress}>
        <div className={`ob-stage ${indexing.stage === 'scan' ? 'active' : indexing.progress > 20 ? 'completed' : ''}`}>
          <div className="ob-stage-dot"></div>
          <span>Light Scan</span>
        </div>
        <div className="ob-stage-arrow">→</div>
        <div className={`ob-stage ${indexing.stage === 'keywords' ? 'active' : indexing.progress > 70 ? 'completed' : ''}`}>
          <div className="ob-stage-dot"></div>
          <span>Keywords & Cards</span>
        </div>
        <div className="ob-stage-arrow">→</div>
        <div className={`ob-stage ${indexing.stage === 'smart' ? 'active' : ''}`}>
          <div className="ob-stage-dot"></div>
          <span>Smart Search</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ob-progress-bar">
        <div
          id="onboard-index-bar"
          className="ob-progress-fill"
          style={{ width: `${indexing.progress}%` }}
        ></div>
      </div>
      <div id="onboard-index-status" className="ob-progress-text" role="status" aria-live="polite">
        {indexing.status}
      </div>

      {/* Manual start button (if not auto-started) */}
      {!hasStarted && !indexing.running && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            className="ob-primary-btn"
            onClick={handleManualStart}
            aria-label="Start indexing process"
          >
            Start Indexing
          </button>
        </div>
      )}

      {/* Index log - LiveTerminal will populate this */}
      <div
        id="onboard-index-log"
        className="ob-log"
        role="log"
        aria-label="Indexing process log"
        style={{
          minHeight: indexing.running ? '200px' : '0',
          maxHeight: '400px',
          overflow: 'auto',
          transition: 'min-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* LiveTerminal will inject content here, or show fallback */}
        {indexing.log.length > 0 && !window.LiveTerminal && (
          <div style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px', color: 'var(--fg-muted)' }}>
            {indexing.log.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Info tooltip */}
      <div className="ob-info-box">
        <div className="ob-tooltip-header">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>How it works</span>
        </div>
        <p>
          We always keep a BM25 'keyword' index (works offline). When available, we add a dense
          'meaning' index so it understands phrasing. If the smart part isn't ready, we fall back
          to keywords—so it always works.
        </p>
      </div>

      {/* Fallback message */}
      {indexing.progress >= 70 && indexing.stage !== 'smart' && (
        <div
          id="onboard-index-fallback"
          className="ob-warning-box"
          role="alert"
        >
          Continuing with keywords only. Dense search can be added later.
        </div>
      )}
    </div>
  );
};
