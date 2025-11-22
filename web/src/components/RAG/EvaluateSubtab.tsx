// React implementation of EvaluateSubtab - NO legacy JS modules
import React, { useState, useEffect, useCallback } from 'react';
import { useAPI } from '@/hooks';
import { EvalDrillDown } from '@/components/Evaluation/EvalDrillDown';
// Recommended golden questions for AGRO codebase
const RECOMMENDED_GOLDEN = [
  { q: 'Where is hybrid retrieval implemented?', repo: 'agro', expect_paths: ['retrieval/hybrid_search.py'] },
  { q: 'Where is keyword generation handled server-side?', repo: 'agro', expect_paths: ['server/app.py','keywords/generate'] },
  { q: 'Where is the metadata enrichment logic for code/keywords?', repo: 'agro', expect_paths: ['metadata_enricher.py'] },
  { q: 'Where is the indexing pipeline (BM25 and dense) implemented?', repo: 'agro', expect_paths: ['indexer/index_repo.py'] },
  { q: 'Where is comprehensive index status computed?', repo: 'agro', expect_paths: ['server/app.py','server/index_stats.py','index/status'] },
  { q: 'Where are semantic cards built or listed?', repo: 'agro', expect_paths: ['server/app.py','api/cards','indexer/build_cards.py'] },
  { q: 'Where are golden questions API routes defined?', repo: 'agro', expect_paths: ['server/app.py','api/golden'] },
  { q: 'Where is the endpoint to test a single golden question?', repo: 'agro', expect_paths: ['server/app.py','api/golden/test'] },
  { q: 'Where are GUI assets mounted and served?', repo: 'agro', expect_paths: ['server/app.py','/gui','gui/index.html'] },
  { q: 'Where is repository configuration (repos.json) loaded?', repo: 'agro', expect_paths: ['config_loader.py'] },
  { q: 'Where are MCP stdio tools implemented (rag_answer, rag_search)?', repo: 'agro', expect_paths: ['server/mcp/server.py'] },
  { q: 'Where can I list or fetch latest LangGraph traces?', repo: 'agro', expect_paths: ['server/app.py','api/traces'] }
];

interface GoldenQuestion {
  q: string;
  repo: string;
  expect_paths: string[];
}

interface TestResult {
  top1_hit: boolean;
  topk_hit: boolean;
  all_results?: Array<{
    file_path: string;
    start_line: number;
    rerank_score: number;
  }>;
}

interface EvalResults {
  top1_accuracy: number;
  topk_accuracy: number;
  duration_secs: number;
  results?: Array<{
    question: string;
    repo: string;
    expect_paths: string[];
    top1_hit: boolean;
    topk_hit: boolean;
    top_paths: string[];
  }>;
}

export function EvaluateSubtab() {
  const { api } = useAPI();
  const [goldenQuestions, setGoldenQuestions] = useState<GoldenQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState({ q: '', repo: 'agro', paths: '' });
  const [testResults, setTestResults] = useState<{ [key: number]: TestResult }>({});
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalProgress, setEvalProgress] = useState({ current: 0, total: 0, status: '' });
  const [evalResults, setEvalResults] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalSettings, setEvalSettings] = useState({
    useMulti: true,
    finalK: 5,
    sampleSize: '',
    goldenPath: 'data/golden.json',
    baselinePath: 'data/evals/eval_baseline.json'
  });
  const [availableRuns, setAvailableRuns] = useState<Array<{run_id: string, top1_accuracy: number, topk_accuracy: number}>>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [compareRunId, setCompareRunId] = useState<string | null>(null);

  const fetchJson = useCallback(async (path: string, options: RequestInit = {}) => {
    const res = await fetch(api(path), {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }
    return res.json();
  }, [api]);

  // Load golden questions on mount
  useEffect(() => {
    loadGoldenQuestions();
  }, []);

  // Load available eval runs on mount
  useEffect(() => {
    const loadRuns = async () => {
      try {
        const data = await fetchJson('eval/runs');
        if (data.ok && data.runs) {
          setAvailableRuns(data.runs);
          // Auto-select most recent run if available
          if (data.runs.length > 0 && !selectedRunId) {
            setSelectedRunId(data.runs[0].run_id);
          }
        }
      } catch (err) {
        console.error('Failed to load eval runs:', err);
      }
    };
    loadRuns();
  }, [fetchJson, selectedRunId]);

  const loadGoldenQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetchJson('golden');
      setGoldenQuestions(response.questions || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load golden questions: ${err}`);
      console.error('Failed to load golden questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addGoldenQuestion = async () => {
    if (!newQuestion.q.trim()) {
      alert('Please enter a question');
      return;
    }

    const expect_paths = newQuestion.paths.split(',').map(p => p.trim()).filter(p => p);

    try {
      await fetchJson('golden', {
        method: 'POST',
        body: JSON.stringify({
          q: newQuestion.q,
          repo: newQuestion.repo,
          expect_paths
        })
      });
      setNewQuestion({ q: '', repo: 'agro', paths: '' });
      await loadGoldenQuestions();
    } catch (err) {
      alert(`Failed to add question: ${err}`);
    }
  };

  const testQuestion = async (index: number) => {
    const q = goldenQuestions[index];
    try {
      const result = await fetchJson('golden/test', {
        method: 'POST',
        body: JSON.stringify({
          q: q.q,
          repo: q.repo,
          expect_paths: q.expect_paths,
          final_k: 5,
          use_multi: true
        })
      });
      setTestResults(prev => ({ ...prev, [index]: result }));
    } catch (err) {
      console.error('Test failed:', err);
      alert(`Test failed: ${err}`);
    }
  };

  const deleteQuestion = async (index: number) => {
    if (!confirm('Delete this question?')) return;

    try {
      await fetchJson(`golden/${index}`, { method: 'DELETE' });
      await loadGoldenQuestions();
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    }
  };

  const loadRecommendedQuestions = async () => {
    try {
      let added = 0;
      for (const q of RECOMMENDED_GOLDEN) {
        try {
          await fetchJson('golden', {
            method: 'POST',
            body: JSON.stringify(q)
          });
          added++;
        } catch (err) {
          console.warn(`Failed to add question: ${q.q}`, err);
        }
      }
      await loadGoldenQuestions();
      alert(`Loaded ${added} recommended questions`);
    } catch (err) {
      alert(`Failed to load recommended questions: ${err}`);
    }
  };

  const runAllTests = async () => {
    if (goldenQuestions.length === 0) {
      alert('No questions to test');
      return;
    }

    setEvalRunning(true);
    setEvalProgress({ current: 0, total: goldenQuestions.length, status: 'Starting...' });

    try {
      let top1 = 0, topk = 0;

      for (let i = 0; i < goldenQuestions.length; i++) {
        const q = goldenQuestions[i];
        setEvalProgress(prev => ({ ...prev, current: i + 1, status: `Testing: ${q.q}` }));

        const result = await fetchJson('golden/test', {
          method: 'POST',
          body: JSON.stringify({
            q: q.q,
            repo: q.repo,
            expect_paths: q.expect_paths || [],
            final_k: 5,
            use_multi: true
          })
        });

        if (result.top1_hit) top1++;
        if (result.topk_hit) topk++;

        setTestResults(prev => ({ ...prev, [i]: result }));
      }

      const msg = `Tests complete: Top-1: ${top1}/${goldenQuestions.length}, Top-K: ${topk}/${goldenQuestions.length}`;
      alert(msg);
      setEvalProgress(prev => ({ ...prev, status: msg }));
    } catch (err) {
      alert(`Test run failed: ${err}`);
    } finally {
      setEvalRunning(false);
    }
  };

  const runFullEvaluation = async () => {
    setEvalRunning(true);
    setEvalProgress({ current: 0, total: 0, status: 'Starting evaluation...' });

    try {
      const payload: any = {
        use_multi: evalSettings.useMulti,
        final_k: evalSettings.finalK
      };

      if (evalSettings.sampleSize) {
        payload.sample_limit = parseInt(evalSettings.sampleSize);
      }

      const response = await fetchJson('eval/run', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Start polling for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await fetchJson('eval/status');
          if (status.running) {
            setEvalProgress({
              current: status.progress || 0,
              total: status.total || 0,
              status: `Running... ${status.progress}/${status.total} questions`
            });
          } else {
            clearInterval(pollInterval);
            // Load results
            const results = await fetchJson('eval/results');
            setEvalResults(results);
            if (results.run_id) {
              setLatestRunId(results.run_id);
            }
            setEvalRunning(false);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setEvalRunning(false);
          alert(`Evaluation failed: ${err}`);
        }
      }, 1000);
    } catch (err) {
      setEvalRunning(false);
      alert(`Failed to start evaluation: ${err}`);
    }
  };

  const exportQuestions = () => {
    const dataStr = JSON.stringify(goldenQuestions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'golden_questions_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Golden Questions Manager */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)', marginBottom: '24px' }}>
        <h3>
          <span className="accent-blue">●</span> Golden Questions Manager
        </h3>
        <p className="small">
          Manage test questions for evaluating retrieval quality. Add, edit, test individual questions, or run full evaluation suite.
        </p>

        {/* Add New Question Form */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '12px' }}>Add New Question</h4>

          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label>Question Text</label>
            <textarea
              value={newQuestion.q}
              onChange={e => setNewQuestion(prev => ({ ...prev, q: e.target.value }))}
              placeholder="e.g., Where is OAuth token validated?"
              style={{ minHeight: '60px', width: '100%' }}
            />
          </div>

          <div className="input-row" style={{ marginBottom: '12px' }}>
            <div className="input-group">
              <label>Repository</label>
              <select
                value={newQuestion.repo}
                onChange={e => setNewQuestion(prev => ({ ...prev, repo: e.target.value }))}
              >
                <option value="agro">agro</option>
              </select>
            </div>
            <div className="input-group">
              <label>Expected Paths (comma-separated)</label>
              <input
                type="text"
                value={newQuestion.paths}
                onChange={e => setNewQuestion(prev => ({ ...prev, paths: e.target.value }))}
                placeholder="auth, oauth, token"
              />
            </div>
          </div>

          <button
            className="small-button"
            onClick={addGoldenQuestion}
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', width: '100%' }}
          >
            Add Question
          </button>
        </div>

        {/* Questions List */}
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>Loading questions...</div>
          ) : error ? (
            <div style={{ color: 'var(--err)' }}>{error}</div>
          ) : goldenQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--fg-muted)' }}>
              No golden questions yet. Add one above!
            </div>
          ) : (
            goldenQuestions.map((q, index) => (
              <div key={index} style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '4px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: '4px', wordBreak: 'break-word' }}>
                      {q.q}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                      <span style={{ background: 'var(--bg-elev2)', padding: '2px 6px', borderRadius: '3px', marginRight: '6px' }}>
                        {q.repo}
                      </span>
                      {(q.expect_paths || []).map(p => (
                        <span key={p} style={{ color: 'var(--accent)' }}>{p} </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                    <button
                      onClick={() => testQuestion(index)}
                      style={{ background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      style={{ background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      ✗
                    </button>
                  </div>
                </div>
                {testResults[index] && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)', fontSize: '12px' }}>
                    <span style={{ color: testResults[index].top1_hit ? 'var(--accent)' : 'var(--err)', fontWeight: 600 }}>
                      {testResults[index].top1_hit ? '✓' : '✗'} Top-1
                    </span>
                    <span style={{ marginLeft: '12px', color: testResults[index].topk_hit ? 'var(--accent)' : 'var(--warn)', fontWeight: 600 }}>
                      {testResults[index].topk_hit ? '✓' : '✗'} Top-K
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={loadGoldenQuestions} style={{ flex: 1 }}>
            Refresh List
          </button>
          <button
            onClick={loadRecommendedQuestions}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
          >
            Load Recommended
          </button>
          <button
            onClick={runAllTests}
            disabled={evalRunning || goldenQuestions.length === 0}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
          >
            Run All Tests
          </button>
          <button
            onClick={exportQuestions}
            style={{ flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)' }}
          >
            Export JSON
          </button>
        </div>

        {/* Progress indicator for running tests */}
        {evalRunning && evalProgress.total > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
              {evalProgress.status}
            </div>
            <div style={{ background: 'var(--bg)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(evalProgress.current / evalProgress.total) * 100}%`,
                  background: 'var(--link)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Runner */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-purple">●</span> Evaluation Runner
        </h3>
        <p className="small">
          Run full evaluation suite to measure RAG quality. Compare against baseline to detect regressions.
        </p>

        {/* Settings */}
        <div className="input-row" style={{ marginBottom: '16px' }}>
          <div className="input-group">
            <label>Use Multi-Query</label>
            <select
              value={evalSettings.useMulti ? '1' : '0'}
              onChange={e => setEvalSettings(prev => ({ ...prev, useMulti: e.target.value === '1' }))}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
          <div className="input-group">
            <label>Final K Results</label>
            <input
              type="number"
              value={evalSettings.finalK}
              onChange={e => setEvalSettings(prev => ({ ...prev, finalK: parseInt(e.target.value) || 5 }))}
              min="1"
              max="20"
            />
          </div>
          <div className="input-group">
            <label>Sample Size</label>
            <select
              value={evalSettings.sampleSize}
              onChange={e => setEvalSettings(prev => ({ ...prev, sampleSize: e.target.value }))}
            >
              <option value="">Full (All Questions)</option>
              <option value="10">Quick (10 Questions)</option>
              <option value="25">Medium (25 Questions)</option>
              <option value="50">Large (50 Questions)</option>
            </select>
          </div>
        </div>

        {/* Run Button */}
        <button
          className="action-buttons"
          onClick={runFullEvaluation}
          disabled={evalRunning}
          style={{ width: '100%', background: 'var(--link)', color: 'var(--accent-contrast)', fontSize: '15px', padding: '14px' }}
        >
          {evalRunning ? 'Running...' : 'Run Full Evaluation'}
        </button>

        {/* Results Display */}
        {evalResults && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>Top-1 Accuracy</div>
                <div style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: 700 }}>
                  {(evalResults.top1_accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>Top-K Accuracy</div>
                <div style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: 700 }}>
                  {(evalResults.topk_accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>Duration</div>
                <div style={{ fontSize: '24px', color: 'var(--link)', fontWeight: 700 }}>
                  {evalResults.duration_secs}s
                </div>
              </div>
            </div>

            {/* Drill-Down Button */}
            {latestRunId && (
              <button
                onClick={() => setShowDrillDown(!showDrillDown)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-elev2)',
                  color: 'var(--link)',
                  border: '1px solid var(--link)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px'
                }}
              >
                {showDrillDown ? '▼ Hide Detailed Results' : '▶ Show Detailed Results (Question-by-Question)'}
              </button>
            )}

            {/* Detailed Drill-Down */}
            {showDrillDown && latestRunId && (
              <div style={{ marginTop: '16px' }}>
                <EvalDrillDown runId={latestRunId} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ALWAYS VISIBLE: Eval Run Drill-Down Analysis */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: 'var(--accent)' }}>●</span>
          Eval Run Drill-Down Analysis
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '16px' }}>
          Deep-dive into any eval run to analyze question-by-question performance, compare expected vs actual results, and identify regressions.
        </p>

        {availableRuns.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontSize: '13px'
          }}>
            No eval runs found. Run an evaluation to generate data for analysis.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--fg)'
                }}>
                  📊 PRIMARY RUN (AFTER)
                </label>
                <select
                  value={selectedRunId || ''}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-elev2)',
                    color: 'var(--fg)',
                    border: '2px solid var(--accent-green)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    fontWeight: 600
                  }}
                >
                  <option value="">-- Select a run --</option>
                  {availableRuns.map(run => (
                    <option key={run.run_id} value={run.run_id}>
                      {run.run_id} — Top-1: {(run.top1_accuracy * 100).toFixed(1)}% | Top-K: {(run.topk_accuracy * 100).toFixed(1)}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--fg)'
                }}>
                  🔍 COMPARE WITH (BEFORE) — Optional
                </label>
                <select
                  value={compareRunId || ''}
                  onChange={(e) => setCompareRunId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-elev2)',
                    color: 'var(--fg)',
                    border: '2px solid var(--err)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    fontWeight: 600
                  }}
                >
                  <option value="">-- No comparison --</option>
                  {availableRuns.filter(r => r.run_id !== selectedRunId).map(run => (
                    <option key={run.run_id} value={run.run_id}>
                      {run.run_id} — Top-1: {(run.top1_accuracy * 100).toFixed(1)}% | Top-K: {(run.topk_accuracy * 100).toFixed(1)}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRunId && (
              <div style={{
                border: '1px solid var(--link)',
                borderRadius: '6px',
                padding: '16px',
                background: 'var(--bg-elev1)'
              }}>
                <EvalDrillDown runId={selectedRunId} compareWithRunId={compareRunId || undefined} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
