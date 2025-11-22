import React, { useState, useEffect } from 'react';

interface QuestionResult {
  question: string;
  repo: string;
  expect_paths: string[];
  top_paths: string[];
  top1_path: string[];
  top1_hit: boolean;
  topk_hit: boolean;
  duration_secs: number;
  docs?: Array<{ file_path: string; score: number }>;
}

interface EvalRun {
  run_id: string;
  total: number;
  top1_hits: number;
  topk_hits: number;
  top1_accuracy: number;
  topk_accuracy: number;
  duration_secs: number;
  config: Record<string, any>;
  results: QuestionResult[];
}

interface EvalDrillDownProps {
  runId: string;
  compareWithRunId?: string;
}

export const EvalDrillDown: React.FC<EvalDrillDownProps> = ({ runId, compareWithRunId }) => {
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null);
  const [compareRun, setCompareRun] = useState<EvalRun | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/eval/results/${runId}`);
        if (!response.ok) throw new Error('Failed to fetch run data');
        const data = await response.json();
        console.log('[EvalDrillDown] Fetched data:', data);
        console.log('[EvalDrillDown] Question 0 expect_paths:', data.results?.[0]?.expect_paths);
        setEvalRun(data);

        if (compareWithRunId) {
          const compareResponse = await fetch(`/api/eval/results/${compareWithRunId}`);
          if (compareResponse.ok) {
            const compareData = await compareResponse.json();
            setCompareRun(compareData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [runId, compareWithRunId]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading evaluation details...
      </div>
    );
  }

  if (error || !evalRun) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--err)' }}>
        Error: {error || 'No data found'}
      </div>
    );
  }

  const getConfigDiff = () => {
    if (!compareRun) {
      console.log('[EvalDrillDown] No compareRun selected');
      return null;
    }
    if (!evalRun.config || !compareRun.config) {
      console.log('[EvalDrillDown] Missing config data:', { evalConfig: evalRun.config, compareConfig: compareRun.config });
      return null;
    }

    console.log('[EvalDrillDown] Comparing configs:', {
      evalKeys: Object.keys(evalRun.config),
      compareKeys: Object.keys(compareRun.config)
    });

    const allKeys = new Set([...Object.keys(evalRun.config), ...Object.keys(compareRun.config)]);
    const diffs: Array<{ key: string; current: any; previous: any; changed: boolean }> = [];

    allKeys.forEach(key => {
      const current = evalRun.config[key];
      const previous = compareRun.config[key];
      const changed = JSON.stringify(current) !== JSON.stringify(previous);
      if (changed) {
        diffs.push({ key, current, previous, changed });
      }
    });

    console.log('[EvalDrillDown] Config diffs found:', diffs.length, diffs);
    return diffs;
  };

  const getRegressionStatus = (questionIdx: number) => {
    if (!compareRun || !compareRun.results[questionIdx]) return null;

    const currentHit = evalRun.results[questionIdx]?.topk_hit;
    const previousHit = compareRun.results[questionIdx]?.topk_hit;

    if (!currentHit && previousHit) return 'regression';
    if (currentHit && !previousHit) return 'improvement';
    return 'unchanged';
  };

  const configDiffs = getConfigDiff();
  const regressions = evalRun.results.filter((_, idx) => getRegressionStatus(idx) === 'regression').length;
  const improvements = evalRun.results.filter((_, idx) => getRegressionStatus(idx) === 'improvement').length;

  // Group config by category for better organization - COMPREHENSIVE categorization
  const groupedConfig = (() => {
    const groups: Record<string, Array<[string, any]>> = {
      'Retrieval': [],
      'Weighting': [],
      'Layer Bonuses': [],
      'Reranking': [],
      'Embedding & Chunking': [],
      'Exclusions': [],
      'Other': []
    };

    Object.entries(evalRun.config || {}).forEach(([key, value]) => {
      if (key.includes('topk_') || key.includes('final_k') || key.includes('rrf_')) {
        groups['Retrieval'].push([key, value]);
      } else if (key.includes('_weight') || key.includes('keyword_boost') || key.includes('recency_weight')) {
        groups['Weighting'].push([key, value]);
      } else if (key.includes('layer_bonus_')) {
        groups['Layer Bonuses'].push([key, value]);
      } else if (key.includes('rerank_') || key.includes('disable_rerank')) {
        groups['Reranking'].push([key, value]);
      } else if (key.includes('embed_') || key.includes('chunk_')) {
        groups['Embedding & Chunking'].push([key, value]);
      } else if (key.includes('exclude_')) {
        groups['Exclusions'].push([key, value]);
      } else {
        groups['Other'].push([key, value]);
      }
    });

    return groups;
  })();

  return (
    <div className="eval-drill-down" style={{ padding: '24px' }}>
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
            Top-1 Accuracy
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
            {((evalRun?.top1_accuracy ?? 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
            {evalRun?.top1_hits ?? 0} / {evalRun?.total ?? 0} questions
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
            Top-K Accuracy
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--link)' }}>
            {((evalRun?.topk_accuracy ?? 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
            {evalRun?.topk_hits ?? 0} / {evalRun?.total ?? 0} questions
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
            Avg Duration
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fg)' }}>
            {(() => {
              const total = evalRun?.total ?? 0;
              const totalDuration = evalRun?.duration_secs ?? 0;
              const avgDuration = total > 0 ? totalDuration / total : 0;
              return avgDuration.toFixed(2);
            })()}s
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
            Total: {(evalRun?.duration_secs ?? 0).toFixed(1)}s ({((evalRun?.duration_secs ?? 0) / 60).toFixed(1)}m)
          </div>
        </div>

        {compareRun && (
          <>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
                Regressions
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--err)' }}>
                {regressions}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                Questions that got worse
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
                Improvements
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-green)' }}>
                {improvements}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                Questions that got better
              </div>
            </div>
          </>
        )}
      </div>

      {/* Run Configuration - Always Show */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--fg)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚙️</span>
          Run Configuration — {evalRun.run_id}
          <span style={{ fontSize: '10px', color: 'var(--fg-muted)', fontWeight: 'normal', marginLeft: '8px' }}>
            (config keys: {Object.keys(evalRun.config || {}).length}, type: {typeof evalRun.config})
          </span>
        </h3>

        {Object.keys(evalRun.config || {}).length === 0 ? (
          <div>
            <div style={{ color: 'var(--fg-muted)', fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }}>
              No config parameters captured for this run
            </div>
            <div style={{ fontSize: '10px', color: 'var(--fg-muted)', fontFamily: 'monospace', background: 'var(--bg-elev2)', padding: '8px', borderRadius: '4px' }}>
              DEBUG: config = {JSON.stringify(evalRun.config)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.entries(groupedConfig).map(([category, params]) => {
              if (params.length === 0) return null;
              return (
                <div key={category} style={{
                  background: 'var(--bg-elev2)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    letterSpacing: '0.5px'
                  }}>
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {params.map(([key, value]) => (
                      <div key={key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        padding: '4px 8px',
                        background: 'var(--card-bg)',
                        borderRadius: '4px'
                      }}>
                        <span style={{ color: 'var(--fg)', fontFamily: 'monospace' }}>{key}</span>
                        <span style={{
                          color: 'var(--link)',
                          fontWeight: 600,
                          fontFamily: 'monospace'
                        }}>
                          {typeof value === 'boolean' ? (value ? '✓' : '✗') : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔥 CONFIG DIFF - THE MOST IMPORTANT SECTION 🔥 */}
      {configDiffs && configDiffs.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.05), rgba(var(--link-rgb), 0.05))',
          border: '3px solid var(--accent)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--accent)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            CONFIGURATION CHANGES — ONLY WHAT'S DIFFERENT
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              background: 'var(--accent)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              {configDiffs.length} params changed
            </span>
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '20px' }}>
            Comparing: <span style={{ fontFamily: 'monospace', color: 'var(--err)' }}>{compareRun?.run_id || 'baseline'}</span>
            {' → '}
            <span style={{ fontFamily: 'monospace', color: 'var(--accent-green)' }}>{evalRun.run_id}</span>
            {' • '}
            Performance change:
            <span style={{
              color: evalRun.topk_accuracy > (compareRun?.topk_accuracy ?? 0) ? 'var(--accent-green)' : 'var(--err)',
              fontWeight: 600,
              marginLeft: '8px'
            }}>
              {((evalRun.topk_accuracy - (compareRun?.topk_accuracy ?? 0)) * 100).toFixed(1)}%
            </span>
          </div>

          <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
            {configDiffs.map(({ key, current, previous }) => {
              // Determine if this param change correlates with improvement or regression
              const perfImproved = evalRun.topk_accuracy > (compareRun?.topk_accuracy ?? 0);
              const direction = JSON.stringify(current) > JSON.stringify(previous) ? 'increased' : 'decreased';

              return (
                <div key={key} style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr auto',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'var(--card-bg)',
                  border: '2px solid var(--line)',
                  borderRadius: '8px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {key}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontFamily: 'monospace', alignItems: 'center' }}>
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(var(--err-rgb), 0.1)',
                      border: '1px solid var(--err)',
                      borderRadius: '6px',
                      color: 'var(--err)',
                      fontWeight: 600
                    }}>
                      BEFORE: {JSON.stringify(previous)}
                    </div>
                    <span style={{ fontSize: '18px', color: 'var(--accent)' }}>→</span>
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(var(--accent-green-rgb), 0.1)',
                      border: '1px solid var(--accent-green)',
                      borderRadius: '6px',
                      color: 'var(--accent-green)',
                      fontWeight: 600
                    }}>
                      AFTER: {JSON.stringify(current)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--fg-muted)',
                    textAlign: 'right',
                    fontStyle: 'italic'
                  }}>
                    {direction}
                    {perfImproved && <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>⬆ perf improved</div>}
                    {!perfImproved && <div style={{ color: 'var(--err)', fontWeight: 600 }}>⬇ perf declined</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Regression/Improvement Correlation Summary */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--bg-elev2)',
            borderRadius: '8px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '12px' }}>
              📊 Impact Analysis:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--err)', fontWeight: 600 }}>{regressions} regressions</span>
                <span style={{ color: 'var(--fg-muted)' }}> (questions that got worse)</span>
              </div>
              <div>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{improvements} improvements</span>
                <span style={{ color: 'var(--fg-muted)' }}> (questions that got better)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Results Table */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--fg)',
            margin: 0
          }}>
            Question Results
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            Click any question to see details
          </div>
        </div>

        <div style={{ maxHeight: '600px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elev2)', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  #
                </th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Question
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Top-1
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Top-K
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Duration
                </th>
                {compareRun && (
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {evalRun.results.map((result, idx) => {
                const status = getRegressionStatus(idx);
                const isExpanded = selectedQuestion === idx;

                return (
                  <React.Fragment key={idx}>
                    <tr
                      onClick={() => setSelectedQuestion(isExpanded ? null : idx)}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isExpanded ? 'var(--bg-elev2)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--fg-muted)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: 'var(--fg)', maxWidth: '400px' }}>
                        {result.question}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: result.top1_hit ? 'var(--accent-green)' : 'var(--err)',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 600,
                          lineHeight: '20px'
                        }}>
                          {result.top1_hit ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: result.topk_hit ? 'var(--accent-green)' : 'var(--err)',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 600,
                          lineHeight: '20px'
                        }}>
                          {result.topk_hit ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: 'var(--fg-muted)' }}>
                        <div>{(result?.duration_secs ?? 0).toFixed(2)}s</div>
                        <div style={{ fontSize: '9px', color: 'var(--fg-muted)' }}>
                          ({((result?.duration_secs ?? 0) * 1000).toFixed(0)}ms)
                        </div>
                      </td>
                      {compareRun && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {status === 'regression' && (
                            <span style={{ color: 'var(--err)', fontWeight: 600, fontSize: '11px' }}>⬇ WORSE</span>
                          )}
                          {status === 'improvement' && (
                            <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '11px' }}>⬆ BETTER</span>
                          )}
                          {status === 'unchanged' && (
                            <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={compareRun ? 6 : 5} style={{ padding: '16px', background: 'var(--bg-elev1)' }}>
                          <div style={{ display: 'grid', gap: '16px', fontSize: '12px' }}>
                            {/* Expected Paths */}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
                                ✓ Expected Paths:
                                <span style={{ fontSize: '10px', color: 'var(--fg-muted)', marginLeft: '8px' }}>
                                  (type: {typeof result.expect_paths}, array: {Array.isArray(result.expect_paths) ? 'yes' : 'no'}, count: {result.expect_paths?.length ?? 0})
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {result.expect_paths && Array.isArray(result.expect_paths) && result.expect_paths.length > 0 ? (
                                  result.expect_paths.map((path, i) => (
                                    <div key={i} style={{
                                      fontFamily: 'monospace',
                                      padding: '6px 10px',
                                      background: 'var(--card-bg)',
                                      borderRadius: '4px',
                                      color: 'var(--fg)'
                                    }}>
                                      {path}
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ color: 'var(--fg-muted)' }}>No expected paths specified</div>
                                )}
                              </div>
                            </div>

                            {/* Returned Paths */}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--link)', marginBottom: '8px' }}>
                                → Returned Paths:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {result.top_paths && result.top_paths.length > 0 ? (
                                  result.top_paths.map((path, i) => {
                                    const isExpected = result.expect_paths?.some(exp => path.includes(exp));
                                    return (
                                      <div key={i} style={{
                                        fontFamily: 'monospace',
                                        padding: '6px 10px',
                                        background: isExpected ? 'rgba(var(--accent-green-rgb), 0.1)' : 'var(--card-bg)',
                                        borderRadius: '4px',
                                        borderLeft: isExpected ? '3px solid var(--accent-green)' : 'none',
                                        color: 'var(--fg)',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                      }}>
                                        <span>{path}</span>
                                        {isExpected && (
                                          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✓ MATCH</span>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{ color: 'var(--err)' }}>No results returned</div>
                                )}
                              </div>
                            </div>

                            {/* Scores if available */}
                            {result.docs && result.docs.length > 0 && (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>
                                  Document Scores:
                                  {(() => {
                                    const scores = result.docs.map(d => d?.score ?? 0);
                                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                    const min = Math.min(...scores);
                                    const max = Math.max(...scores);
                                    return (
                                      <span style={{ fontSize: '10px', color: 'var(--fg-muted)', marginLeft: '8px', fontWeight: 'normal' }}>
                                        (avg: {avg.toFixed(4)}, min: {min.toFixed(4)}, max: {max.toFixed(4)})
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {result.docs.map((doc, i) => (
                                    <div key={i} style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontFamily: 'monospace',
                                      padding: '6px 10px',
                                      background: 'var(--card-bg)',
                                      borderRadius: '4px'
                                    }}>
                                      <span style={{ color: 'var(--fg)' }}>{doc.file_path}</span>
                                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                        {(doc?.score ?? 0).toFixed(4)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
