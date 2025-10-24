import React, { useEffect, useState } from 'react'

type Summary = {
  repo: { name: string; mode: string; branch?: string | null }
  retrieval: { mode: string; top_k: number }
  reranker: { enabled: boolean; backend?: string | null; provider?: string | null; model?: string | null }
  enrichment: { enabled: boolean; backend?: string | null; model?: string | null }
  generation: { provider?: string | null; model?: string | null }
  health: { qdrant: string; redis: string; llm: string }
}

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pipeline/summary')
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data) => setSummary(data))
      .catch((e) => setError(typeof e === 'string' ? e : (e?.message || 'Failed to load summary')))
  }, [])

  if (error) return <div className="container"><div className="card"><h3>Pipeline Summary</h3><div className="text-err">{error}</div></div></div>
  if (!summary) return <div className="container"><div className="card"><h3>Pipeline Summary</h3><div>Loading...</div></div></div>

  return (
    <div className="container">
      <div className="card">
        <h3>Pipeline Summary</h3>
        <div className="grid" style={{ gap: 12 }}>
          <div><strong>Repo:</strong> {summary.repo.name}{summary.repo.branch ? ` (${summary.repo.branch})` : ''}</div>
          <div><strong>Retrieval:</strong> {summary.retrieval.mode} (top_k: {summary.retrieval.top_k})</div>
          <div><strong>Reranker:</strong> {summary.reranker.enabled ? `${summary.reranker.backend || ''} ${summary.reranker.model || ''}` : 'disabled'}</div>
          <div><strong>Enrichment:</strong> {summary.enrichment.enabled ? `${summary.enrichment.backend || ''} ${summary.enrichment.model || ''}` : 'disabled'}</div>
          <div><strong>Generation:</strong> {summary.generation.model || '—'}</div>
          <div><strong>Health:</strong> qdrant={summary.health.qdrant} redis={summary.health.redis} llm={summary.health.llm}</div>
        </div>
      </div>
    </div>
  )
}

