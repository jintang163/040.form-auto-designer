import { useState, useEffect, useCallback, useRef } from 'react';
import Taro from '@tarojs/taro';
import { formDataStorage, syncTaskStorage } from '@/utils/storage';
import type { FormData, SyncTask, SyncStatus, SyncStats } from '@/types';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000;

export const useAutoSync = (isOnline: boolean) => {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncingRef = useRef<boolean>(false);

  const getSyncStats = useCallback((): SyncStats => {
    const formDataList = formDataStorage.getAll();
    const stats: SyncStats = {
      total: formDataList.length,
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0
    };

    formDataList.forEach((form: FormData) => {
      stats[form.syncStatus]++;
    });

    return stats;
  }, []);

  const createSyncTask = useCallback((formDataId: string, type: 'form' | 'image'): SyncTask => {
    const task: SyncTask = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      formDataId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    syncTaskStorage.add(task);
    return task;
  }, []);

  const mockSyncFormData = async (formData: FormData): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1;
        resolve(success);
      }, 1000 + Math.random() * 2000);
    });
  };

  const mockSyncImage = async (imagePath: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.05;
        resolve(success);
      }, 500 + Math.random() * 1000);
    });
  };

  const syncSingleForm = useCallback(
    async (formData: FormData): Promise<boolean> => {
      if (formData.syncStatus === 'completed') {
        return true;
      }

      console.log('[AutoSync] Start syncing form:', formData.id);

      formDataStorage.update(formData.id, {
        syncStatus: 'syncing',
        status: 'syncing'
      });

      try {
        const formSyncSuccess = await mockSyncFormData(formData);
        if (!formSyncSuccess) {
          throw new Error('表单数据同步失败');
        }

        for (const image of formData.images) {
          if (!image.uploaded) {
            const imageSyncSuccess = await mockSyncImage(image.localPath);
            if (imageSyncSuccess) {
              image.uploaded = true;
              image.remoteUrl = `https://example.com/images/${image.id}`;
            } else {
              throw new Error(`图片同步失败: ${image.name}`);
            }
          }
        }

        formDataStorage.update(formData.id, {
          syncStatus: 'completed',
          status: 'completed',
          syncedAt: new Date().toISOString(),
          errorMessage: undefined
        });

        console.log('[AutoSync] Form synced successfully:', formData.id);
        return true;
      } catch (error) {
        console.error('[AutoSync] Sync failed:', formData.id, error);
        const newRetryCount = (formData.retryCount || 0) + 1;
        const newStatus: SyncStatus = newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';

        formDataStorage.update(formData.id, {
          syncStatus: newStatus,
          status: newStatus === 'failed' ? 'failed' : 'pending',
          errorMessage: error instanceof Error ? error.message : '同步失败',
          retryCount: newRetryCount
        });

        return false;
      }
    },
    []
  );

  const syncAll = useCallback(async () => {
    if (syncingRef.current || !isOnline || !autoSyncEnabled) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      const pendingForms = formDataStorage
        .getAll()
        .filter(
          (form: FormData) =>
            form.syncStatus === 'pending' ||
            (form.syncStatus === 'failed' && form.retryCount < MAX_RETRY_COUNT)
        );

      if (pendingForms.length === 0) {
        console.log('[AutoSync] No pending forms to sync');
        return;
      }

      console.log('[AutoSync] Start syncing', pendingForms.length, 'forms');

      let completedCount = 0;
      for (const formData of pendingForms) {
        await syncSingleForm(formData);
        completedCount++;
        setSyncProgress(Math.round((completedCount / pendingForms.length) * 100));
      }

      console.log('[AutoSync] Sync completed');
    } catch (error) {
      console.error('[AutoSync] Sync error:', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      setSyncProgress(0);
    }
  }, [isOnline, autoSyncEnabled, syncSingleForm]);

  const retrySync = useCallback(
    async (formId: string) => {
      const formData = formDataStorage.getById(formId);
      if (!formData) {
        console.error('[AutoSync] Form not found:', formId);
        return false;
      }

      formDataStorage.update(formId, {
        syncStatus: 'pending',
        errorMessage: undefined,
        retryCount: 0
      });

      if (isOnline) {
        return await syncSingleForm(formData);
      }
      return false;
    },
    [isOnline, syncSingleForm]
  );

  const manualSync = useCallback(async () => {
    if (!isOnline) {
      Taro.showToast({
        title: '当前无网络连接',
        icon: 'none'
      });
      return;
    }
    await syncAll();
  }, [isOnline, syncAll]);

  useEffect(() => {
    if (isOnline && autoSyncEnabled) {
      syncAll();

      syncTimerRef.current = setInterval(() => {
        if (!syncingRef.current) {
          syncAll();
        }
      }, SYNC_INTERVAL);

      console.log('[AutoSync] Auto sync started');
    }

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
        console.log('[AutoSync] Auto sync stopped');
      }
    };
  }, [isOnline, autoSyncEnabled, syncAll]);

  const toggleAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    console.log('[AutoSync] Auto sync', enabled ? 'enabled' : 'disabled');
  }, []);

  return {
    syncing,
    syncProgress,
    autoSyncEnabled,
    getSyncStats,
    syncAll,
    retrySync,
    manualSync,
    toggleAutoSync
  };
};
