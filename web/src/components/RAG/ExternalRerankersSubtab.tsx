// Imported from react/rag-tab-and-modules (96a86e0)
import React, { useEffect, useState } from 'react';

export function ExternalRerankersSubtab() {
  const [avail, setAvail] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/reranker/available');
        const j = await r.json();
        setAvail(j);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    load();
  }, []);

  return (
    <div id="tab-rag-external-rerankers" className="rag-subtab-content">
      <div className="settings-section">
        <h3>External Rerankers</h3>
        <p className="small" style={{ color: 'var(--fg-muted)' }}>
          Live status from /api/reranker/available.
        </p>
        {error && <div style={{ color: 'var(--err)' }}>Error: {error}</div>}
        {avail && (
          <pre style={{ background: 'var(--code-bg)', border: '1px solid var(--line)', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(avail, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
