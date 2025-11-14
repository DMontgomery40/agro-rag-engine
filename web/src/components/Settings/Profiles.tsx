import { useState, useEffect } from 'react';

interface Profile {
  name: string;
  description: string;
  model: string;
  temperature: number;
  topK: number;
  reranker: string;
  estimatedCost: string;
  isDefault: boolean;
}

export function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || defaultProfiles);
        setSelectedProfile(data.active_profile || 'balanced');
      } else {
        setProfiles(defaultProfiles);
        setSelectedProfile('balanced');
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      setProfiles(defaultProfiles);
      setSelectedProfile('balanced');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProfile = async () => {
    if (!selectedProfile) return;

    setSaving(true);
    try {
      const response = await fetch('/api/profiles/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: selectedProfile }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply profile');
      }

      alert('Profile applied successfully');
    } catch (error) {
      alert(`Failed to apply profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNewProfile = async () => {
    const profileName = prompt('Enter a name for the new profile:');
    if (!profileName) return;

    if (profiles.some(p => p.name.toLowerCase() === profileName.toLowerCase())) {
      alert('A profile with this name already exists');
      return;
    }

    try {
      const response = await fetch('/api/profiles/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      alert('Profile saved successfully');
      await loadProfiles();
    } catch (error) {
      alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    const profile = profiles.find(p => p.name === selectedProfile);
    if (profile?.isDefault) {
      alert('Cannot delete default profiles');
      return;
    }

    if (!confirm(`Are you sure you want to delete the profile "${selectedProfile}"?`)) return;

    try {
      const response = await fetch('/api/profiles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: selectedProfile }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      alert('Profile deleted successfully');
      await loadProfiles();
    } catch (error) {
      alert(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportProfile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const profileData = JSON.parse(text);

        const response = await fetch('/api/profiles/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });

        if (!response.ok) {
          throw new Error('Failed to import profile');
        }

        alert('Profile imported successfully');
        await loadProfiles();
      } catch (error) {
        alert(`Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const handleExportProfile = () => {
    if (!selectedProfile) return;

    const profile = profiles.find(p => p.name === selectedProfile);
    if (!profile) return;

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-${selectedProfile}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedProfileData = profiles.find(p => p.name === selectedProfile);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--fg)' }}>
          Configuration Profiles
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
          Save and load configuration profiles
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '24px' }}>
        {/* Profile Selection */}
        <div>
          <div
            style={{
              background: 'var(--bg-elev1)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
              Profiles
            </h3>

            {loading ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '13px' }}>
                Loading profiles...
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {profiles.map(profile => (
                  <label
                    key={profile.name}
                    style={{
                      display: 'flex',
                      alignItems: 'start',
                      padding: '12px',
                      background: selectedProfile === profile.name ? 'var(--bg-elev2)' : 'transparent',
                      border: `1px solid ${selectedProfile === profile.name ? 'var(--accent)' : 'var(--line)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={profile.name}
                      checked={selectedProfile === profile.name}
                      onChange={(e) => setSelectedProfile(e.target.value)}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>
                        {profile.name}
                        {profile.isDefault && (
                          <span style={{ fontSize: '10px', color: 'var(--fg-muted)', marginLeft: '8px' }}>
                            (default)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                        {profile.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '4px' }}>
                        Est. Cost: {profile.estimatedCost}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              onClick={handleApplyProfile}
              disabled={!selectedProfile || saving}
              style={{
                background: !selectedProfile || saving ? 'var(--bg-elev2)' : 'var(--accent)',
                color: !selectedProfile || saving ? 'var(--fg-muted)' : 'var(--accent-contrast)',
                border: 'none',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !selectedProfile || saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Applying...' : 'Apply Profile'}
            </button>

            <button
              onClick={handleSaveAsNewProfile}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Save Current as New Profile
            </button>

            <button
              onClick={handleDeleteProfile}
              disabled={!selectedProfile || selectedProfileData?.isDefault}
              style={{
                background: !selectedProfile || selectedProfileData?.isDefault ? 'var(--bg-elev2)' : '#ef4444',
                color: !selectedProfile || selectedProfileData?.isDefault ? 'var(--fg-muted)' : '#fff',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: !selectedProfile || selectedProfileData?.isDefault ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Delete Profile
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={handleImportProfile}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Import Profile
              </button>
              <button
                onClick={handleExportProfile}
                disabled={!selectedProfile}
                style={{
                  background: !selectedProfile ? 'var(--bg-elev2)' : 'var(--bg-elev2)',
                  color: !selectedProfile ? 'var(--fg-muted)' : 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: !selectedProfile ? 'not-allowed' : 'pointer',
                }}
              >
                Export Profile
              </button>
            </div>
          </div>
        </div>

        {/* Profile Comparison */}
        <div
          style={{
            background: 'var(--bg-elev1)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
            Profile Comparison
          </h3>

          {selectedProfile ? (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--fg)' }}>
                  {selectedProfileData?.name}
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '16px' }}>
                  {selectedProfileData?.description}
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                      MODEL
                    </div>
                    <div
                      style={{
                        background: 'var(--bg-elev2)',
                        border: '1px solid var(--line)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--fg)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedProfileData?.model}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                        TEMPERATURE
                      </div>
                      <div
                        style={{
                          background: 'var(--bg-elev2)',
                          border: '1px solid var(--line)',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: 'var(--fg)',
                        }}
                      >
                        {selectedProfileData?.temperature}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                        TOP-K
                      </div>
                      <div
                        style={{
                          background: 'var(--bg-elev2)',
                          border: '1px solid var(--line)',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: 'var(--fg)',
                        }}
                      >
                        {selectedProfileData?.topK}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                      RERANKER
                    </div>
                    <div
                      style={{
                        background: 'var(--bg-elev2)',
                        border: '1px solid var(--line)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--fg)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedProfileData?.reranker}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
                      ESTIMATED COST / 1K QUERIES
                    </div>
                    <div
                      style={{
                        background: 'var(--bg-elev2)',
                        border: '1px solid var(--line)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      {selectedProfileData?.estimatedCost}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--fg)' }}>
                  All Profiles Comparison
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)' }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--fg-muted)' }}>Profile</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--fg-muted)' }}>Model</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--fg-muted)' }}>Temp</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--fg-muted)' }}>Top-K</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--fg-muted)' }}>Reranker</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: 'var(--fg-muted)' }}>Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(profile => (
                        <tr
                          key={profile.name}
                          style={{
                            borderBottom: '1px solid var(--line)',
                            background: profile.name === selectedProfile ? 'var(--bg-elev2)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '8px', color: 'var(--fg)', fontWeight: profile.name === selectedProfile ? 600 : 400 }}>
                            {profile.name}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--fg)', fontFamily: 'monospace', fontSize: '11px' }}>
                            {profile.model}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--fg)', textAlign: 'center' }}>
                            {profile.temperature}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--fg)', textAlign: 'center' }}>
                            {profile.topK}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--fg)', fontFamily: 'monospace', fontSize: '11px' }}>
                            {profile.reranker}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent)', textAlign: 'right', fontWeight: 500 }}>
                            {profile.estimatedCost}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--fg-muted)', fontSize: '13px', textAlign: 'center', padding: '60px 20px' }}>
              Select a profile to view details and comparison
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Default profiles
const defaultProfiles: Profile[] = [
  {
    name: 'high-accuracy',
    description: 'High Accuracy (expensive, slow)',
    model: 'gpt-4-turbo',
    temperature: 0.2,
    topK: 10,
    reranker: 'cohere-rerank-v3',
    estimatedCost: '$15.00',
    isDefault: true,
  },
  {
    name: 'balanced',
    description: 'Balanced (moderate cost/speed)',
    model: 'gpt-3.5-turbo',
    temperature: 0.5,
    topK: 5,
    reranker: 'cohere-rerank-v2',
    estimatedCost: '$3.50',
    isDefault: true,
  },
  {
    name: 'fast-cheap',
    description: 'Fast & Cheap (low cost, fast)',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    topK: 3,
    reranker: 'none',
    estimatedCost: '$1.20',
    isDefault: true,
  },
];
