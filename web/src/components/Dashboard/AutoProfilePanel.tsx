// AGRO - Auto-Profile Panel Component
// Wizard for automatic RAG configuration based on user's use case

import React, { useState } from 'react';

export function AutoProfilePanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOneClick = async () => {
    try {
      const response = await fetch('/api/profile/autoselect', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`Auto-selected profile: ${data.profile}\n\nClick "Apply All Changes" to activate.`);
      }
    } catch (e) {
      console.error('[AutoProfile] Failed:', e);
      alert('Failed to auto-select profile');
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--accent)',
          borderRadius: '8px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="accent-blue">●</span> Auto-Profile
            </h3>
            <p className="small" style={{ margin: 0, color: 'var(--fg-muted)' }}>
              This early platform shows you can mix any provider, model, and database. We analyze your hardware and budget to configure the optimal RAG automatically.
            </p>
          </div>
        </div>

        <button
          id="btn-wizard-oneclick"
          onClick={handleOneClick}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 136, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🚀 CONFIGURE AUTOMATICALLY
        </button>

        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--fg-muted)', textAlign: 'center' }}>
          Or customize settings manually in each tab
        </div>
      </div>
    </div>
  );
}

