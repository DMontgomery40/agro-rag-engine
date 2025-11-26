import { apiClient, api } from './client';

/**
 * Webhook configuration interface for saving
 */
export interface WebhookSaveRequest {
  slack_url?: string;
  discord_url?: string;
  enabled?: boolean;
  severity?: {
    critical: boolean;
    warning: boolean;
    info: boolean;
  };
  include_resolved?: boolean;
}

/**
 * Webhook configuration interface for reading
 */
export interface WebhookConfig {
  slack_webhook_url: string;
  discord_webhook_url: string;
  alert_notify_enabled: boolean;
  alert_notify_severities: string;
  alert_include_resolved: boolean;
  alert_webhook_timeout_seconds: number;
}

/**
 * Response from save operation
 */
export interface WebhookSaveResponse {
  status: string;
  message: string;
}

/**
 * Webhook API client
 */
export const webhooksApi = {
  /**
   * Save webhook configuration
   */
  async save(config: WebhookSaveRequest): Promise<WebhookSaveResponse> {
    const { data } = await apiClient.post<WebhookSaveResponse>(
      api('/webhooks/save'),
      config
    );
    return data;
  },

  /**
   * Get current webhook configuration
   */
  async getConfig(): Promise<WebhookConfig> {
    const { data } = await apiClient.get<WebhookConfig>(api('/webhooks/config'));
    return data;
  },
};
