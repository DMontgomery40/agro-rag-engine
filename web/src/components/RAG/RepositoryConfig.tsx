// AGRO - Repository Configuration Component
// React port of legacy JS populateReposSection - EXACT UI match
// Fully wired to repos.json via PATCH /api/repos/{repo_name}

import { useState, useEffect, useCallback } from 'react';
import { useAPI } from '@/hooks';
import { KeywordManager } from '@/components/KeywordManager';

interface RepoData {
  name: string;
  slug?: string;
  path?: string;
  exclude_paths?: string[];
  keywords?: string[];
  path_boosts?: string[];
  layer_bonuses?: Record<string, Record<string, number>>;
}

interface RepositoryConfigProps {
  repos: string[];
  selectedRepo: string;
  onRepoChange: (repo: string) => void;
  onExcludePathsChange?: (paths: string[]) => void;
}

export function RepositoryConfig({ repos, selectedRepo, onRepoChange, onExcludePathsChange }: RepositoryConfigProps) {
  const { api } = useAPI();
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [repoPath, setRepoPath] = useState('');
  const [excludePaths, setExcludePaths] = useState<string[]>([]);
  const [excludePathInput, setExcludePathInput] = useState('');
  const [keywords, setKeywords] = useState('');
  const [pathBoosts, setPathBoosts] = useState('');
  const [layerBonuses, setLayerBonuses] = useState('');

  // Load repo data when selectedRepo changes
  useEffect(() => {
    if (!selectedRepo) {
      setRepoData(null);
      setLoading(false);
      return;
    }

    const loadRepoData = async () => {
      setLoading(true);
      try {
        const response = await fetch(api(`repos/${selectedRepo}`));
        const data = await response.json();
        if (data.ok && data.repo) {
          setRepoData(data.repo);
          setRepoPath(data.repo.path || '');
          setExcludePaths(data.repo.exclude_paths || []);
          setExcludePathInput('');
          setKeywords((data.repo.keywords || []).join(','));
          setPathBoosts((data.repo.path_boosts || []).join(','));
          setLayerBonuses(
            data.repo.layer_bonuses
              ? JSON.stringify(data.repo.layer_bonuses, null, 2)
              : ''
          );
        }
      } catch (e) {
        console.error('Failed to load repo data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadRepoData();

    // Listen for repo updates from KeywordManager
    const handleRepoUpdate = () => {
      loadRepoData();
    };
    window.addEventListener('repo-updated', handleRepoUpdate);
    return () => window.removeEventListener('repo-updated', handleRepoUpdate);
  }, [selectedRepo, api]);

  // Save to repos.json (debounced for text fields)
  const saveRepoData = useCallback(
    async (updates: Partial<RepoData>) => {
      if (!selectedRepo || saving) return;

      setSaving(true);
      try {
        const response = await fetch(api(`repos/${selectedRepo}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            console.log('[RepositoryConfig] Updated repos.json');
            setRepoData((prev) => (prev ? { ...prev, ...updates } : null));
            if (updates.exclude_paths) {
              onExcludePathsChange?.(updates.exclude_paths);
            }
          }
        }
      } catch (e) {
        console.error('Failed to update repos.json:', e);
      } finally {
        setSaving(false);
      }
    },
    [selectedRepo, api, saving, onExcludePathsChange]
  );

  // Debounced save handlers
  useEffect(() => {
    if (!repoData || loading) return;
    const timeoutId = setTimeout(() => {
      if (repoData.path !== repoPath) {
        saveRepoData({ path: repoPath });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [repoPath, repoData, loading, saveRepoData]);

  useEffect(() => {
    if (!repoData || loading) return;
    const timeoutId = setTimeout(() => {
      const keywordsArray = keywords.split(',').map(s => s.trim()).filter(Boolean);
      const currentKeywords = (repoData.keywords || []).sort().join(',');
      const newKeywords = keywordsArray.sort().join(',');
      if (currentKeywords !== newKeywords) {
        saveRepoData({ keywords: keywordsArray });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [keywords, repoData, loading, saveRepoData]);

  useEffect(() => {
    if (!repoData || loading) return;
    const timeoutId = setTimeout(() => {
      const pathBoostsArray = pathBoosts.split(',').map(s => s.trim()).filter(Boolean);
      const currentBoosts = (repoData.path_boosts || []).sort().join(',');
      const newBoosts = pathBoostsArray.sort().join(',');
      if (currentBoosts !== newBoosts) {
        saveRepoData({ path_boosts: pathBoostsArray });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [pathBoosts, repoData, loading, saveRepoData]);

  useEffect(() => {
    if (!repoData || loading) return;
    const timeoutId = setTimeout(() => {
      try {
        const parsed = JSON.parse(layerBonuses || '{}');
        if (typeof parsed === 'object' && parsed !== null) {
          const currentBonuses = JSON.stringify(repoData.layer_bonuses || {});
          const newBonuses = JSON.stringify(parsed);
          if (currentBonuses !== newBonuses) {
            saveRepoData({ layer_bonuses: parsed });
          }
        }
      } catch {
        // Invalid JSON, don't save yet
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [layerBonuses, repoData, loading, saveRepoData]);

  const handleAddExcludePath = () => {
    if (!excludePathInput.trim()) return;
    const newPaths = [...excludePaths, excludePathInput.trim()];
    setExcludePaths(newPaths);
    setExcludePathInput('');
    saveRepoData({ exclude_paths: newPaths });
  };

  const handleRemoveExcludePath = (path: string) => {
    const newPaths = excludePaths.filter(p => p !== path);
    setExcludePaths(newPaths);
    saveRepoData({ exclude_paths: newPaths });
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading repository configuration...
      </div>
    );
  }

  if (!selectedRepo || !repoData) {
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
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
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
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          list="keywords-list"
          placeholder="search or type to add"
        />
      </div>

      {/* Path Boosts */}
      <div className="input-group" style={{ marginBottom: '12px' }}>
        <label>Path Boosts (comma-separated)</label>
        <input
          type="text"
          value={pathBoosts}
          onChange={(e) => setPathBoosts(e.target.value)}
        />
      </div>

      {/* Layer Bonuses */}
      <div className="input-group">
        <label>Layer Bonuses (JSON)</label>
        <textarea
          value={layerBonuses}
          onChange={(e) => setLayerBonuses(e.target.value)}
          rows={3}
        />
      </div>

      {/* Keyword Manager */}
      {repoData && (
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
      )}

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

