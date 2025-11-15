import React, { useEffect, useState } from 'react'
import { Button } from '../components/ui'
import { ChevronRight } from '../components/icons/ChevronRight'

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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-cardBg border border-line rounded-xl p-4">
          <h3 className="text-lg font-semibold text-fg mb-2">Pipeline Summary</h3>
          <div className="text-err">{error}</div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-cardBg border border-line rounded-xl p-4">
          <h3 className="text-lg font-semibold text-fg mb-2">Pipeline Summary</h3>
          <div className="text-muted">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Button Component Demo */}
      <div className="bg-cardBg border border-line rounded-xl p-6">
        <h3 className="text-lg font-semibold text-fg mb-4">Button Component Demo</h3>
        
        <div className="space-y-4">
          <div>
            <div className="text-muted text-sm mb-2">Variants (medium size)</div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>

          <div>
            <div className="text-muted text-sm mb-2">Sizes (primary variant)</div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </div>

          <div>
            <div className="text-muted text-sm mb-2">With Icons</div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" rightIcon={<ChevronRight />}>Continue</Button>
              <Button variant="secondary" size="sm" leftIcon={<ChevronRight />}>Back</Button>
              <Button variant="ghost" rightIcon={<ChevronRight />}>Learn More</Button>
            </div>
          </div>

          <div>
            <div className="text-muted text-sm mb-2">Full Width</div>
            <Button variant="primary" fullWidth>Full Width Button</Button>
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-cardBg border border-line rounded-xl p-4">
        <h3 className="text-lg font-semibold text-fg mb-4">Pipeline Summary</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="text-fg">
            <span className="text-muted">Repo:</span>{' '}
            <span className="font-medium">{summary.repo.name}</span>
            {summary.repo.branch && <span className="text-muted"> ({summary.repo.branch})</span>}
          </div>
          <div className="text-fg">
            <span className="text-muted">Retrieval:</span>{' '}
            <span className="font-medium">{summary.retrieval.mode}</span>
            <span className="text-muted"> (top_k: {summary.retrieval.top_k})</span>
          </div>
          <div className="text-fg">
            <span className="text-muted">Reranker:</span>{' '}
            <span className="font-medium">
              {summary.reranker.enabled
                ? `${summary.reranker.backend || ''} ${summary.reranker.model || ''}`
                : 'disabled'}
            </span>
          </div>
          <div className="text-fg">
            <span className="text-muted">Enrichment:</span>{' '}
            <span className="font-medium">
              {summary.enrichment.enabled
                ? `${summary.enrichment.backend || ''} ${summary.enrichment.model || ''}`
                : 'disabled'}
            </span>
          </div>
          <div className="text-fg">
            <span className="text-muted">Generation:</span>{' '}
            <span className="font-medium">{summary.generation.model || '—'}</span>
          </div>
          <div className="text-fg">
            <span className="text-muted">Health:</span>{' '}
            <span className="font-mono text-sm">
              qdrant=<span className="text-ok">{summary.health.qdrant}</span>{' '}
              redis=<span className="text-ok">{summary.health.redis}</span>{' '}
              llm=<span className="text-ok">{summary.health.llm}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

