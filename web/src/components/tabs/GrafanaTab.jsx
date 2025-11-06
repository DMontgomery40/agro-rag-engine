export default function GrafanaTab() {
  return (
    <>
                <div id="tab-grafana-config" className="section-subtab" style={{padding: '24px'}}>
                    <div className="settings-section">
                        <h3 id="grafana-config-anchor">Grafana Metrics Dashboard</h3>
                        <p className="small">Configure and embed your live Grafana dashboard powered by Prometheus.</p>

                    <div className="input-row">
                        <div className="input-group">
                            <label>
                                <input type="checkbox" name="GRAFANA_EMBED_ENABLED" checked />
                                Enable Embedded Grafana
                            </label>
                        </div>
                        <div className="input-group">
                            <label>Grafana Base URL</label>
                            <input type="text" name="GRAFANA_BASE_URL" value="http://127.0.0.1:3000" placeholder="http://127.0.0.1:3000" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Dashboard UID</label>
                            <input type="text" name="GRAFANA_DASHBOARD_UID" value="agro-overview" placeholder="agro-overview" />
                        </div>
                        <div className="input-group">
                            <label>Dashboard Slug</label>
                            <input type="text" name="GRAFANA_DASHBOARD_SLUG" value="agro-overview" placeholder="agro-overview" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Org ID</label>
                            <input type="number" name="GRAFANA_ORG_ID" value="1" min="1" />
                        </div>
                        <div className="input-group">
                            <label>Refresh Interval</label>
                            <input type="text" name="GRAFANA_REFRESH" value="10s" placeholder="10s" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Kiosk Mode</label>
                            <select name="GRAFANA_KIOSK">
                                <option value="">None</option>
                                <option value="tv" selected>tv</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Auth Mode</label>
                            <select name="GRAFANA_AUTH_MODE">
                                <option value="anonymous" selected>Anonymous</option>
                                <option value="token">Service Account Token</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Auth Token (optional)</label>
                            <input type="text" name="GRAFANA_AUTH_TOKEN" placeholder="Token for auth_token=..." />
                        </div>
                        <div className="input-group">
                            <label>&nbsp;</label>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button id="grafana-preview" style={{background: 'var(--link)', color: 'var(--on-link)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Preview</button>
                                <button id="grafana-open" style={{background: 'var(--bg-elev1)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Open Grafana</button>
                            </div>
                        </div>
                    </div>

                    </div>
                </div>
                <div id="tab-grafana-dashboard" className="section-subtab fullscreen active">
                    <div id="grafana-embed" style={{height: 'calc(100vh - 200px)', minHeight: '600px', display: 'flex', overflow: 'hidden', background: 'var(--card-bg)'}}>
                        <iframe id="grafana-iframe" style={{width:'100%', height:'100%', border:0, background: 'var(--bg)', display: 'block'}}></iframe>
                    </div>
                </div>
    </>
  )
}
