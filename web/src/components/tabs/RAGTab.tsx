// Imported from react/rag-tab-and-modules (96a86e0)
// AGRO - RAG Tab Component (React)
// Main RAG configuration tab with subtab navigation

import { useState } from 'react';
import { RAGSubtabs } from '@/components/RAG/RAGSubtabs';
import { DataQualitySubtab } from '@/components/RAG/DataQualitySubtab';
import { RetrievalSubtab } from '@/components/RAG/RetrievalSubtab';
import { ExternalRerankersSubtab } from '@/components/RAG/ExternalRerankersSubtab';
import { LearningRankerSubtab } from '@/components/RAG/LearningRankerSubtab';
import { IndexingSubtab } from '@/components/RAG/IndexingSubtab';
import { EvaluateSubtab } from '@/components/RAG/EvaluateSubtab';

export default function RAGTab() {
  const [activeSubtab, setActiveSubtab] = useState('data-quality');

  return (
    <>
      {/* Subtab navigation */}
      <RAGSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* Subtab content */}
      <div className="tab-panels">
        {activeSubtab === 'data-quality' && <DataQualitySubtab />}
        {activeSubtab === 'retrieval' && <RetrievalSubtab />}
        {activeSubtab === 'external-rerankers' && <ExternalRerankersSubtab />}
        {activeSubtab === 'learning-ranker' && <LearningRankerSubtab />}
        {activeSubtab === 'indexing' && <IndexingSubtab />}
        {activeSubtab === 'evaluate' && <EvaluateSubtab />}
      </div>
    </>
  );
}

