import { useState, useEffect, useCallback } from 'react';
import { useAPI } from './useAPI';

interface EditorSettings {
  port: number;
  host: string;
  enabled: boolean;
  embed_enabled: boolean;
  bind?: string;
  image?: string;
  url?: string;
}

const DEFAULT_SETTINGS: EditorSettings = {
  port: 4440,
  host: '127.0.0.1',
  enabled: true,
  embed_enabled: true
};

export function useVSCodeEmbed() {
  const { api } = useAPI();
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isHealthy, setIsHealthy] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Checking...');
  const [statusColor, setStatusColor] = useState('var(--fg-muted)');
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy URL');
  const [isRestarting, setIsRestarting] = useState(false);
  const [directUrl, setDirectUrl] = useState<string>('');

  const buildProxyUrl = useCallback((s: EditorSettings) => {
    if (s.url && s.url.startsWith('/')) return s.url;
    return '/editor/';
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const resp = await fetch(api('/api/editor/settings'));
      if (resp.ok) {
        const data = await resp.json();
        const merged: EditorSettings = {
          port: Number(data.port ?? DEFAULT_SETTINGS.port),
          host: String(data.host ?? DEFAULT_SETTINGS.host),
          enabled: data.enabled !== false,
          embed_enabled: data.embed_enabled !== false,
          bind: data.bind,
          image: data.image,
          url: data.url,
        };
        setSettings(merged);
        setIsEnabled(merged.enabled && merged.embed_enabled !== false);
        setIframeUrl(buildProxyUrl(merged));
        return merged;
      }
    } catch (e) {
      console.warn('[useVSCodeEmbed] Failed to load editor settings', e);
    }
    setIsEnabled(false);
    return DEFAULT_SETTINGS;
  }, [api, buildProxyUrl]);

  const checkHealth = useCallback(async () => {
    const s = await loadSettings();
    try {
      const resp = await fetch(api('/health/editor'));
      if (!resp.ok) {
        setIsHealthy(false);
        setStatusMessage('Editor unavailable');
        setStatusColor('var(--warn)');
        return;
      }
      const data = await resp.json();
      const enabled = data.enabled !== undefined ? Boolean(data.enabled) : s.enabled;
      const ok = Boolean(data.ok) && enabled;
      const proxy = data.proxy_url || data.url || buildProxyUrl(s);
      const direct = data.direct_url || directUrl || `http://${s.host || '127.0.0.1'}:${s.port || 4440}/`;

      setIsEnabled(enabled && s.embed_enabled !== false);
      setIsHealthy(ok && s.embed_enabled !== false);
      setIframeUrl(proxy);
      setDirectUrl(direct);
      setStatusMessage(ok ? 'Editor ready' : 'Editor starting');
      setStatusColor(ok ? 'var(--success)' : 'var(--warn)');
    } catch (e) {
      setIsHealthy(false);
      setStatusMessage('Editor check failed');
      setStatusColor('var(--warn)');
    }
  }, [api, buildProxyUrl, loadSettings, directUrl]);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), 15000);
    return () => clearInterval(id);
  }, [checkHealth]);

  const openInWindow = useCallback(() => {
    const url = directUrl || iframeUrl;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [iframeUrl, directUrl]);

  const copyUrl = useCallback(async () => {
    try {
      if (iframeUrl) {
        await navigator.clipboard.writeText(directUrl || iframeUrl);
        setCopyButtonText('✓ Copied');
        setTimeout(() => setCopyButtonText('📋 Copy URL'), 1200);
      }
    } catch (e) {
      console.error('[useVSCodeEmbed] Failed to copy URL', e);
      setCopyButtonText('Copy failed');
      setTimeout(() => setCopyButtonText('📋 Copy URL'), 1500);
    }
  }, [iframeUrl, directUrl]);

  const restart = useCallback(async () => {
    setIsRestarting(true);
    try {
      const resp = await fetch(api('/api/editor/restart'), { method: 'POST' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setStatusMessage('Restart requested');
    } catch (e) {
      setStatusMessage('Restart failed');
    } finally {
      setIsRestarting(false);
      setTimeout(() => void checkHealth(), 3000);
    }
  }, [api, checkHealth]);

  return {
    isHealthy,
    isEnabled,
    iframeUrl,
    directUrl,
    statusMessage,
    statusColor,
    copyButtonText,
    isRestarting,
    checkHealth,
    openInWindow,
    copyUrl,
    restart,
  };
}
