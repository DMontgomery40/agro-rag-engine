// Profile logic (algorithm only). Exported via window.ProfileLogic
;(function(){
  function proposeProfile(scan, budget){
    const hasLocal = !!(scan && (scan.runtimes?.ollama || scan.runtimes?.coreml));
    const rprov = (Number(budget) === 0) ? (hasLocal ? 'local' : 'cohere') : 'cohere';
    return {
      GEN_MODEL: hasLocal && Number(budget) === 0 ? 'qwen3-coder:14b' : 'gpt-4o-mini',
      EMBEDDING_TYPE: (Number(budget) === 0) ? (hasLocal ? 'local' : 'openai') : 'openai',
      RERANK_BACKEND: rprov,
      MQ_REWRITES: Number(budget) > 50 ? '6' : '3',
      TOPK_SPARSE: '75',
      TOPK_DENSE: '75',
      FINAL_K: Number(budget) > 50 ? '20' : '10',
      HYDRATION_MODE: 'lazy',
    };
  }

  function buildWizardProfile(scan, budget){
    // Currently mirrors proposeProfile; kept separate for future tuning
    return proposeProfile(scan, budget);
  }

  window.ProfileLogic = { proposeProfile, buildWizardProfile };
})();

