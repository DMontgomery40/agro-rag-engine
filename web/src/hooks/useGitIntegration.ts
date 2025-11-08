import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';

export interface GitHookStatus {
  dir: string;
  post_checkout: boolean;
  post_commit: boolean;
  enabled_hint: string;
}

export interface CommitMetadata {
  agent_name: string;
  agent_email: string;
  chat_session_id: string;
  trailer_key: string;
  append_trailer: boolean;
  set_git_user: boolean;
  enable_template: boolean;
  install_hook: boolean;
}

export interface GitUser {
  name: string;
  email: string;
}

export interface GitMetaResponse {
  meta: CommitMetadata;
  git_user: GitUser;
  template_path: string;
  hook_path: string;
}

/**
 * Hook for managing Git hooks and commit metadata
 * Handles git hooks installation, status checking, and commit metadata configuration
 */
export function useGitIntegration() {
  const [hookStatus, setHookStatus] = useState<GitHookStatus | null>(null);
  const [commitMeta, setCommitMeta] = useState<CommitMetadata>({
    agent_name: '',
    agent_email: '',
    chat_session_id: '',
    trailer_key: 'Chat-Session',
    append_trailer: true,
    set_git_user: false,
    enable_template: false,
    install_hook: true
  });
  const [gitUser, setGitUser] = useState<GitUser>({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api } = useAPI();
  const { handleApiError } = useErrorHandler();

  /**
   * Load git hooks status from backend
   */
  const loadHooksStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(api('/api/git/hooks/status'));
      if (!response.ok) {
        throw new Error(`Failed to load hooks status: ${response.status}`);
      }
      const data: GitHookStatus = await response.json();
      setHookStatus(data);
      setIsLoading(false);
    } catch (err) {
      const errorMsg = handleApiError(err, 'Load git hooks status');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useGitIntegration] Load hooks status failed:', err);
    }
  }, [api, handleApiError]);

  /**
   * Install git hooks
   */
  const installHooks = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(api('/api/git/hooks/install'), {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to install hooks: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useGitIntegration] Install result:', data);

      // Reload status after installation
      await loadHooksStatus();
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMsg = handleApiError(err, 'Install git hooks');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useGitIntegration] Install hooks failed:', err);
      return false;
    }
  }, [api, handleApiError, loadHooksStatus]);

  /**
   * Load commit metadata configuration
   */
  const loadCommitMeta = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(api('/api/git/commit-meta'));
      if (!response.ok) {
        throw new Error(`Failed to load commit metadata: ${response.status}`);
      }
      const data: GitMetaResponse = await response.json();
      setCommitMeta(data.meta);
      setGitUser(data.git_user);
      setIsLoading(false);
    } catch (err) {
      const errorMsg = handleApiError(err, 'Load commit metadata');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useGitIntegration] Load commit meta failed:', err);
    }
  }, [api, handleApiError]);

  /**
   * Save commit metadata configuration
   */
  const saveCommitMeta = useCallback(async (meta: Partial<CommitMetadata>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = { ...commitMeta, ...meta };
      const response = await fetch(api('/api/git/commit-meta'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Save failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useGitIntegration] Save result:', data);

      // Update local state with saved values
      setCommitMeta(payload);
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMsg = handleApiError(err, 'Save commit metadata');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useGitIntegration] Save commit meta failed:', err);
      return false;
    }
  }, [api, handleApiError, commitMeta]);

  /**
   * Update commit metadata in state (without saving)
   */
  const updateCommitMeta = useCallback((updates: Partial<CommitMetadata>) => {
    setCommitMeta(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Test git connection by checking hooks status
   */
  const testGitConnection = useCallback(async (): Promise<boolean> => {
    try {
      await loadHooksStatus();
      return true;
    } catch {
      return false;
    }
  }, [loadHooksStatus]);

  // Load initial data on mount
  useEffect(() => {
    loadHooksStatus();
    loadCommitMeta();
  }, [loadHooksStatus, loadCommitMeta]);

  return {
    hookStatus,
    commitMeta,
    gitUser,
    isLoading,
    error,
    loadHooksStatus,
    installHooks,
    loadCommitMeta,
    saveCommitMeta,
    updateCommitMeta,
    testGitConnection
  };
}
