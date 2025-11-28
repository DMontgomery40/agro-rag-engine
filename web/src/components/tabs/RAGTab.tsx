// Imported from react/rag-tab-and-modules (96a86e0)
// AGRO - RAG Tab Component (React)
// Main RAG configuration tab with subtab navigation
// Structure matches /gui/index.html exactly with all subtabs rendered and visibility controlled by className

import { useEffect, useState } from 'react';
import { RAGSubtabs } from '@/components/RAG/RAGSubtabs';
import { DataQualitySubtab } from '@/components/RAG/DataQualitySubtab';
import { RetrievalSubtab } from '@/components/RAG/RetrievalSubtab';
import { ExternalRerankersSubtab } from '@/components/RAG/ExternalRerankersSubtab';
import { LearningRankerSubtab } from '@/components/RAG/LearningRankerSubtab';
import { IndexingSubtab } from '@/components/RAG/IndexingSubtab';
import { EvaluateSubtab } from '@/components/RAG/EvaluateSubtab';

export default function RAGTab() {
  const [activeSubtab, setActiveSubtab] = useState('data-quality');

  // Bridge legacy modules when subtabs mount
  useEffect(() => {
    const initDataQuality = () => {
      try { (window as any).Config?.loadConfig?.(); } catch {}
      try { (window as any).initCards?.(); } catch {}
      try { (window as any).initCardsBuilder?.(); } catch {}
      try { (window as any).initKeywords?.(); } catch {}
    };
    const initLearningRanker = () => {
      try { window.dispatchEvent(new Event('agro:reranker:mount')); } catch {}
      try { (window as any).RerankerUI?.init?.(); } catch {}
    };
    if (activeSubtab === 'data-quality') {
      // Allow DOM to paint then initialize
      setTimeout(initDataQuality, 0);
    }
    if (activeSubtab === 'indexing') {
      const initIndexing = () => {
        try { (window as any).Config?.loadConfig?.(); } catch {}
        try { (window as any).Indexing?.initIndexing?.(); } catch {}
        try { (window as any).initIndexProfiles?.(); } catch {}
        try { (window as any).SimpleIndex?.loadRepos?.(); } catch {}
        try {
          const btn = document.getElementById('simple-index-btn') as HTMLButtonElement | null;
          if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => (window as any).SimpleIndex?.runRealIndex?.());
          }
        } catch {}
      };
      setTimeout(initIndexing, 0);
    }
    if (activeSubtab === 'learning-ranker') {
      setTimeout(initLearningRanker, 0);
    }
  }, [activeSubtab]);

  return (
    <div id="tab-rag" className="tab-content">
      {/* Subtab navigation */}
      <RAGSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* All subtabs rendered with visibility controlled by className */}
      <div id="tab-rag-data-quality" className={`rag-subtab-content ${activeSubtab === 'data-quality' ? 'active' : ''}`}>
        <DataQualitySubtab />
      </div>

      <div id="tab-rag-retrieval" className={`rag-subtab-content ${activeSubtab === 'retrieval' ? 'active' : ''}`}>
        <RetrievalSubtab />
      </div>

      <div id="tab-rag-external-rerankers" className={`rag-subtab-content ${activeSubtab === 'external-rerankers' ? 'active' : ''}`}>
        <ExternalRerankersSubtab />
      </div>

      <div id="tab-rag-learning-ranker" className={`rag-subtab-content ${activeSubtab === 'learning-ranker' ? 'active' : ''}`}>
        <LearningRankerSubtab />
      </div>

      <div id="tab-rag-indexing" className={`rag-subtab-content ${activeSubtab === 'indexing' ? 'active' : ''}`}>
        <IndexingSubtab />
      </div>

      <div id="tab-rag-evaluate" className={`rag-subtab-content ${activeSubtab === 'evaluate' ? 'active' : ''}`}>
        <EvaluateSubtab />
      </div>
    </div>
  );
}
