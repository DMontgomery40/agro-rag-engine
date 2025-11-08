import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

export const TuneStep: React.FC = () => {
  const { state, setSettings, saveAsProject, runEvaluation, saveCompletion } = useOnboarding();
  const { settings } = state;
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{ success: boolean; score?: number; error?: string } | null>(null);
  const [settingsSummary, setSettingsSummary] = useState<string>('');

  // Update settings summary whenever settings change
  useEffect(() => {
    const { speed, quality, cloud } = settings;

    const speedMap: Record<number, string> = {
      1: 'MQ_REWRITES=1, LANGGRAPH_FINAL_K=10',
      2: 'MQ_REWRITES=2, LANGGRAPH_FINAL_K=15',
      3: 'MQ_REWRITES=3, LANGGRAPH_FINAL_K=20',
      4: 'MQ_REWRITES=4, LANGGRAPH_FINAL_K=25',
    };

    const qualityMap: Record<number, string> = {
      1: 'RERANK_BACKEND=none, GEN_MODEL=local',
      2: 'RERANK_BACKEND=local, GEN_MODEL=gpt-4o-mini',
      3: 'RERANK_BACKEND=cohere, GEN_MODEL=gpt-4o, CONF_TOP1=0.55',
    };

    const cloudMap: Record<number, string> = {
      1: 'EMBEDDING_TYPE=local, VECTOR_BACKEND=qdrant (local)',
      2: 'EMBEDDING_TYPE=openai, VECTOR_BACKEND=qdrant (cloud)',
    };

    const summary = `
Speed: ${speedMap[speed] || 'default'}
Quality: ${qualityMap[quality] || 'default'}
Cloud: ${cloudMap[cloud] || 'default'}
    `.trim();

    setSettingsSummary(summary);
  }, [settings]);

  const handleSliderChange = (key: 'speed' | 'quality' | 'cloud', value: number) => {
    setSettings({ [key]: value });
  };

  const handleSaveProject = async () => {
    const name = prompt('Enter a name for this project:');
    if (!name || !name.trim()) return;

    const success = await saveAsProject(name.trim());
    if (success) {
      alert('Project saved successfully!');
      await saveCompletion();
    } else {
      alert('Failed to save project. Please check the console for errors.');
    }
  };

  const handleRunEval = async () => {
    setIsEvaluating(true);
    setEvalResult(null);

    const result = await runEvaluation();
    setEvalResult(result);
    setIsEvaluating(false);
  };

  return (
    <div className="ob-main">
      <h2 id="tune-title" className="ob-title">
        Tune and Save Your Project
      </h2>

      {/* Sliders */}
      <div className="ob-sliders">
        <div className="ob-slider-group" style={{ marginBottom: '32px' }}>
          <label htmlFor="onboard-slider-speed" style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>
            Faster ← → Thorough
          </label>
          <input
            type="range"
            id="onboard-slider-speed"
            min="1"
            max="4"
            value={settings.speed}
            step="1"
            onChange={(e) => handleSliderChange('speed', parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
            aria-label="Speed setting"
          />
          <div className="ob-slider-labels" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
            <span>Fast</span>
            <span>Balanced</span>
            <span>Thorough</span>
          </div>
        </div>

        <div className="ob-slider-group" style={{ marginBottom: '32px' }}>
          <label htmlFor="onboard-slider-quality" style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>
            Cheapest ← → Smartest
          </label>
          <input
            type="range"
            id="onboard-slider-quality"
            min="1"
            max="3"
            value={settings.quality}
            step="1"
            onChange={(e) => handleSliderChange('quality', parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
            aria-label="Quality setting"
          />
          <div className="ob-slider-labels" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
            <span>Local/Free</span>
            <span>Balanced</span>
            <span>Best Quality</span>
          </div>
        </div>

        <div className="ob-slider-group" style={{ marginBottom: '32px' }}>
          <label htmlFor="onboard-slider-cloud" style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>
            Local ← → Cloud
          </label>
          <input
            type="range"
            id="onboard-slider-cloud"
            min="1"
            max="2"
            value={settings.cloud}
            step="1"
            onChange={(e) => handleSliderChange('cloud', parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
            aria-label="Cloud setting"
          />
          <div className="ob-slider-labels" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
            <span>Local Only</span>
            <span>Cloud APIs</span>
          </div>
        </div>
      </div>

      {/* Settings summary */}
      <div
        id="onboard-settings-summary"
        className="ob-settings-box"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--fg-muted)' }}>
          Settings to Apply:
        </h4>
        <div
          id="onboard-summary-content"
          className="ob-summary-content"
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: 'var(--fg-muted)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {settingsSummary}
        </div>
      </div>

      {/* Action buttons */}
      <div className="ob-actions" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          id="onboard-save-project"
          className="ob-primary-btn"
          onClick={handleSaveProject}
          style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--bg)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          aria-label="Save as project"
        >
          Save as a Project
        </button>
        <button
          id="onboard-run-eval"
          className="ob-secondary-btn"
          onClick={handleRunEval}
          disabled={isEvaluating}
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
          }}
          aria-label="Run evaluation"
        >
          {isEvaluating ? 'Running...' : 'Run a Tiny Evaluation'}
        </button>
      </div>

      {/* Eval progress */}
      {isEvaluating && (
        <div
          id="onboard-eval-progress"
          className="ob-eval-box"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
          }}
          role="region"
          aria-live="polite"
          aria-label="Evaluation progress"
        >
          <div className="ob-progress-bar">
            <div
              id="onboard-eval-bar"
              className="ob-progress-fill"
              style={{ width: '30%' }}
            ></div>
          </div>
          <div id="onboard-eval-status" className="ob-progress-text">
            Running evaluation...
          </div>
        </div>
      )}

      {/* Eval result */}
      {evalResult && !isEvaluating && (
        <div
          id="onboard-eval-result"
          className="ob-eval-result"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '20px',
            fontSize: '14px',
            color: evalResult.success ? 'var(--fg)' : 'var(--err)',
          }}
          role="status"
          aria-live="polite"
        >
          {evalResult.success
            ? `Retrieval Score: ${((evalResult.score || 0) * 100).toFixed(1)}%`
            : `Error: ${evalResult.error || 'Unknown error'}`}
        </div>
      )}
    </div>
  );
};
