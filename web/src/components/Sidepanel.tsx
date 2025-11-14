import { useState, useEffect } from 'react';
import { useConfigStore } from '@/stores';

export function Sidepanel() {
  const { config } = useConfigStore();

  // Live Cost Calculator state
  const [costProvider, setCostProvider] = useState('OpenAI');
  const [costModel, setCostModel] = useState('gpt-4o-mini');
  const [costEmbeddingModel, setCostEmbeddingModel] = useState('text-embedding-3-small');
  const [costRequestsPerDay, setCostRequestsPerDay] = useState(100);
  const [dailyCost, setDailyCost] = useState('--');
  const [monthlyCost, setMonthlyCost] = useState('--');

  // Quick Profile state
  const [selectedProfile, setSelectedProfile] = useState('High Accuracy');

  // Auto-Tune state
  const [autoTuneEnabled, setAutoTuneEnabled] = useState(false);
  const [autoTuneMode, setAutoTuneMode] = useState('--');
  const [autoTuneLastRun, setAutoTuneLastRun] = useState('10/15/2025, 2:13:31 AM');

  // Storage state
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(100);
  const [storagePercent, setStoragePercent] = useState(0);

  useEffect(() => {
    setStoragePercent(storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0);
  }, [storageUsed, storageTotal]);

  const handleCalculateCost = () => {
    console.log('Calculate Cost clicked', {
      provider: costProvider,
      model: costModel,
      embeddingModel: costEmbeddingModel,
      requestsPerDay: costRequestsPerDay,
    });
    // TODO: Wire to backend cost calculation API
    setDailyCost('$2.50');
    setMonthlyCost('$75.00');
  };

  const handleApplyProfile = () => {
    console.log('Apply Profile clicked', { profile: selectedProfile });
    // TODO: Wire to backend profile API
  };

  const handleSaveProfile = () => {
    console.log('Save Current Profile clicked');
    // TODO: Wire to backend save profile API
  };

  const handleAutoTuneToggle = () => {
    const newValue = !autoTuneEnabled;
    setAutoTuneEnabled(newValue);
    console.log('Auto-Tune toggled', { enabled: newValue });
    // TODO: Wire to backend auto-tune toggle API
  };

  const handleAutoTuneRunNow = () => {
    console.log('Auto-Tune Run Now clicked');
    // TODO: Wire to backend auto-tune run API
  };

  const handleRefreshStatus = () => {
    console.log('Refresh Auto-Tune Status clicked');
    // TODO: Wire to backend status refresh API
  };

  const handleCleanUpStorage = () => {
    console.log('Clean Up Storage clicked');
    // TODO: Wire to backend cleanup API
  };

  const handleApplyChanges = () => {
    console.log('Apply Changes clicked');
    // TODO: Wire to backend apply changes API
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Live Cost Calculator Widget */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '8px' }}>●</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
            Live Cost Calculator
          </span>
          <span
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontSize: '9px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: 'auto',
            }}
          >
            LIVE
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '4px',
              }}
            >
              INFERENCE PROVIDER
            </label>
            <select
              value={costProvider}
              onChange={(e) => setCostProvider(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '6px 8px',
                borderRadius: '4px',
              }}
            >
              <option value="OpenAI">openai</option>
              <option value="Anthropic">Anthropic</option>
              <option value="Google">Google</option>
              <option value="Mistral">Mistral</option>
              <option value="Cohere">Cohere</option>
              <option value="Local">Local</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '4px',
              }}
            >
              INFERENCE MODEL
            </label>
            <input
              type="text"
              value={costModel}
              onChange={(e) => setCostModel(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '6px 8px',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                EMBEDDINGS PROVIDER
              </label>
              <select
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              >
                <option>OpenAI</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                EMBEDDING MODEL
              </label>
              <input
                type="text"
                value={costEmbeddingModel}
                onChange={(e) => setCostEmbeddingModel(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                RERANKER
              </label>
              <select
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              >
                <option>Cohere</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                RERANK MODEL
              </label>
              <input
                type="text"
                defaultValue="rerank-english-v3.0"
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                TOKENS IN
              </label>
              <input
                type="number"
                defaultValue={5000}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                TOKENS OUT
              </label>
              <input
                type="number"
                defaultValue={800}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                EMBEDS
              </label>
              <input
                type="number"
                defaultValue={4}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                RERANKS
              </label>
              <input
                type="number"
                defaultValue={3}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '4px',
              }}
            >
              REQUESTS / DAY
            </label>
            <input
              type="number"
              value={costRequestsPerDay}
              onChange={(e) => setCostRequestsPerDay(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '6px 8px',
                borderRadius: '4px',
              }}
            />
          </div>

          <button
            onClick={handleCalculateCost}
            style={{
              width: '100%',
              background: 'var(--link)',
              color: 'white',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            CALCULATE COST
          </button>

          <button
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ADD MODEL
          </button>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                DAILY
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--fg)',
                }}
              >
                {dailyCost}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-muted)',
                  marginBottom: '4px',
                }}
              >
                MONTHLY
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--fg)',
                }}
              >
                {monthlyCost}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Profiles Widget */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '8px' }}>●</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
            Profiles
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '4px',
              }}
            >
              SAVE CURRENT AS
            </label>
            <input
              type="text"
              placeholder="my-config"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '6px 8px',
                borderRadius: '4px',
              }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            SAVE PROFILE
          </button>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '4px',
              }}
            >
              SAVED PROFILES
            </label>
            <div
              style={{
                background: 'var(--bg-elev1)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              {['defaults', 'min_local', 'onboard-wizard-test-project', 'pw-test'].map((profile) => (
                <div
                  key={profile}
                  style={{
                    fontSize: '12px',
                    color: 'var(--fg)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    background:
                      selectedProfile === profile ? 'var(--accent)' : 'transparent',
                  }}
                  onClick={() => setSelectedProfile(profile)}
                >
                  {profile}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Tune Widget */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '8px' }}>●</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
            Auto-Tune
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoTuneEnabled}
              onChange={handleAutoTuneToggle}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--fg)' }}>ENABLE AUTO-TUNE</span>
          </label>

          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '2px',
              }}
            >
              Current Mode
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--fg)',
              }}
            >
              {autoTuneMode}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--fg-muted)',
                marginBottom: '2px',
              }}
            >
              LAST INDEXED
            </div>
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--ok)',
              }}
            >
              {autoTuneLastRun}
            </div>
          </div>

          <button
            onClick={handleAutoTuneRunNow}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            REFRESH STATUS
          </button>
        </div>
      </div>

      {/* Storage Widget */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '8px' }}>●</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
            Secrets Ingest
          </span>
        </div>

        <div
          style={{
            border: '2px dashed var(--line)',
            borderRadius: '6px',
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontSize: '12px',
            marginBottom: '8px',
          }}
        >
          Drop any .env / .ini / .md
          <br />
          or click to upload
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            defaultChecked
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--fg)' }}>Persist to defaults.json</span>
        </label>
      </div>

      {/* Apply Changes Button - Always at bottom */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '16px',
        }}
      >
        <button
          onClick={handleApplyChanges}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            border: 'none',
            padding: '14px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
