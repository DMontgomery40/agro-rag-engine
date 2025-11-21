import { apiClient, api } from './client';
import type { DockerStatus, DockerContainer } from '@/types';

export const dockerApi = {
  /**
   * Get Docker daemon status
   */
  async getStatus(): Promise<DockerStatus> {
    const { data } = await apiClient.get<DockerStatus>(api('/api/docker/status'));
    return data;
  },

  /**
   * List all Docker containers
   */
  async listContainers(): Promise<{ containers: DockerContainer[] }> {
    const { data } = await apiClient.get<{ containers: DockerContainer[] }>(
      api('/api/docker/containers/all')
    );
    return data;
  },

  /**
   * Start a container by ID
   */
  async startContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/start`));
  },

  /**
   * Stop a container by ID
   */
  async stopContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/stop`));
  },

  /**
   * Restart a container by ID
   */
  async restartContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/restart`));
  },

  /**
   * Pause a container by ID
   */
  async pauseContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/pause`));
  },

  /**
   * Unpause a container by ID
   */
  async unpauseContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/unpause`));
  },

  /**
   * Remove a container by ID
   */
  async removeContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/container/${id}/remove`));
  },

  /**
   * Get container logs
   */
  async getContainerLogs(id: string, tail: number = 100): Promise<{ success: boolean; logs: string; error?: string }> {
    const { data } = await apiClient.get<{ success: boolean; logs: string; error?: string }>(
      api(`/api/docker/container/${id}/logs?tail=${tail}`)
    );
    return data;
  }
};
