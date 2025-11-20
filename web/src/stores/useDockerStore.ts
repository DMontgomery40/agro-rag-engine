import { create } from 'zustand';
import { dockerApi } from '@/api';
import type { DockerStatus, DockerContainer } from '@/types';

interface DockerStore {
  status: DockerStatus | null;
  containers: DockerContainer[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  fetchContainers: () => Promise<void>;
  startContainer: (id: string) => Promise<void>;
  stopContainer: (id: string) => Promise<void>;
  restartContainer: (id: string) => Promise<void>;
  pauseContainer: (id: string) => Promise<void>;
  unpauseContainer: (id: string) => Promise<void>;
  removeContainer: (id: string) => Promise<void>;
  getContainerLogs: (id: string, tail?: number) => Promise<{ success: boolean; logs: string; error?: string }>;
  reset: () => void;
}

export const useDockerStore = create<DockerStore>((set, get) => ({
  status: null,
  containers: [],
  loading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await dockerApi.getStatus();
      set({ status, loading: false, error: null });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Docker status'
      });
    }
  },

  fetchContainers: async () => {
    set({ loading: true, error: null });
    try {
      const { containers } = await dockerApi.listContainers();
      set({ containers, loading: false, error: null });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch containers'
      });
    }
  },

  startContainer: async (id: string) => {
    try {
      await dockerApi.startContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start container'
      });
    }
  },

  stopContainer: async (id: string) => {
    try {
      await dockerApi.stopContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to stop container'
      });
    }
  },

  restartContainer: async (id: string) => {
    try {
      await dockerApi.restartContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to restart container'
      });
    }
  },

  pauseContainer: async (id: string) => {
    try {
      await dockerApi.pauseContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to pause container'
      });
    }
  },

  unpauseContainer: async (id: string) => {
    try {
      await dockerApi.unpauseContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to unpause container'
      });
    }
  },

  removeContainer: async (id: string) => {
    try {
      await dockerApi.removeContainer(id);
      await get().fetchContainers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove container'
      });
    }
  },

  getContainerLogs: async (id: string, tail: number = 100) => {
    try {
      return await dockerApi.getContainerLogs(id, tail);
    } catch (error) {
      return {
        success: false,
        logs: '',
        error: error instanceof Error ? error.message : 'Failed to fetch logs'
      };
    }
  },

  reset: () => set({
    status: null,
    containers: [],
    loading: false,
    error: null
  }),
}));
