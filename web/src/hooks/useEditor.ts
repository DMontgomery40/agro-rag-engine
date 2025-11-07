import { useState, useCallback, useEffect } from 'react';

/**
 * Monaco editor themes
 */
export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black';

/**
 * Editor settings interface
 */
export interface EditorSettings {
  theme: EditorTheme;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  renderWhitespace: boolean;
  scrollBeyondLastLine: boolean;
}

/**
 * Default editor settings
 */
const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: false,
  renderWhitespace: false,
  scrollBeyondLastLine: true
};

/**
 * Storage key for editor settings
 */
const STORAGE_KEY = 'agro-editor-settings';

/**
 * Load settings from localStorage
 */
function loadSettingsFromStorage(): EditorSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('[useEditor] Failed to load settings from storage:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 */
function saveSettingsToStorage(settings: EditorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[useEditor] Failed to save settings to storage:', error);
  }
}

/**
 * Hook for managing editor state and settings
 */
export function useEditor() {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(() => loadSettingsFromStorage());

  /**
   * Update editor settings
   */
  const updateSettings = useCallback((partial: Partial<EditorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      saveSettingsToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  /**
   * Update content and mark as dirty
   */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  /**
   * Load a file
   */
  const loadFile = useCallback((path: string, fileContent: string, lang?: string) => {
    setFilePath(path);
    setContent(fileContent);
    setIsDirty(false);

    // Infer language from file extension if not provided
    if (!lang) {
      const ext = path.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'json': 'json',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'md': 'markdown',
        'yaml': 'yaml',
        'yml': 'yaml',
        'sh': 'shell',
        'bash': 'shell',
        'sql': 'sql',
        'xml': 'xml',
        'txt': 'plaintext'
      };
      setLanguage(languageMap[ext || ''] || 'plaintext');
    } else {
      setLanguage(lang);
    }
  }, []);

  /**
   * Save current file
   */
  const saveFile = useCallback((): { path: string | null; content: string } => {
    setIsDirty(false);
    return {
      path: filePath,
      content
    };
  }, [filePath, content]);

  /**
   * Create new file
   */
  const newFile = useCallback((lang: string = 'javascript') => {
    setFilePath(null);
    setContent('');
    setLanguage(lang);
    setIsDirty(false);
  }, []);

  /**
   * Get Monaco editor options from settings
   */
  const getMonacoOptions = useCallback(() => {
    return {
      theme: settings.theme,
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' as const : 'off' as const,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers ? 'on' as const : 'off' as const,
      renderWhitespace: settings.renderWhitespace ? 'all' as const : 'none' as const,
      scrollBeyondLastLine: settings.scrollBeyondLastLine,
      automaticLayout: true,
      scrollbar: {
        vertical: 'visible' as const,
        horizontal: 'visible' as const,
        useShadows: false
      },
      formatOnPaste: true,
      formatOnType: false
    };
  }, [settings]);

  /**
   * Save settings on unmount
   */
  useEffect(() => {
    return () => {
      saveSettingsToStorage(settings);
    };
  }, [settings]);

  return {
    // Content state
    content,
    language,
    filePath,
    isDirty,

    // Settings
    settings,
    updateSettings,
    resetSettings,

    // File operations
    loadFile,
    saveFile,
    newFile,
    updateContent,

    // Monaco integration
    getMonacoOptions
  };
}
