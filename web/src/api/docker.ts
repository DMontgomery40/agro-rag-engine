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
    await apiClient.post(api(`/api/docker/containers/${id}/start`));
  },

  /**
   * Stop a container by ID
   */
  async stopContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/containers/${id}/stop`));
  },

  /**
   * Restart a container by ID
   */
  async restartContainer(id: string): Promise<void> {
    await apiClient.post(api(`/api/docker/containers/${id}/restart`));
  },
};
