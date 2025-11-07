import { useState } from 'react';
import { useVSCodeEmbed } from '@/hooks/useVSCodeEmbed';

/**
 * Embedded VS Code editor panel component
 */
export default function EditorPanel() {
  const {
    isHealthy,
    isEnabled,
    iframeUrl,
    statusMessage,
    statusColor,
    openInWindow,
    copyUrl,
    restart
  } = useVSCodeEmbed();

  const [copyButtonText, setCopyButtonText] = useState('📋 Copy URL');
  const [isRestarting, setIsRestarting] = useState(false);

  const handleCopyUrl = async () => {
    const success = await copyUrl();
    if (success) {
      setCopyButtonText('✓ Copied!');
      setTimeout(() => {
        setCopyButtonText('📋 Copy URL');
      }, 2000);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await restart();
    } finally {
      setTimeout(() => {
        setIsRestarting(false);
      }, 1000);
    }
  };

  const getBadgeStyle = () => {
    return {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      background: statusColor,
      color: isHealthy ? 'var(--accent-contrast)' : 'var(--fg)'
    };
  };

  const getStatusIcon = () => {
    if (isHealthy) return '●';
    if (!isEnabled) return '○';
    return '●';
  };

  const getBannerMessage = () => {
    if (!isEnabled) {
      return 'Editor is disabled. Enable it in the Misc tab and restart.';
    }
    return `${statusMessage}. Retrying...`;
  };

  return (
    <div className="settings-section">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Embedded Code Editor</h3>
          <div style={getBadgeStyle()}>
            <span>{getStatusIcon()} {statusMessage}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={openInWindow}
            className="small-button"
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--link)',
              border: '1px solid var(--link)'
            }}
          >
            🗗 Open in Window
          </button>
          <button
            onClick={handleCopyUrl}
            className="small-button"
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)'
            }}
          >
            {copyButtonText}
          </button>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="small-button"
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--warn)',
              border: '1px solid var(--warn)',
              cursor: isRestarting ? 'not-allowed' : 'pointer',
              opacity: isRestarting ? 0.6 : 1
            }}
          >
            {isRestarting ? '⏳ Restarting...' : '↻ Restart'}
          </button>
        </div>
      </div>

      {/* Status Banner (shown when editor is not healthy) */}
      {!isHealthy && (
        <div
          style={{
            display: 'block',
            background: 'var(--bg-elev2)',
            border: '1px solid var(--warn)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Editor Unavailable</div>
              <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                {getBannerMessage()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Iframe */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 200px)',
          minHeight: '600px',
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          overflow: 'hidden',
          display: isHealthy && iframeUrl ? 'block' : 'none'
        }}
      >
        <iframe
          src={iframeUrl || 'about:blank'}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
          title="VS Code Editor"
        />
      </div>

      {/* Description */}
      <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '12px' }}>
        Full VS Code experience running in your browser. Changes are saved to the workspace automatically.
      </p>
    </div>
  );
}
