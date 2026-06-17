import { useState, useCallback } from 'react';
import {
  templateStorage,
  formDataStorage,
  syncTaskStorage,
  userStorage,
  storage
} from '@/utils/storage';
import { getSavedFileList, removeSavedFile } from '@/utils/file';
import type { FormTemplate, FormData, SyncTask, UserInfo, StorageInfo } from '@/types';

export const useOfflineStorage = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const getStorageInfo = useCallback(async (): Promise<StorageInfo> => {
    setLoading(true);
    try {
      const storageInfo = storage.getInfo();
      const templates = templateStorage.getAll();
      const formDataList = formDataStorage.getAll();
      const savedFiles = await getSavedFileList();

      const totalImageSize = savedFiles.reduce((acc, file) => acc + file.size, 0);
      const usedSize = (storageInfo.currentSize || 0) * 1024 + totalImageSize;
      const totalSize = (storageInfo.limitSize || 10240) * 1024;

      const imageCount = formDataList.reduce(
        (acc: number, form: FormData) => acc + (form.images?.length || 0),
        0
      );

      setLoading(false);
      return {
        totalSize,
        usedSize,
        formCount: formDataList.length,
        imageCount,
        templateCount: templates.length
      };
    } catch (error) {
      console.error('[OfflineStorage] getStorageInfo error:', error);
      setLoading(false);
      return {
        totalSize: 10 * 1024 * 1024,
        usedSize: 0,
        formCount: 0,
        imageCount: 0,
        templateCount: 0
      };
    }
  }, []);

  const clearAllData = useCallback(async () => {
    setLoading(true);
    try {
      const savedFiles = await getSavedFileList();
      for (const file of savedFiles) {
        await removeSavedFile(file.filePath);
      }

      templateStorage.clear();
      formDataStorage.clear();
      syncTaskStorage.clear();

      console.log('[OfflineStorage] All data cleared');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('[OfflineStorage] clearAllData error:', error);
      setLoading(false);
      return false;
    }
  }, []);

  const clearFormData = useCallback(async (formId: string) => {
    try {
      const formData = formDataStorage.getById(formId);
      if (formData?.images) {
        for (const image of formData.images) {
          await removeSavedFile(image.localPath);
        }
      }
      formDataStorage.remove(formId);
      syncTaskStorage
        .getAll()
        .filter((task: SyncTask) => task.formDataId === formId)
        .forEach((task: SyncTask) => syncTaskStorage.remove(task.id));

      console.log('[OfflineStorage] Form data cleared:', formId);
      return true;
    } catch (error) {
      console.error('[OfflineStorage] clearFormData error:', error);
      return false;
    }
  }, []);

  const saveTemplate = useCallback((template: FormTemplate) => {
    try {
      templateStorage.add({
        ...template,
        downloaded: true,
        downloadAt: new Date().toISOString()
      });
      console.log('[OfflineStorage] Template saved:', template.id);
      return true;
    } catch (error) {
      console.error('[OfflineStorage] saveTemplate error:', error);
      return false;
    }
  }, []);

  const getTemplates = useCallback((): FormTemplate[] => {
    return templateStorage.getAll();
  }, []);

  const saveFormData = useCallback((formData: FormData) => {
    try {
      formDataStorage.add(formData);
      console.log('[OfflineStorage] Form data saved:', formData.id);
      return true;
    } catch (error) {
      console.error('[OfflineStorage] saveFormData error:', error);
      return false;
    }
  }, []);

  const getFormData = useCallback((id?: string): FormData | FormData[] => {
    if (id) {
      return formDataStorage.getById(id);
    }
    return formDataStorage.getAll();
  }, []);

  const updateFormData = useCallback((id: string, updates: Partial<FormData>) => {
    try {
      const updated = formDataStorage.update(id, updates);
      console.log('[OfflineStorage] Form data updated:', id);
      return updated;
    } catch (error) {
      console.error('[OfflineStorage] updateFormData error:', error);
      return null;
    }
  }, []);

  const saveUserInfo = useCallback((userInfo: UserInfo) => {
    try {
      userStorage.save(userInfo);
      console.log('[OfflineStorage] User info saved');
      return true;
    } catch (error) {
      console.error('[OfflineStorage] saveUserInfo error:', error);
      return false;
    }
  }, []);

  const getUserInfo = useCallback((): UserInfo | null => {
    return userStorage.get();
  }, []);

  return {
    loading,
    getStorageInfo,
    clearAllData,
    clearFormData,
    saveTemplate,
    getTemplates,
    saveFormData,
    getFormData,
    updateFormData,
    saveUserInfo,
    getUserInfo
  };
};
