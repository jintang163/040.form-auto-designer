import { create } from 'zustand';
import type { SyncTask, SyncStats, FormData } from '@/types';
import { syncTaskStorage, formDataStorage } from '@/utils/storage';

interface SyncState {
  syncTasks: SyncTask[];
  syncStats: SyncStats;
  isSyncing: boolean;
  syncProgress: number;

  loadSyncTasks: () => void;
  refreshStats: () => void;
  addSyncTask: (task: SyncTask) => void;
  updateSyncTask: (taskId: string, updates: Partial<SyncTask>) => void;
  removeSyncTask: (taskId: string) => void;
  getPendingTasks: () => SyncTask[];
  getFailedTasks: () => SyncTask[];
  clearCompletedTasks: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncTasks: [],
  syncStats: {
    total: 0,
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0
  },
  isSyncing: false,
  syncProgress: 0,

  loadSyncTasks: () => {
    const syncTasks = syncTaskStorage.getAll();
    set({ syncTasks });
    get().refreshStats();
    console.log('[SyncStore] Sync tasks loaded:', syncTasks.length);
  },

  refreshStats: () => {
    const formDataList = formDataStorage.getAll() as FormData[];
    const stats: SyncStats = {
      total: formDataList.length,
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0
    };

    formDataList.forEach((form) => {
      if (stats[form.syncStatus] !== undefined) {
        stats[form.syncStatus]++;
      }
    });

    set({ syncStats: stats });
  },

  addSyncTask: (task) => {
    syncTaskStorage.add(task);
    const syncTasks = syncTaskStorage.getAll();
    set({ syncTasks });
    get().refreshStats();
  },

  updateSyncTask: (taskId, updates) => {
    const updated = syncTaskStorage.update(taskId, updates);
    if (updated) {
      const syncTasks = syncTaskStorage.getAll();
      set({ syncTasks });
      get().refreshStats();
    }
  },

  removeSyncTask: (taskId) => {
    syncTaskStorage.remove(taskId);
    const syncTasks = syncTaskStorage.getAll();
    set({ syncTasks });
    get().refreshStats();
  },

  getPendingTasks: () => {
    return get().syncTasks.filter((task) => task.status === 'pending');
  },

  getFailedTasks: () => {
    return get().syncTasks.filter((task) => task.status === 'failed');
  },

  clearCompletedTasks: () => {
    const { syncTasks } = get();
    syncTasks
      .filter((task) => task.status === 'completed')
      .forEach((task) => syncTaskStorage.remove(task.id));

    const remaining = syncTaskStorage.getAll();
    set({ syncTasks: remaining });
    get().refreshStats();
    console.log('[SyncStore] Completed tasks cleared');
  }
}));
