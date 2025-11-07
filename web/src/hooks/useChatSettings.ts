import { useState, useCallback, useEffect } from 'react';

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  multiQuery: number;
  finalK: number;
  confidence: number;
  showCitations: boolean;
  showConfidence: boolean;
  autoScroll: boolean;
  syntaxHighlight: boolean;
  systemPrompt: string;
  historyEnabled: boolean;
  historyLimit: number;
  showHistoryOnLoad: boolean;
}

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: '',
  temperature: 0.0,
  maxTokens: 1000,
  multiQuery: 3,
  finalK: 20,
  confidence: 0.55,
  showCitations: true,
  showConfidence: false,
  autoScroll: true,
  syntaxHighlight: false,
  systemPrompt: '',
  historyEnabled: true,
  historyLimit: 100,
  showHistoryOnLoad: true
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(() => {
    try {
      const saved = localStorage.getItem('agro_chat_settings');
      if (saved) {
        return { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load chat settings:', e);
    }
    return { ...DEFAULT_CHAT_SETTINGS };
  });

  const [storageInfo, setStorageInfo] = useState({ messages: 0, sizeKB: '0.00' });

  const updateStorageInfo = useCallback(() => {
    try {
      const historyStr = localStorage.getItem('agro_chat_history') || '[]';
      const sizeInBytes = new Blob([historyStr]).size;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      const history = JSON.parse(historyStr);
      setStorageInfo({ messages: history.length, sizeKB });
    } catch (e) {
      console.warn('Failed to update storage info:', e);
    }
  }, []);

  useEffect(() => {
    updateStorageInfo();
  }, [updateStorageInfo]);

  const saveSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      localStorage.setItem('agro_chat_settings', JSON.stringify(updated));
      setSettings(updated);
      updateStorageInfo();
      return { success: true, message: 'Chat settings saved' };
    } catch (e: any) {
      console.error('Failed to save chat settings:', e);
      return { success: false, message: `Failed to save settings: ${e.message}` };
    }
  }, [settings, updateStorageInfo]);

  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem('agro_chat_settings');
      setSettings({ ...DEFAULT_CHAT_SETTINGS });
      return { success: true, message: 'Chat settings reset to defaults' };
    } catch (e: any) {
      console.error('Failed to reset chat settings:', e);
      return { success: false, message: `Failed to reset settings: ${e.message}` };
    }
  }, []);

  return {
    settings,
    saveSettings,
    resetSettings,
    storageInfo,
    updateStorageInfo
  };
}
