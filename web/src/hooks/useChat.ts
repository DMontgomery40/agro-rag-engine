import { useState, useCallback, useRef, useEffect } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  repo?: string;
  eventId?: string;
  confidence?: number;
  isLoading?: boolean;
  isError?: boolean;
}

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

export interface TraceData {
  query_type?: string;
  routes?: string[];
  timing?: Record<string, number>;
  sources?: Array<{
    file: string;
    score: number;
    lines?: string;
  }>;
}

const DEFAULT_SETTINGS: ChatSettings = {
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

/**
 * Chat hook for managing RAG chat state and streaming
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentRepo, setCurrentRepo] = useState('agro');
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { api } = useAPI();
  const { handleApiError } = useErrorHandler();

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agro_chat_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load chat settings:', e);
    }
  }, []);

  // Cross-tab localStorage sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agro_chat_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (err) {
          console.warn('Failed to sync settings from another tab:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (!settings.historyEnabled || !settings.showHistoryOnLoad) return;

    try {
      const raw = localStorage.getItem('agro_chat_history');
      if (!raw) return;

      const history = JSON.parse(raw);
      if (!Array.isArray(history)) return;

      // Validate and load messages
      const validMessages = history
        .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .map((m: any) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || Date.now(),
          repo: m.repo,
          eventId: m.eventId,
          confidence: m.confidence,
          isLoading: false,
          isError: false
        }));

      setMessages(validMessages);
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
  }, [settings.historyEnabled, settings.showHistoryOnLoad]);

  // Save message to history
  const saveMessageToHistory = useCallback((message: ChatMessage) => {
    if (!settings.historyEnabled || message.isLoading || message.isError) return;

    try {
      let history = JSON.parse(localStorage.getItem('agro_chat_history') || '[]');

      history.push({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        repo: message.repo,
        eventId: message.eventId,
        confidence: message.confidence
      });

      // Enforce history limit
      if (history.length > settings.historyLimit) {
        history = history.slice(-settings.historyLimit);
      }

      localStorage.setItem('agro_chat_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save message to history:', e);
    }
  }, [settings.historyEnabled, settings.historyLimit]);

  // Add message to chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...message
    };

    setMessages(prev => [...prev, newMessage]);
    saveMessageToHistory(newMessage);

    return newMessage.id;
  }, [saveMessageToHistory]);

  // Update message by ID
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Remove message by ID
  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  // Send message to RAG API
  const sendMessage = useCallback(async (content: string, repo: string = currentRepo) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({
      role: 'user',
      content: content.trim(),
      repo
    });

    // Add loading message
    const loadingId = addMessage({
      role: 'assistant',
      content: 'Thinking...',
      isLoading: true
    });

    setIsStreaming(true);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const payload = {
        question: content.trim(),
        repo: repo || null,
        model: settings.model || null,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        multi_query: settings.multiQuery,
        final_k: settings.finalK,
        confidence: settings.confidence,
        system_prompt: settings.systemPrompt || null
      };

      const response = await fetch(api('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Remove loading message
      removeMessage(loadingId);

      // Format answer with confidence if enabled
      let answerText = data.answer || 'No answer received';
      if (settings.showConfidence && data.confidence !== undefined) {
        answerText = `[Confidence: ${(data.confidence * 100).toFixed(1)}%]\n\n${answerText}`;
      }

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: answerText,
        eventId: data.event_id,
        confidence: data.confidence,
        repo
      });

      // Store trace data if available
      if (data.trace_data) {
        setTraceData(data.trace_data);
      }

      // Store event_id globally for feedback tracking
      if (data.event_id) {
        (window as any).lastChatEventId = data.event_id;
      }

    } catch (error) {
      removeMessage(loadingId);

      if ((error as any).name === 'AbortError') {
        // User cancelled - don't show error
        return;
      }

      console.error('Chat error:', error);

      const errorMessage = handleApiError(error, 'Chat');
      addMessage({
        role: 'assistant',
        content: errorMessage,
        isError: true
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [currentRepo, settings, api, addMessage, updateMessage, removeMessage, handleApiError]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear chat history from localStorage
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem('agro_chat_history');
    } catch (e) {
      console.error('Failed to clear chat history:', e);
    }
  }, []);

  // Export chat history
  const exportHistory = useCallback(() => {
    try {
      const history = localStorage.getItem('agro_chat_history') || '[]';
      const blob = new Blob([history], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export chat history:', e);
    }
  }, []);

  // Import chat history
  const importHistory = useCallback((file: File) => {
    return new Promise<{ success: boolean; message: string; count?: number }>((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const history = JSON.parse(content);

          // Validate JSON structure
          if (!Array.isArray(history)) {
            resolve({ success: false, message: 'Invalid history file: expected array' });
            return;
          }

          // Validate messages
          const validMessages = history
            .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
            .map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || Date.now(),
              repo: m.repo,
              eventId: m.eventId,
              confidence: m.confidence
            }));

          if (validMessages.length === 0) {
            resolve({ success: false, message: 'No valid messages found in file' });
            return;
          }

          // Save to localStorage
          localStorage.setItem('agro_chat_history', JSON.stringify(validMessages));

          // Load into current state
          setMessages(validMessages.map((m: any) => ({
            ...m,
            isLoading: false,
            isError: false
          })));

          resolve({
            success: true,
            message: `Successfully imported ${validMessages.length} messages`,
            count: validMessages.length
          });
        } catch (err: any) {
          console.error('Failed to import chat history:', err);
          resolve({
            success: false,
            message: `Import failed: ${err.message || 'Invalid JSON'}`
          });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, message: 'Failed to read file' });
      };

      reader.readAsText(file);
    });
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<ChatSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      localStorage.setItem('agro_chat_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save chat settings:', e);
    }
  }, [settings]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem('agro_chat_settings');
    } catch (e) {
      console.warn('Failed to reset chat settings:', e);
    }
  }, []);

  // Get storage stats
  const getStorageStats = useCallback(() => {
    try {
      const historyStr = localStorage.getItem('agro_chat_history') || '[]';
      const history = JSON.parse(historyStr);
      const sizeInBytes = new Blob([historyStr]).size;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);

      return {
        messageCount: Array.isArray(history) ? history.length : 0,
        sizeKB: sizeInKB
      };
    } catch {
      return { messageCount: 0, sizeKB: '0' };
    }
  }, []);

  return {
    messages,
    isStreaming,
    currentRepo,
    setCurrentRepo,
    settings,
    updateSettings,
    resetSettings,
    traceData,
    sendMessage,
    clearMessages,
    clearHistory,
    exportHistory,
    importHistory,
    stopStreaming,
    getStorageStats
  };
}
