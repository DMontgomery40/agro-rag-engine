// AGRO - EvaluateSubtab Component
// RAG evaluation and golden questions management

import { useState, useEffect } from 'react';
import { useAPI } from '../../hooks/useAPI';

interface GoldenQuestion {
  id: string;
  question: string;
  repo: string;
  expected_paths: string[];
}

interface EvalResult {
  question: string;
  top1_correct: boolean;
  topk_correct: boolean;
  retrieved_paths: string[];
  expected_paths: string[];
}

interface EvalMetrics {
  top1_accuracy: number;
  topk_accuracy: number;
  duration: number;
  results: EvalResult[];
}

export function EvaluateSubtab() {
  const { api } = useAPI();

  // Golden Questions state
  const [goldenQuestions, setGoldenQuestions] = useState<GoldenQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newRepo, setNewRepo] = useState('agro');
  const [newPaths, setNewPaths] = useState('');

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalStatus, setEvalStatus] = useState('');
  const [evalResults, setEvalResults] = useState<EvalMetrics | null>(null);
  const [useMultiQuery, setUseMultiQuery] = useState(true);
  const [finalK, setFinalK] = useState(5);
  const [goldenPath, setGoldenPath] = useState('data/golden.json');
  const [baselinePath, setBaselinePath] = useState('data/evals/eval_baseline.json');

  // History state
  const [evalHistory, setEvalHistory] = useState<any[]>([]);

  // Load golden questions on mount
  useEffect(() => {
    loadGoldenQuestions();
    loadEvalHistory();
  }, []);

  const loadGoldenQuestions = async () => {
    try {
      const response = await fetch(api('/golden/questions'));
      if (response.ok) {
        const data = await response.json();
        setGoldenQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading golden questions:', error);
    }
  };

  const loadEvalHistory = async () => {
    try {
      const response = await fetch(api('/eval/history'));
      if (response.ok) {
        const data = await response.json();
        setEvalHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading eval history:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) {
      alert('Please enter a question');
      return;
    }

    try {
      const response = await fetch(api('/golden/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          repo: newRepo,
          expected_paths: newPaths.split(',').map(p => p.trim()).filter(p => p)
        })
      });

      if (response.ok) {
        setNewQuestion('');
        setNewPaths('');
        await loadGoldenQuestions();
      } else {
        alert('Failed to add question');
      }
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Error adding question');
    }
  };

  const handleTestNewQuestion = async () => {
    if (!newQuestion.trim()) {
      alert('Please enter a question');
      return;
    }

    try {
      const response = await fetch(api('/golden/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          repo: newRepo,
          expected_paths: newPaths.split(',').map(p => p.trim()).filter(p => p)
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Test Result:\nTop-1: ${result.top1_correct ? 'PASS' : 'FAIL'}\nTop-K: ${result.topk_correct ? 'PASS' : 'FAIL'}`);
      } else {
        alert('Test failed');
      }
    } catch (error) {
      console.error('Error testing question:', error);
      alert('Error testing question');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      const response = await fetch(api(`/golden/delete/${id}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadGoldenQuestions();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleRunAllTests = async () => {
    try {
      const response = await fetch(api('/golden/test-all'), {
        method: 'POST'
      });

      if (response.ok) {
        const results = await response.json();
        alert(`Test Results:\nPassed: ${results.passed}\nFailed: ${results.failed}`);
      }
    } catch (error) {
      console.error('Error running tests:', error);
    }
  };

  const handleLoadRecommended = async () => {
    try {
      const response = await fetch(api('/golden/load-recommended'), {
        method: 'POST'
      });

      if (response.ok) {
        await loadGoldenQuestions();
        alert('Recommended questions loaded');
      }
    } catch (error) {
      console.error('Error loading recommended:', error);
    }
  };

  const handleExportQuestions = async () => {
    try {
      const response = await fetch(api('/golden/export'));
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'golden-questions.json';
        a.click();
      }
    } catch (error) {
      console.error('Error exporting questions:', error);
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvalProgress(0);
    setEvalStatus('Starting evaluation...');
    setEvalResults(null);

    try {
      const response = await fetch(api('/eval/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_multi_query: useMultiQuery,
          final_k: finalK,
          golden_path: goldenPath,
          baseline_path: baselinePath
        })
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(api('/eval/status'));
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setEvalProgress(status.progress || 0);
            setEvalStatus(status.message || '');

            if (status.complete) {
              clearInterval(pollInterval);
              setIsEvaluating(false);
              setEvalResults(status.results);
              await loadEvalHistory();
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 1000);
    } catch (error) {
      setIsEvaluating(false);
      setEvalStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveBaseline = async () => {
    if (!evalResults) return;

    try {
      const response = await fetch(api('/eval/save-baseline'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalResults)
      });

      if (response.ok) {
        alert('Baseline saved successfully');
      }
    } catch (error) {
      console.error('Error saving baseline:', error);
    }
  };

  const handleCompareBaseline = async () => {
    if (!evalResults) return;

    try {
      const response = await fetch(api('/eval/compare-baseline'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalResults)
      });

      if (response.ok) {
        const comparison = await response.json();
        alert(`Comparison vs Baseline:\nTop-1 Delta: ${comparison.top1_delta}%\nTop-K Delta: ${comparison.topk_delta}%`);
      }
    } catch (error) {
      console.error('Error comparing baseline:', error);
    }
  };

  const handleExportResults = () => {
    if (!evalResults) return;

    const dataStr = JSON.stringify(evalResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-results-${new Date().toISOString()}.json`;
    a.click();
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all evaluation history?')) return;

    try {
      const response = await fetch(api('/eval/clear-history'), {
        method: 'POST'
      });

      if (response.ok) {
        setEvalHistory([]);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <div id="tab-rag-evaluate" className="rag-subtab-content">
      {/* Golden Questions Manager */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-blue">●</span> Golden Questions Manager
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Golden Questions</span>
              Questions with known-good answers used to measure RAG quality. Each question should have expected file paths that contain the answer.
              <div className="tt-badges">
                <span className="tt-badge info">Quality Assurance</span>
                <span className="tt-badge">No Re-index</span>
              </div>
            </div>
          </span>
        </h3>
        <p className="small">
          Manage test questions for evaluating retrieval quality. Add, edit, test individual questions, or run full evaluation suite.
        </p>

        {/* Add New Question Form */}
        <div
          id="golden-add-form"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <h4
            style={{
              fontSize: '13px',
              color: 'var(--accent)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Add New Question
          </h4>
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label>Question Text</label>
            <textarea
              id="golden-new-q"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g., Where is OAuth token validated?"
              style={{ minHeight: '60px' }}
            />
          </div>
          <div className="input-row" style={{ marginBottom: '12px' }}>
            <div className="input-group">
              <label>Repository</label>
              <select
                id="golden-new-repo"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
              >
                <option value="agro">agro</option>
              </select>
            </div>
            <div className="input-group">
              <label>Expected Paths (comma-separated)</label>
              <input
                type="text"
                id="golden-new-paths"
                value={newPaths}
                onChange={(e) => setNewPaths(e.target.value)}
                placeholder="auth, oauth, token"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="small-button"
              id="btn-golden-add"
              onClick={handleAddQuestion}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                border: 'none',
                width: 'auto',
                flex: 1
              }}
            >
              Add Question
            </button>
            <button
              className="small-button"
              id="btn-golden-test-new"
              onClick={handleTestNewQuestion}
              style={{ width: 'auto' }}
            >
              Test First
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div
          id="golden-questions-list"
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div id="golden-questions-content" style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
            {goldenQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>No questions yet. Add one above.</div>
            ) : (
              goldenQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    marginBottom: '12px',
                    padding: '12px',
                    background: 'var(--bg-elev1)',
                    borderRadius: '4px',
                    border: '1px solid var(--line)'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {idx + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                    Repo: {q.repo} | Paths: {q.expected_paths.join(', ')}
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'var(--err)',
                      color: 'var(--fg)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="action-buttons"
          style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}
        >
          <button id="btn-golden-refresh" onClick={loadGoldenQuestions} style={{ flex: 1 }}>
            Refresh List
          </button>
          <button
            id="btn-golden-load-recommended"
            onClick={handleLoadRecommended}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
          >
            Load Recommended
          </button>
          <button
            id="btn-golden-run-tests"
            onClick={handleRunAllTests}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
          >
            Run All Tests
          </button>
          <button
            id="btn-golden-export"
            onClick={handleExportQuestions}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)' }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Evaluation Runner */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-purple">●</span> Evaluation Runner
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Evaluation System</span>
              Runs all golden questions and measures retrieval accuracy. Tracks regressions vs. saved baseline.
              <div className="tt-badges">
                <span className="tt-badge info">Accuracy Metrics</span>
                <span className="tt-badge warn">Can Be Slow</span>
              </div>
            </div>
          </span>
        </h3>
        <p className="small">
          Run full evaluation suite to measure RAG quality. Compare against baseline to detect regressions.
        </p>

        {/* Settings */}
        <div className="input-row" style={{ marginBottom: '16px' }}>
          <div className="input-group">
            <label>
              Use Multi-Query
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Multi-Query Expansion</span>
                  Generate multiple query variations for better recall. Increases API costs but improves accuracy. Recommended: enabled.
                  <div className="tt-badges">
                    <span className="tt-badge info">Better Recall</span>
                    <span className="tt-badge warn">Higher Cost</span>
                  </div>
                </div>
              </span>
            </label>
            <select
              id="eval-use-multi"
              value={useMultiQuery ? '1' : '0'}
              onChange={(e) => setUseMultiQuery(e.target.value === '1')}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Final K Results
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Results Count</span>
                  Number of results to return per question. Higher = more context but more noise. Recommended: 5-10.
                </div>
              </span>
            </label>
            <input
              type="number"
              id="eval-final-k"
              value={finalK}
              onChange={(e) => setFinalK(parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>
        </div>

        {/* Eval Paths */}
        <div className="input-row" style={{ marginBottom: '16px' }}>
          <div className="input-group" style={{ flex: 2 }}>
            <label>
              Golden Questions Path
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">GOLDEN_PATH</span>
                  Path to your evaluation questions JSON. Defaults to data/golden.json.
                </div>
              </span>
            </label>
            <input
              type="text"
              id="eval-golden-path"
              value={goldenPath}
              onChange={(e) => setGoldenPath(e.target.value)}
              placeholder="data/golden.json"
            />
          </div>
          <div className="input-group" style={{ flex: 2 }}>
            <label>
              Baseline Path
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">BASELINE_PATH</span>
                  Where evaluation baselines are saved/compared. Defaults to data/evals/eval_baseline.json.
                </div>
              </span>
            </label>
            <input
              type="text"
              id="eval-baseline-path"
              value={baselinePath}
              onChange={(e) => setBaselinePath(e.target.value)}
              placeholder="data/evals/eval_baseline.json"
            />
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '16px', justifyContent: 'flex-end' }}>
          <button
            id="btn-eval-save-settings"
            className="small-button"
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--link)',
              border: '1px solid var(--link)',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Eval Settings
          </button>
        </div>

        {/* Run Button */}
        <button
          className="action-buttons"
          id="btn-eval-run"
          onClick={handleRunEvaluation}
          disabled={isEvaluating}
          style={{
            width: '100%',
            background: 'var(--link)',
            color: 'var(--accent-contrast)',
            fontSize: '15px',
            padding: '14px',
            opacity: isEvaluating ? 0.6 : 1,
            cursor: isEvaluating ? 'not-allowed' : 'pointer'
          }}
        >
          {isEvaluating ? 'Running Evaluation...' : 'Run Full Evaluation'}
        </button>

        {/* Progress */}
        {isEvaluating && (
          <div id="eval-progress" style={{ marginTop: '16px' }}>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                height: '8px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}
            >
              <div
                id="eval-progress-bar"
                style={{
                  height: '100%',
                  width: `${evalProgress}%`,
                  background: 'linear-gradient(90deg, var(--link) 0%, var(--accent) 100%)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div
              id="eval-status"
              className="mono"
              style={{ fontSize: '12px', color: 'var(--fg-muted)', textAlign: 'center' }}
            >
              {evalStatus || '—'}
            </div>
          </div>
        )}

        {/* Results Display */}
        {evalResults && (
          <div id="eval-results" style={{ marginTop: '16px' }}>
            {/* Overall Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--fg-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  Top-1 Accuracy
                </div>
                <div
                  id="eval-top1-acc"
                  className="mono"
                  style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: 700 }}
                >
                  {(evalResults.top1_accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--fg-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  Top-K Accuracy
                </div>
                <div
                  id="eval-topk-acc"
                  className="mono"
                  style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: 700 }}
                >
                  {(evalResults.topk_accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--fg-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  Duration
                </div>
                <div
                  id="eval-duration"
                  className="mono"
                  style={{ fontSize: '24px', color: 'var(--link)', fontWeight: 700 }}
                >
                  {evalResults.duration.toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Per-Question Results */}
            <div
              id="eval-details"
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '16px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {evalResults.results.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '12px',
                    padding: '8px',
                    background: 'var(--bg-elev1)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{result.question}</div>
                  <div style={{ color: 'var(--fg-muted)' }}>
                    Top-1: {result.top1_correct ? '✓' : '✗'} | Top-K: {result.topk_correct ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>

            {/* Baseline Actions */}
            <div className="action-buttons" style={{ marginTop: '16px' }}>
              <button id="btn-eval-save-baseline" onClick={handleSaveBaseline} style={{ flex: 1 }}>
                Save as Baseline
              </button>
              <button
                id="btn-eval-compare"
                onClick={handleCompareBaseline}
                style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)' }}
              >
                Compare to Baseline
              </button>
              <button
                id="btn-eval-export"
                onClick={handleExportResults}
                style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)' }}
              >
                Export Results
              </button>
            </div>
          </div>
        )}

        {/* Evaluation Run History */}
        <div
          style={{
            marginTop: '24px',
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '20px'
          }}
        >
          <h4
            style={{
              margin: '0 0 8px 0',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ color: 'var(--accent-green)' }}>●</span>
            Evaluation Run History
          </h4>
          <p className="small" style={{ color: 'var(--fg-muted)', margin: '0 0 16px 0' }}>
            Compare BM25-only baseline vs trained cross-encoder performance across runs.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table
              id="eval-history-table"
              style={{
                width: '100%',
                fontSize: '12px',
                borderCollapse: 'collapse',
                background: 'var(--code-bg)',
                border: '1px solid var(--line)',
                borderRadius: '6px'
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-elev2)', borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Timestamp
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Configuration
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Top-1
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Top-5
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Time (s)
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Δ Top-5
                  </th>
                </tr>
              </thead>
              <tbody id="eval-history-tbody">
                {evalHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                      No evaluation history yet. Run evaluations to see comparisons.
                    </td>
                  </tr>
                ) : (
                  evalHistory.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px' }}>{entry.timestamp}</td>
                      <td style={{ padding: '10px' }}>{entry.config}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{entry.top1}%</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{entry.top5}%</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{entry.time}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{entry.delta}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              id="btn-eval-history-refresh"
              onClick={loadEvalHistory}
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--link)',
                border: '1px solid var(--link)',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Refresh History
            </button>
            <button
              id="btn-eval-history-clear"
              onClick={handleClearHistory}
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--warn)',
                border: '1px solid var(--warn)',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
