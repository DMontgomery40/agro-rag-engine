import { useState, useEffect } from 'react';
import { ProfileManager } from './ProfileManager';
import { ProfileEditor } from './ProfileEditor';
import { useProfiles } from '../../hooks/useProfiles';
import { useGlobalState } from '../../hooks/useGlobalState';
import type { ProfileConfig, AutoProfilePayload } from '../../types';
import { useAlertThresholdsStore, useAlertThresholdField } from '@/stores/useAlertThresholdsStore';

/**
 * ProfilesTab Component
 * Main tab for profile management with budget alerts, auto-profile v2, and manual profile operations
 * Converts ProfilesTab.jsx and integrates autoprofile_v2.js functionality
 */
export default function ProfilesTab() {
  const { state: globalState } = useGlobalState();
  const {
    generateAutoProfile,
    hwScan,
    scanHardware,
    currentConfig,
    autoProfileResult,
    isLoading
  } = useProfiles();

  const [selectedConfig, setSelectedConfig] = useState<ProfileConfig | null>(null);
  const [autoProfilePhase, setAutoProfilePhase] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeSubtab, setActiveSubtab] = useState('budget');

  // Alert thresholds (shared store)
  const loadAlertThresholds = useAlertThresholdsStore((state) => state.load);
  const thresholdsLoaded = useAlertThresholdsStore((state) => state.loaded);
  const thresholdsLoading = useAlertThresholdsStore((state) => state.loading && !state.loaded);
  const saveAlertThresholds = useAlertThresholdsStore((state) => state.save);
  const [costBurnSpike, setCostBurnSpike] = useAlertThresholdField('cost_burn_spike_usd_per_hour');
  const [tokenBurnSpike, setTokenBurnSpike] = useAlertThresholdField('token_burn_spike_per_minute');
  const [tokenBurnSustained, setTokenBurnSustained] = useAlertThresholdField('token_burn_sustained_per_minute');
  const [monthlyBudget, setMonthlyBudget] = useAlertThresholdField('monthly_budget_usd');
  const [budgetWarning, setBudgetWarning] = useAlertThresholdField('budget_warning_usd');
  const [budgetCritical, setBudgetCritical] = useAlertThresholdField('budget_critical_usd');

  useEffect(() => {
    if (!thresholdsLoaded) {
      loadAlertThresholds();
    }
  }, [thresholdsLoaded, loadAlertThresholds]);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleProfileSelect = (name: string, config: ProfileConfig) => {
    setSelectedConfig(config);
  };

  const handleGenerateAutoProfile = async () => {
    try {
      setIsGenerating(true);
      setAutoProfilePhase('Initializing...');

      // Ensure hardware scan exists
      let scan = hwScan;
      if (!scan) {
        setAutoProfilePhase('Scanning hardware...');
        scan = await scanHardware();
      }

      // Get budget from form
      const budgetInput = document.getElementById('budget') as HTMLInputElement;
      const budget = parseFloat(budgetInput?.value || '0');

      // Get advanced settings
      const mode = (document.getElementById('apv2-mode') as HTMLSelectElement)?.value || 'balanced';
      const budgetOverride = parseFloat((document.getElementById('apv2-budget') as HTMLInputElement)?.value || '');

      // Get provider checkboxes
      const provCheckboxes = Array.from(document.querySelectorAll('.apv2-prov:checked')) as HTMLInputElement[];
      const providers = provCheckboxes.map(cb => cb.value);

      // Build payload
      const payload: AutoProfilePayload = {
        hardware: {
          runtimes: scan?.runtimes || {},
          meta: scan?.info || {}
        },
        policy: {
          providers_allowed: providers.length > 0 ? providers : undefined
        },
        workload: {},
        objective: {
          mode,
          monthly_budget_usd: isNaN(budgetOverride) ? budget : budgetOverride
        },
        tuning: {
          use_heuristic_quality: (document.getElementById('apv2-heuristics') as HTMLInputElement)?.checked || false
        },
        defaults: {
          gen_model: globalState.config?.env?.GEN_MODEL || ''
        }
      };

      setAutoProfilePhase('Generating profile...');
      const result = await generateAutoProfile(payload, setAutoProfilePhase);

      setSelectedConfig(result.env);
      showStatus('Auto-profile generated successfully', 'success');
    } catch (e) {
      showStatus(`Failed to generate profile: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsGenerating(false);
      setAutoProfilePhase('');
    }
  };

  const handleSaveAlertThresholds = async () => {
    try {
      showStatus('Saving alert thresholds...', 'success');
      const { updated } = await saveAlertThresholds([
        'cost_burn_spike_usd_per_hour',
        'token_burn_spike_per_minute',
        'token_burn_sustained_per_minute',
        'monthly_budget_usd',
        'budget_warning_usd',
        'budget_critical_usd'
      ]);
      const suffix = updated === 1 ? 'threshold' : 'thresholds';
      showStatus(`Alert thresholds saved (${updated} ${suffix} updated)`, 'success');
    } catch (e) {
      showStatus(`Failed to save thresholds: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  return (
    <div className="profiles-tab">
      {/* Subtab Navigation */}
      <div className="subtab-nav">
        <button
          className={activeSubtab === 'budget' ? 'subtab-btn active' : 'subtab-btn'}
          onClick={() => setActiveSubtab('budget')}
        >
          Budget Calculator
        </button>
        <button
          className={activeSubtab === 'management' ? 'subtab-btn active' : 'subtab-btn'}
          onClick={() => setActiveSubtab('management')}
        >
          Profile Management
        </button>
        <button
          className={activeSubtab === 'overrides' ? 'subtab-btn active' : 'subtab-btn'}
          onClick={() => setActiveSubtab('overrides')}
        >
          Channel Overrides
        </button>
      </div>

      {/* Budget Tab */}
      <div id="tab-profiles-budget" className={activeSubtab === 'budget' ? 'section-subtab active' : 'section-subtab'} style={{display: activeSubtab === 'budget' ? 'block' : 'none'}}>
        {statusMessage && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: statusMessage.type === 'success' ? 'var(--accent-bg)' : 'var(--err-bg)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--accent)' : 'var(--err)'}`,
            borderRadius: '6px',
            color: statusMessage.type === 'success' ? 'var(--accent)' : 'var(--err)',
            fontSize: '13px'
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Cost & Token Burn Alerts */}
        <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
          <h3>⚠️ Cost & Token Burn Alerts</h3>
          <p className="small">
            Set thresholds to receive alerts when costs or token consumption spike or sustain high rates.
          </p>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="alert_cost_burn_spike_usd_per_hour">Cost Spike Alert (USD/hour)</label>
              <input
                type="number"
                id="alert_cost_burn_spike_usd_per_hour"
                min="0.01"
                max="100"
                step="0.01"
                placeholder="0.10"
                value={costBurnSpike}
                disabled={thresholdsLoading}
                onChange={(e) => setCostBurnSpike(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Alert when hourly burn exceeds this amount
              </p>
            </div>
            <div className="input-group">
              <label htmlFor="alert_token_burn_spike_per_minute">Token Spike (tokens/min)</label>
              <input
                type="number"
                id="alert_token_burn_spike_per_minute"
                min="100"
                max="100000"
                step="100"
                placeholder="5000"
                value={tokenBurnSpike}
                disabled={thresholdsLoading}
                onChange={(e) => setTokenBurnSpike(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Alert on sudden spike above this rate
              </p>
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="alert_token_burn_sustained_per_minute">Token Burn Sustained (tokens/min)</label>
              <input
                type="number"
                id="alert_token_burn_sustained_per_minute"
                min="100"
                max="100000"
                step="100"
                placeholder="2000"
                value={tokenBurnSustained}
                disabled={thresholdsLoading}
                onChange={(e) => setTokenBurnSustained(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Alert if sustained for 15+ minutes
              </p>
            </div>
          </div>
        </div>

        {/* Budget Alerts */}
        <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>💰 Budget Alerts</h3>
          <p className="small">Set monthly budget limits and warning thresholds.</p>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="alert_monthly_budget_usd">Monthly Budget (USD)</label>
              <input
                type="number"
                id="alert_monthly_budget_usd"
                min="1"
                max="10000"
                step="1"
                placeholder="500"
                value={monthlyBudget}
                disabled={thresholdsLoading}
                onChange={(e) => setMonthlyBudget(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Hard limit for monthly spending
              </p>
            </div>
            <div className="input-group">
              <label htmlFor="alert_budget_warning_usd">Budget Warning Level (USD)</label>
              <input
                type="number"
                id="alert_budget_warning_usd"
                min="1"
                max="10000"
                step="1"
                placeholder="400"
                value={budgetWarning}
                disabled={thresholdsLoading}
                onChange={(e) => setBudgetWarning(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Alert when spending exceeds this
              </p>
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="alert_budget_critical_usd">Budget Critical Level (USD)</label>
              <input
                type="number"
                id="alert_budget_critical_usd"
                min="1"
                max="10000"
                step="1"
                placeholder="450"
                value={budgetCritical}
                disabled={thresholdsLoading}
                onChange={(e) => setBudgetCritical(e.target.value)}
              />
              <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
                Critical alert when spending exceeds this
              </p>
            </div>
          </div>
        </div>

        {/* Storage Calculator Placeholder */}
        <div id="storage-calculator-container"></div>
      </div>

      {/* Management Tab */}
      <div id="tab-profiles-management" className={activeSubtab === 'management' ? 'section-subtab active' : 'section-subtab'} style={{display: activeSubtab === 'management' ? 'block' : 'none'}}>
        {/* Profile Manager */}
        <ProfileManager onProfileSelect={handleProfileSelect} />

        {/* Auto-Profile v2 Generator */}
        <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>🤖 Auto-Profile Generator v2</h3>
          <p className="small">
            Automatically generate an optimized profile based on your hardware, budget, and workload requirements.
          </p>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="budget">Monthly Budget (USD)</label>
              <input
                type="number"
                id="budget"
                min="0"
                max="10000"
                step="1"
                placeholder="50"
                defaultValue="50"
              />
            </div>
            <div className="input-group">
              <label htmlFor="apv2-mode">Optimization Mode</label>
              <select id="apv2-mode" defaultValue="balanced">
                <option value="cost">Cost Optimized</option>
                <option value="balanced">Balanced</option>
                <option value="quality">Quality Optimized</option>
              </select>
            </div>
          </div>

          <div className="input-row">
            <button
              className="small-button"
              onClick={handleGenerateAutoProfile}
              disabled={isGenerating}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                fontWeight: 700,
                padding: '14px'
              }}
            >
              {isGenerating ? `⏳ ${autoProfilePhase}` : '✨ Generate Auto-Profile'}
            </button>
          </div>

          {autoProfileResult && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px'
            }}>
              <p className="small" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '8px' }}>
                ✓ Profile Generated
              </p>
              <p className="small" style={{ color: 'var(--fg-muted)', margin: 0 }}>
                Review the configuration below and save it as a profile for future use.
              </p>
            </div>
          )}
        </div>

        {/* Profile Editor */}
        {(selectedConfig || currentConfig) && (
          <ProfileEditor config={selectedConfig || currentConfig || undefined} />
        )}

        {/* Save Alert Thresholds */}
        <div className="settings-section">
          <div className="input-row">
            <button
              className="small-button"
              id="btn-save-alert-thresholds"
              onClick={handleSaveAlertThresholds}
              disabled={thresholdsLoading}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                fontWeight: 600,
                width: '100%'
              }}
            >
              💾 Save Alert Thresholds
            </button>
          </div>
          <div id="alert-save-status" style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '8px' }}></div>
        </div>
      </div>

      {/* Overrides Tab */}
      <div id="tab-profiles-overrides" className={activeSubtab === 'overrides' ? 'section-subtab active' : 'section-subtab'} style={{display: activeSubtab === 'overrides' ? 'block' : 'none'}}>
        <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>Channel Overrides</h3>
          <p className="small">
            HTTP, MCP, and CLI model overrides live under Admin → Integrations. Use the button below to jump there.
          </p>
          <button
            className="small-button"
            id="btn-open-admin-integrations"
            onClick={() => {
              // Navigate to admin/integrations tab
              const event = new CustomEvent('agro-navigate', { detail: { tab: 'admin', subtab: 'integrations' } });
              window.dispatchEvent(event);
            }}
            style={{
              background: 'var(--link)',
              color: 'var(--accent-contrast)',
              fontWeight: 600
            }}
          >
            Open Admin → Integrations
          </button>
        </div>
      </div>
    </div>
  );
}
