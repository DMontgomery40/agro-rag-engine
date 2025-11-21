import { useState } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import type { ProfileConfig } from '../../types';

interface ProfileManagerProps {
  onProfileSelect?: (name: string, config: ProfileConfig) => void;
}

/**
 * ProfileManager Component
 * Displays list of profiles with load/delete/apply operations
 * Converts profile management UI from legacy modules
 */
export function ProfileManager({ onProfileSelect }: ProfileManagerProps) {
  const {
    profiles,
    activeProfile,
    isLoading,
    error,
    loadProfile,
    loadAndApply,
    clearError
  } = useProfiles();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleLoadProfile = async () => {
    if (!selectedProfile) {
      showStatus('Please select a profile', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const config = await loadProfile(selectedProfile);
      showStatus(`Profile "${selectedProfile}" loaded successfully`, 'success');
      onProfileSelect?.(selectedProfile, config);
    } catch (e) {
      showStatus(`Failed to load profile: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyProfile = async () => {
    if (!selectedProfile) {
      showStatus('Please select a profile', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await loadAndApply(selectedProfile);
      showStatus(`Profile "${selectedProfile}" applied successfully`, 'success');
    } catch (e) {
      showStatus(`Failed to apply profile: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfile(e.target.value);
    clearError();
  };

  return (
    <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
      <h3>💾 Configuration Profiles</h3>
      <p className="small">
        Save and load configuration profiles. Profiles store your model, retrieval, and infrastructure settings
        for quick switching between different use cases.
      </p>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: 'var(--err-bg)',
          border: '1px solid var(--err)',
          borderRadius: '6px',
          color: 'var(--err)',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

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

      <div className="input-row">
        <div className="input-group" style={{ flex: 1 }}>
          <label htmlFor="profile-select">Select Profile</label>
          <select
            id="profile-select"
            value={selectedProfile}
            onChange={handleProfileChange}
            disabled={isLoading || actionLoading}
            style={{ width: '100%' }}
          >
            <option value="">-- Choose a profile --</option>
            {profiles.map(name => (
              <option key={name} value={name}>
                {name}
                {activeProfile === name ? ' (active)' : ''}
              </option>
            ))}
          </select>
          {profiles.length === 0 && !isLoading && (
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              No saved profiles found. Save your current configuration to create one.
            </p>
          )}
        </div>
      </div>

      <div className="input-row" style={{ gap: '12px' }}>
        <button
          className="small-button"
          onClick={handleLoadProfile}
          disabled={!selectedProfile || isLoading || actionLoading}
          style={{
            flex: 1,
            background: 'var(--link)',
            color: 'var(--accent-contrast)',
            fontWeight: 600
          }}
        >
          {actionLoading ? '⏳ Loading...' : '📂 Load Profile'}
        </button>

        <button
          className="small-button"
          onClick={handleApplyProfile}
          disabled={!selectedProfile || isLoading || actionLoading}
          style={{
            flex: 1,
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: 600
          }}
        >
          {actionLoading ? '⏳ Applying...' : '✓ Apply Profile'}
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        padding: '10px',
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px'
      }}>
        <p className="small" style={{ color: 'var(--fg-muted)', margin: 0 }}>
          <strong>Load</strong> previews the profile settings without applying them.
          <br />
          <strong>Apply</strong> immediately activates the profile and updates your configuration.
        </p>
      </div>
    </div>
  );
}
