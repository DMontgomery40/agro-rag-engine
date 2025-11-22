import { useState } from 'react';
import { ChatSubtabs } from '@/components/Chat/ChatSubtabs';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { ChatSettings } from '@/components/Chat/ChatSettings';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// React-native Chat tab with UI and Settings subtabs
export default function ChatTab() {
  const [activeSubtab, setActiveSubtab] = useState<'ui' | 'settings'>('ui');

  return (
    <div id="tab-chat" className="tab-content active">
      <ChatSubtabs activeSubtab={activeSubtab} onSubtabChange={(s) => setActiveSubtab(s as any)} />

      <div
        id="tab-chat-ui"
        className={`section-subtab ${activeSubtab === 'ui' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'ui' ? 'block' : 'none' }}
      >
        <div className="settings-section" style={{ borderLeft: '3px solid var(--link)', padding: 0 }}>
          <ErrorBoundary>
            <ChatInterface />
          </ErrorBoundary>
        </div>
      </div>

      {activeSubtab === 'settings' && (
        <div
          id="tab-chat-settings"
          className={`section-subtab ${activeSubtab === 'settings' ? 'active' : ''}`}
        >
          <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)', marginTop: '16px' }}>
            <ErrorBoundary>
              <ChatSettings />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
