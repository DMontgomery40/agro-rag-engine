export default function VSCodeTab() {
  return (
    <>
                <div className="settings-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <h3 style={{margin: 0}}>Embedded Code Editor</h3>
                            <div id="editor-health-badge" style={{padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: 'var(--fg-muted)', color: 'var(--fg)'}}>
                                <span id="editor-health-text">Checking...</span>
                            </div>
                        </div>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button id="btn-editor-open-window" className="small-button" style={{background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>
                                🗗 Open in Window
                            </button>
                            <button id="btn-editor-copy-url" className="small-button" style={{background: 'var(--bg-elev2)', color: 'var(--accent)', border: '1px solid var(--accent)'}}>
                                📋 Copy URL
                            </button>
                            <button id="btn-editor-restart" className="small-button" style={{background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)'}}>
                                ↻ Restart
                            </button>
                        </div>
                    </div>

                    <div id="editor-status-banner" style={{display: 'none', background: 'var(--bg-elev2)', border: '1px solid var(--warn)', borderRadius: '6px', padding: '16px', marginBottom: '16px'}}>
                        <div style={{display: 'flex', alignItems: 'start', gap: '12px'}}>
                            <span style={{fontSize: '24px'}}>⚠️</span>
                            <div style={{flex: 1}}>
                                <div style={{fontWeight: 600, marginBottom: '4px'}}>Editor Unavailable</div>
                                <div id="editor-status-message" style={{fontSize: '12px', color: 'var(--fg-muted)'}}></div>
                            </div>
                        </div>
                    </div>

                    <div id="editor-iframe-container" style={{position: 'relative', width: '100%', height: 'calc(100vh - 200px)', minHeight: '600px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden'}}>
                        <iframe
                            id="editor-iframe"
                            style={{width: '100%', height: '100%', border: 'none'}}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
                        ></iframe>
                    </div>

                    <p className="small" style={{color:'var(--fg-muted)', marginTop: '12px'}}>
                        Full VS Code experience running in your browser. Changes are saved to the workspace automatically.
                    </p>
                </div>
    </>
  )
}
