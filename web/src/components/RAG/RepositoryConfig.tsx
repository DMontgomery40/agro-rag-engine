// AGRO - Repository Configuration Component
// Refactored to use Zustand stores per CLAUDE.md requirements
// Uses useRepoStore for repo list/selection, useConfigStore.updateRepo() for persistence

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRepoStore } from '@/stores/useRepoStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { KeywordManager } from '@/components/KeywordManager';

interface RepositoryConfigProps {
  // Only keep the callback that parent needs for syncing UI state
  onExcludePathsChange?: (paths: string[]) => void;
}

/**
 * ---agentspec
 * what: |
 *   Renders repository configuration UI. Syncs exclude paths from local input state to Zustand store via debounced updateRepo callback.
 *
 * why: |
 *   Separates transient UI state (text input) from persistent store state to avoid excessive re-renders and API calls during typing.
 *
 * guardrails:
 *   - DO NOT bypass debounce; direct store writes on every keystroke cause performance degradation
 *   - NOTE: repoData is reactive; local state must reconcile on activeRepo changes
 *   - ASK USER: Confirm debounce delay (ms) before deployment
 * ---/agentspec
 */
export function RepositoryConfig({ onExcludePathsChange }: RepositoryConfigProps) {
  // Get repos and active repo from Zustand store
  const { repos, activeRepo, loading: reposLoading, getRepoByName, loadRepos } = useRepoStore();
  const { updateRepo, saving } = useConfigStore();
  
  // Get current repo data from store (reactive to store changes)
  const repoData = getRepoByName(activeRepo);
  
  // Local state ONLY for text inputs that need debouncing before save
  const [repoPathInput, setRepoPathInput] = useState('');
  const [excludePathInput, setExcludePathInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [pathBoostsInput, setPathBoostsInput] = useState('');
  const [layerBonusesInput, setLayerBonusesInput] = useState('');
  
  // Ref to track if we're initializing from store (prevent save on mount)
  const isInitializing = useRef(true);

  // Load repos on mount if not loaded
  useEffect(() => {
    if (repos.length === 0 && !reposLoading) {
      loadRepos();
    }
  }, [repos.length, reposLoading, loadRepos]);

  // Sync local inputs from store when repo changes
  useEffect(() => {
    if (!repoData) return;
    isInitializing.current = true;
    
    setRepoPathInput(repoData.path || '');
    setKeywordsInput((repoData.keywords || []).join(', '));
    setPathBoostsInput((repoData.path_boosts || []).join(', '));
    setLayerBonusesInput(
      repoData.layer_bonuses ? JSON.stringify(repoData.layer_bonuses, null, 2) : ''
    );
    
    // Allow saves after initial sync
    setTimeout(() => { isInitializing.current = false; }, 100);
  }, [repoData?.name]); // Only re-sync when repo changes

  useEffect(() => {
    if (!repoData || isInitializing.current) return;
    if (repoData.path === repoPathInput) return;
    
    /**
     * ---agentspec
     * what: |
     *   Debounces repo path input changes (1s delay) and syncs to activeRepo via updateRepo. Cleanup clears timeout on unmount/dependency change.
     *
     * why: |
     *   Debouncing prevents excessive API calls on rapid user input; cleanup prevents memory leaks from orphaned timers.
     *
     * guardrails:
     *   - DO NOT call updateRepo synchronously; debounce protects against thrashing
     *   - NOTE: isInitializing.current guard prevents updates during initialization phase
     * ---/agentspec
     */
    const timeoutId = setTimeout(() => {
      updateRepo(activeRepo, { path: repoPathInput });
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [repoPathInput, repoData, activeRepo, updateRepo]);

  useEffect(() => {
    if (!repoData || isInitializing.current) return;
    
    /**
     * ---agentspec
     * what: |
     *   Debounces keyword input (1s delay). Splits comma-separated string, trims, filters empties. Compares sorted keywords; calls updateRepo only if changed.
     *
     * why: |
     *   Debounce prevents excessive updates on rapid typing; sorted comparison avoids redundant API calls for reordered identical keywords.
     *
     * guardrails:
     *   - DO NOT call updateRepo if keywords unchanged (sorted comparison prevents this)
     *   - NOTE: Cleanup function clears timeout on unmount/re-render
     * ---/agentspec
     */
    const timeoutId = setTimeout(() => {
      /**
       * ---agentspec
       * what: |
       *   Debounces keyword input changes (1s delay). Compares sorted current vs. new keywords; calls updateRepo only if different.
       *
       * why: |
       *   Debouncing prevents excessive updates on rapid typing; sorting + string comparison avoids redundant API calls for reordered identical keywords.
       *
       * guardrails:
       *   - DO NOT update if keywords are identical after sort (already implemented)
       *   - NOTE: Cleanup function clears timeout on unmount; missing dependency on timeoutId is safe (closure captures it)
       * ---/agentspec
       */
      const keywordsArray = keywordsInput.split(',').map(s => s.trim()).filter(Boolean);
      const currentKeywords = (repoData.keywords || []).sort().join(',');
      const newKeywords = keywordsArray.sort().join(',');
      if (currentKeywords !== newKeywords) {
        updateRepo(activeRepo, { keywords: keywordsArray });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [keywordsInput, repoData, activeRepo, updateRepo]);

  useEffect(() => {
    if (!repoData || isInitializing.current) return;
    
    /**
     * ---agentspec
     * what: |
     *   Debounces path_boosts input (1s delay). Parses comma-separated string, sorts, compares to current boosts. Updates repo if changed.
     *
     * why: |
     *   Debounce prevents excessive updates on rapid user input; sorting ensures idempotent comparison.
     *
     * guardrails:
     *   - DO NOT update if sorted arrays match; prevents redundant writes
     *   - NOTE: Clears timeout on unmount to avoid stale updates
     * ---/agentspec
     */
    const timeoutId = setTimeout(() => {
      /**
       * ---agentspec
       * what: |
       *   Debounces path_boosts input changes (1s delay). Parses comma-separated string, sorts, compares with current boosts, updates repo if changed.
       *
       * why: |
       *   Debouncing prevents excessive updates on rapid user input; sorting ensures idempotent comparison.
       *
       * guardrails:
       *   - DO NOT update if sorted arrays match; prevents redundant writes
       *   - NOTE: Cleanup function clears timeout on unmount
       * ---/agentspec
       */
      const pathBoostsArray = pathBoostsInput.split(',').map(s => s.trim()).filter(Boolean);
      const currentBoosts = (repoData.path_boosts || []).sort().join(',');
      const newBoosts = pathBoostsArray.sort().join(',');
      if (currentBoosts !== newBoosts) {
        updateRepo(activeRepo, { path_boosts: pathBoostsArray });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [pathBoostsInput, repoData, activeRepo, updateRepo]);

  useEffect(() => {
    if (!repoData || isInitializing.current) return;
    
    /**
     * ---agentspec
     * what: |
     *   Debounced JSON parser for layer_bonuses input. Parses string → object, compares with current state, updates repo if changed.
     *
     * why: |
     *   Debounce prevents excessive updates on rapid input changes; JSON comparison avoids redundant writes.
     *
     * guardrails:
     *   - DO NOT update if parsed value equals current state; prevents unnecessary repo calls
     *   - NOTE: Silent fail on invalid JSON; empty string defaults to {}
     * ---/agentspec
     */
    const timeoutId = setTimeout(() => {
      try {
        const parsed = JSON.parse(layerBonusesInput || '{}');
        if (typeof parsed === 'object' && parsed !== null) {
          const currentBonuses = JSON.stringify(repoData.layer_bonuses || {});
          const newBonuses = JSON.stringify(parsed);
          if (currentBonuses !== newBonuses) {
            updateRepo(activeRepo, { layer_bonuses: parsed });
          }
        }
      } catch {
        // Invalid JSON, don't save yet
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [layerBonusesInput, repoData, activeRepo, updateRepo]);

  // Exclude paths - derive from store, save via store
  const excludePaths = repoData?.exclude_paths || [];

  /**
   * ---agentspec
   * what: |
   *   Adds/removes exclude paths from active repo config. Trims input, updates state, triggers callback.
   *
   * why: |
   *   Memoized callbacks prevent unnecessary re-renders; separation of add/remove logic keeps handlers focused.
   *
   * guardrails:
   *   - DO NOT add empty strings; trim() check prevents whitespace-only paths
   *   - NOTE: Requires activeRepo to exist; silently returns if missing
   *   - ASK USER: Should removal also trigger onExcludePathsChange callback?
   * ---/agentspec
   */
  const handleAddExcludePath = useCallback(() => {
    if (!excludePathInput.trim() || !activeRepo) return;
    const newPaths = [...excludePaths, excludePathInput.trim()];
    setExcludePathInput('');
    updateRepo(activeRepo, { exclude_paths: newPaths });
    onExcludePathsChange?.(newPaths);
  }, [excludePathInput, excludePaths, activeRepo, updateRepo, onExcludePathsChange]);

  /**
   * ---agentspec
   * what: |
   *   Removes a path from excludePaths array, updates repo config, and triggers callback. Filters out matching path string.
   *
   * why: |
   *   Memoized callback prevents unnecessary re-renders; decouples UI state from parent via callback.
   *
   * guardrails:
   *   - DO NOT mutate excludePaths directly; use filter to create new array
   *   - NOTE: Callback fires only if onExcludePathsChange is defined
   * ---/agentspec
   */
  const handleRemoveExcludePath = useCallback((path: string) => {
    /**
     * ---agentspec
     * what: |
     *   Removes a path from excludePaths array, updates repo config, triggers callback. Inputs: path string. Outputs: updated exclude_paths array.
     *
     * why: |
     *   Decouples path removal logic from UI; allows parent to sync state via callback.
     *
     * guardrails:
     *   - DO NOT mutate excludePaths directly; filter creates new array
     *   - NOTE: Callback fires only if path exists in excludePaths
     * ---/agentspec
     */
    const newPaths = excludePaths.filter(p => p !== path);
    updateRepo(activeRepo, { exclude_paths: newPaths });
    onExcludePathsChange?.(newPaths);
  }, [excludePaths, activeRepo, updateRepo, onExcludePathsChange]);

  if (reposLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading repository configuration...
      </div>
    );
  }

  if (!activeRepo || !repoData) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Select a repository to configure
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
      <h4 style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '12px' }}>Repo: {repoData.name}</h4>

      {/* Path */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label>Path</label>
        <input
          type="text"
          value={repoPathInput}
          onChange={(e) => setRepoPathInput(e.target.value)}
        />
      </div>

      {/* Exclude Paths */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label>Exclude Paths (paths/patterns to skip during indexing)</label>
        <div
          id={`exclude-paths-container-${repoData.name}`}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px',
            minHeight: '32px',
            padding: '8px',
            background: 'var(--bg-elev2)',
            border: '1px solid var(--line)',
            borderRadius: '4px'
          }}
        >
          {excludePaths.map((path, idx) => (
            <span
              key={idx}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {path}
              <button
                type="button"
                onClick={() => handleRemoveExcludePath(path)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-contrast)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            id={`exclude-path-input-${repoData.name}`}
            placeholder="e.g., /website, *.pyc, /node_modules"
            value={excludePathInput}
            onChange={(e) => setExcludePathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddExcludePath();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="small-button"
            id={`exclude-path-add-${repoData.name}`}
            onClick={handleAddExcludePath}
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '6px 12px' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Keywords */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label>Keywords (comma-separated)</label>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          list="keywords-list"
          placeholder="search or type to add"
        />
      </div>

      {/* Path Boosts */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label>Path Boosts (comma-separated)</label>
        <input
          type="text"
          value={pathBoostsInput}
          onChange={(e) => setPathBoostsInput(e.target.value)}
        />
      </div>

      {/* Layer Bonuses */}
      <div className="input-group">
        <label>Layer Bonuses (JSON)</label>
        <textarea
          value={layerBonusesInput}
          onChange={(e) => setLayerBonusesInput(e.target.value)}
          rows={3}
        />
      </div>

      {/* Keyword Manager */}
      <div className="input-group full-width" style={{ marginTop: '12px' }}>
        <KeywordManager
          repo={{
            name: repoData.name,
            path: repoData.path || '',
            keywords: repoData.keywords || [],
            path_boosts: repoData.path_boosts || [],
            layer_bonuses: repoData.layer_bonuses || {}
          }}
        />
      </div>

      {saving && (
        <div
          style={{
            padding: '8px',
            background: 'var(--card-bg)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--accent)',
            marginTop: '8px'
          }}
        >
          Saving to repos.json...
        </div>
      )}
    </div>
  );
}
