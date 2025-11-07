import { useEffect, useState } from 'react';

const modules = [
  './modules/fetch-shim.js',
  './modules/core-utils.js',
  './modules/api-base-override.js',
  './modules/ui-helpers.js',
  './modules/theme.js',
  './modules/test-instrumentation.js',
  './modules/navigation.js',
  './modules/tabs.js',
  './modules/rag-navigation.js',
  './modules/search.js',
  './modules/tooltips.js',
  './modules/config.js',
  './modules/health.js',
  './modules/git-hooks.js',
  './modules/git-commit-meta.js',
  './modules/keywords.js',
  './modules/autotune.js',
  './modules/editor.js',
  './modules/editor-settings.js',
  './modules/secrets.js',
  './modules/model_flows.js',
  './modules/index_status.js',
  './modules/mcp_rag.js',
  './modules/mcp_server.js',
  './modules/index_profiles.js',
  './modules/indexing.js',
  './modules/simple_index.js',
  './modules/docker.js',
  './modules/grafana.js',
  './modules/vscode.js',
  './modules/onboarding.js',
  './modules/index-display.js',
  './modules/cards.js',
  './modules/cards_builder.js',
  './modules/cost_logic.js',
  './modules/storage-calculator-template.js',
  './modules/storage-calculator.js',
  './modules/profile_logic.js',
  './modules/profile_renderer.js',
  './modules/autoprofile_v2.js',
  './modules/reranker.js',
  './modules/eval_runner.js',
  './modules/eval_history.js',
  './modules/golden_questions.js',
  './modules/langsmith.js',
  './modules/live-terminal.js',
  './modules/trace.js',
  './modules/ux-feedback.js',
  './modules/alerts.js',
  './modules/dino.js',
  './modules/error-helpers.js',
  './modules/layout_fix.js',
  './modules/chat.js',
  './modules/app.js',
];

export default function AppDebug() {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [failed, setFailed] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadSequentially = async () => {
      for (const mod of modules) {
        try {
          console.log(`Loading: ${mod}`);
          await import(mod);
          setLoaded(prev => [...prev, mod]);
          console.log(`✅ Loaded: ${mod}`);
        } catch (e: any) {
          setFailed(mod);
          setError(e.message);
          console.error(`❌ Failed: ${mod}`, e);
          break;
        }
      }
    };

    loadSequentially();
  }, []);

  return (
    <div style={{padding: '20px', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh'}}>
      <h1 style={{color: '#4ec9b0'}}>Module Loading Debug</h1>
      <div style={{marginBottom: '20px', padding: '10px', background: '#252526', borderRadius: '4px'}}>
        <p><strong>Progress:</strong> {loaded.length}/{modules.length}</p>
        {failed && (
          <div style={{marginTop: '10px', padding: '10px', background: '#5a1d1d', border: '1px solid #f48771', borderRadius: '4px'}}>
            <p style={{color: '#f48771', fontWeight: 'bold'}}>❌ FAILED: {failed}</p>
            <pre style={{color: '#ce9178', fontSize: '12px', overflow: 'auto'}}>{error}</pre>
          </div>
        )}
        {loaded.length === modules.length && !failed && (
          <div style={{marginTop: '10px', padding: '10px', background: '#1d5a1d', border: '1px solid #4ec9b0', borderRadius: '4px'}}>
            <p style={{color: '#4ec9b0', fontWeight: 'bold'}}>✅ ALL MODULES LOADED SUCCESSFULLY!</p>
          </div>
        )}
      </div>
      <div style={{background: '#252526', padding: '10px', borderRadius: '4px', maxHeight: '70vh', overflow: 'auto'}}>
        <h3 style={{color: '#4ec9b0'}}>Loaded Modules:</h3>
        <ul style={{listStyle: 'none', padding: 0}}>
          {loaded.map((m, i) => (
            <li key={i} style={{padding: '4px 0', color: '#4ec9b0'}}>
              ✅ {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
