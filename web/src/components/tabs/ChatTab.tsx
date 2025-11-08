import { useState } from 'react';
import ChatInterface from '../Chat/ChatInterface';
import ChatSettings from '../Chat/ChatSettings';

/**
 * Chat tab with UI and Settings sub-tabs
 */
export default function ChatTab() {
  const [activeSubtab, setActiveSubtab] = useState<'ui' | 'settings'>('ui');

  return (
    <>
      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubtab('ui')}
          style={{
            background: activeSubtab === 'ui' ? 'var(--accent)' : 'var(--bg-elev2)',
            color: activeSubtab === 'ui' ? 'var(--accent-contrast)' : 'var(--fg)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveSubtab('settings')}
          style={{
            background: activeSubtab === 'settings' ? 'var(--accent)' : 'var(--bg-elev2)',
            color: activeSubtab === 'settings' ? 'var(--accent-contrast)' : 'var(--fg)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Settings
        </button>
      </div>

      {/* Chat UI */}
      {activeSubtab === 'ui' && (
        <div className="section-subtab active">
          <div
            className="settings-section"
            style={{ borderLeft: '3px solid var(--link)', padding: '0' }}
          >
            <ChatInterface onShowSettings={() => setActiveSubtab('settings')} />
          </div>
        </div>
      )}

      {/* Chat Settings */}
      {activeSubtab === 'settings' && (
        <div className="section-subtab active">
          <ChatSettings />
        </div>
      )}
    </>
  );
}
