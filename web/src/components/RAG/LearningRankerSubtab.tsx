// Imported from react/rag-tab-and-modules (96a86e0)
import React, { useEffect, useState } from 'react';

export function LearningRankerSubtab() {
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/reranker/info');
        const j = await r.json();
        setInfo(j);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    load();
  }, []);

  return (
    <div id="tab-rag-learning-ranker" className="rag-subtab-content">
      <div className="settings-section">
        <h3>Learning Ranker</h3>
        <p className="small" style={{ color: 'var(--fg-muted)' }}>
          Live status from /api/reranker/info.
        </p>
        {error && <div style={{ color: 'var(--err)' }}>Error: {error}</div>}
        {info && (
          <div className="mono" style={{ fontSize: 12, lineHeight: 1.6, background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6, padding: 12 }}>
            <div>Enabled: {String(info.enabled)}</div>
            <div>Model Path: {info.path}</div>
            <div>Device: {info.device}</div>
            <div>Alpha: {info.alpha} • TopN: {info.topn} • Batch: {info.batch} • MaxLen: {info.maxlen}</div>
          </div>
        )}
      </div>
    </div>
  );
}
