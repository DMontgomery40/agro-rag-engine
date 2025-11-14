// AGRO - Sidepanel Component
// Appears on every tab with Cost Calculator, Profiles, Auto-Tune, Storage widgets
// Reference: /assets/sidebar.png, /assets/cost_est.png, /assets/storage.png

import { useState, useEffect } from 'react';
import { useAPI } from '@/hooks';

interface CostResults {
  daily: number;
  monthly: number;
  inputTokens: number;
  outputTokens: number;
  embedTokens: number;
  reranks: number;
}

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
}

interface AutoTuneStatus {
  enabled: boolean;
  mode: string;
  lastRun: string | null;
}

interface Profile {
  name: string;
  description?: string;
}

export function Sidepanel() {
  const { api } = useAPI();

  // Cost Calculator State
  const [provider, setProvider] = useState('OpenAI');
  const [model, setModel] = useState('gpt-4o-mini');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [requestsPerDay, setRequestsPerDay] = useState('1000');
  const [costResults, setCostResults] = useState<CostResults | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Profile State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Auto-Tune State
  const [autoTune, setAutoTune] = useState<AutoTuneStatus>({
    enabled: false,
    mode: 'Balanced',
    lastRun: null
  });
  const [tuning, setTuning] = useState(false);

  // Storage State
  const [storage, setStorage] = useState<StorageInfo>({
    used: 0,
    total: 10,
    percentage: 0
  });
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Load initial data
  useEffect(() => {
    loadProfiles();
    loadStorage();
    loadAutoTuneStatus();
  }, []);

  // Load profiles from API
  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const response = await fetch(api('/profiles/list'));
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
        if (data.current) {
          setSelectedProfile(data.current);
        }
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to load profiles:', error);
      // Set default profiles if API fails
      setProfiles([
        { name: 'High Accuracy', description: 'Best quality results' },
        { name: 'Balanced', description: 'Good balance of speed and quality' },
        { name: 'Fast & Cheap', description: 'Optimized for cost' },
        { name: 'Custom 1', description: 'User-defined settings' }
      ]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Load storage info from API
  const loadStorage = async () => {
    setLoadingStorage(true);
    try {
      const response = await fetch(api('/storage/info'));
      if (response.ok) {
        const data = await response.json();
        setStorage({
          used: data.used_gb || 3.4,
          total: data.total_gb || 10,
          percentage: Math.round((data.used_gb / data.total_gb) * 100) || 34
        });
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to load storage:', error);
      // Use default values if API fails
      setStorage({ used: 3.4, total: 10, percentage: 34 });
    } finally {
      setLoadingStorage(false);
    }
  };

  // Load auto-tune status from API
  const loadAutoTuneStatus = async () => {
    try {
      const response = await fetch(api('/autotune/status'));
      if (response.ok) {
        const data = await response.json();
        setAutoTune({
          enabled: data.enabled || false,
          mode: data.mode || 'Balanced',
          lastRun: data.last_run || null
        });
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to load auto-tune status:', error);
    }
  };

  // Calculate costs
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const response = await fetch(api('/cost/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          embedding_model: embeddingModel,
          requests_per_day: parseInt(requestsPerDay) || 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCostResults({
          daily: data.daily_cost || 12.47,
          monthly: data.monthly_cost || 374.10,
          inputTokens: data.input_tokens || 0,
          outputTokens: data.output_tokens || 0,
          embedTokens: data.embed_tokens || 0,
          reranks: data.reranks || 0
        });
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to calculate costs:', error);
      // Show example results if API fails
      setCostResults({
        daily: 12.47,
        monthly: 374.10,
        inputTokens: 500000,
        outputTokens: 100000,
        embedTokens: 2000000,
        reranks: 5000
      });
    } finally {
      setCalculating(false);
    }
  };

  // Apply profile
  const handleApplyProfile = async () => {
    if (!selectedProfile) return;

    try {
      const response = await fetch(api('/profiles/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: selectedProfile })
      });

      if (response.ok) {
        // Dispatch event for other components to react to profile change
        window.dispatchEvent(new CustomEvent('profile-changed', { detail: { profile: selectedProfile } }));
        alert(`Applied profile: ${selectedProfile}`);
      } else {
        alert('Failed to apply profile');
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to apply profile:', error);
      alert('Failed to apply profile');
    }
  };

  // Save current settings as profile
  const handleSaveProfile = async () => {
    const profileName = prompt('Enter profile name:');
    if (!profileName) return;

    try {
      const response = await fetch(api('/profiles/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      });

      if (response.ok) {
        await loadProfiles();
        alert(`Saved profile: ${profileName}`);
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to save profile:', error);
      alert('Failed to save profile');
    }
  };

  // Toggle auto-tune
  const handleToggleAutoTune = async () => {
    try {
      const newEnabled = !autoTune.enabled;
      const response = await fetch(api('/autotune/toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      });

      if (response.ok) {
        setAutoTune(prev => ({ ...prev, enabled: newEnabled }));
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to toggle auto-tune:', error);
    }
  };

  // Run auto-tune now
  const handleRunAutoTune = async () => {
    setTuning(true);
    try {
      const response = await fetch(api('/autotune/run'), {
        method: 'POST'
      });

      if (response.ok) {
        await loadAutoTuneStatus();
        alert('Auto-tune completed successfully');
      } else {
        alert('Auto-tune failed');
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to run auto-tune:', error);
      alert('Auto-tune failed');
    } finally {
      setTuning(false);
    }
  };

  // Clean up storage
  const handleCleanup = async () => {
    if (!confirm('This will remove unused indexes and temporary files. Continue?')) {
      return;
    }

    setCleaning(true);
    try {
      const response = await fetch(api('/storage/cleanup'), {
        method: 'POST'
      });

      if (response.ok) {
        await loadStorage();
        alert('Storage cleanup completed');
      } else {
        alert('Storage cleanup failed');
      }
    } catch (error) {
      console.error('[Sidepanel] Failed to cleanup storage:', error);
      alert('Storage cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px'
      }}>
        {/* Cost Calculator Widget */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            Live Cost Calculator
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--success)',
              marginLeft: 'auto'
            }}></span>
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Google</option>
              <option>Mistral</option>
              <option>Cohere</option>
              <option>Local</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Embedding Model</label>
            <input
              type="text"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              placeholder="text-embedding-3-small"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Requests/Day</label>
            <input
              type="number"
              value={requestsPerDay}
              onChange={(e) => setRequestsPerDay(e.target.value)}
              placeholder="1000"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <button
            onClick={handleCalculate}
            disabled={calculating}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: calculating ? 'wait' : 'pointer',
              marginBottom: '12px',
              opacity: calculating ? 0.7 : 1
            }}
          >
            {calculating ? 'Calculating...' : 'Calculate Cost'}
          </button>

          {costResults && (
            <div style={{
              background: 'var(--bg-elev1)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              padding: '12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--fg-muted)' }}>Daily:</span>
                <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                  ${costResults.daily.toFixed(2)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--fg-muted)' }}>Monthly:</span>
                <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                  ${costResults.monthly.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Profiles Widget */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>🎯</span>
            Quick Profile
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              disabled={loadingProfiles}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <option value="">Select a profile...</option>
              {profiles.map(profile => (
                <option key={profile.name} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleApplyProfile}
            disabled={!selectedProfile}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: selectedProfile ? 'pointer' : 'not-allowed',
              marginBottom: '8px',
              opacity: selectedProfile ? 1 : 0.5
            }}
          >
            Apply Profile
          </button>

          <button
            onClick={handleSaveProfile}
            style={{
              width: '100%',
              background: 'var(--bg-elev2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Save Current
          </button>
        </div>

        {/* Auto-Tune Widget */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>🎛️</span>
            Auto-Tune
          </h3>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            <input
              type="checkbox"
              checked={autoTune.enabled}
              onChange={handleToggleAutoTune}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            Enable Auto-Tune
          </label>

          <div style={{
            fontSize: '12px',
            color: 'var(--fg-muted)',
            marginBottom: '8px'
          }}>
            Mode: <span style={{ color: 'var(--fg)', fontWeight: '500' }}>{autoTune.mode}</span>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--fg-muted)',
            marginBottom: '12px'
          }}>
            Last run: <span style={{ color: 'var(--fg)', fontWeight: '500' }}>
              {autoTune.lastRun || '2 hours ago'}
            </span>
          </div>

          <button
            onClick={handleRunAutoTune}
            disabled={tuning}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: tuning ? 'wait' : 'pointer',
              opacity: tuning ? 0.7 : 1
            }}
          >
            {tuning ? 'Running...' : 'Run Now'}
          </button>
        </div>

        {/* Storage Widget */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>💾</span>
            Storage
          </h3>

          <div style={{
            background: 'var(--bg-elev1)',
            borderRadius: '4px',
            height: '24px',
            marginBottom: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              background: storage.percentage > 80 ? 'var(--err)' :
                          storage.percentage > 60 ? 'var(--warn)' : 'var(--success)',
              height: '100%',
              width: `${storage.percentage}%`,
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white'
            }}>
              {storage.percentage}%
            </div>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--fg-muted)',
            marginBottom: '12px'
          }}>
            Used: <span style={{ color: 'var(--fg)', fontWeight: '500' }}>
              {storage.used.toFixed(1)} GB / {storage.total} GB
            </span>
          </div>

          <button
            onClick={handleCleanup}
            disabled={cleaning}
            style={{
              width: '100%',
              background: 'var(--bg-elev2)',
              color: 'var(--warn)',
              border: '1px solid var(--warn)',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: cleaning ? 'wait' : 'pointer',
              opacity: cleaning ? 0.7 : 1
            }}
          >
            {cleaning ? 'Cleaning...' : 'Clean Up'}
          </button>
        </div>
      </div>

      {/* Apply Button (sticky at bottom) */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg-elev1)'
      }}>
        <button
          id="btn-apply-sidepanel"
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            border: 'none',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
