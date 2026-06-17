import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import './app.scss';
import { useFormStore } from '@/store/useFormStore';
import { useUserStore } from '@/store/useUserStore';
import { useSyncStore } from '@/store/useSyncStore';
import { templateStorage } from '@/utils/storage';
import { initializeTemplates } from '@/data/mockTemplates';
import { initializeMockAnalytics } from '@/data/mockAnalytics';

function App(props) {
  const { loadTemplates, loadFormData } = useFormStore();
  const { loadUserInfo } = useUserStore();
  const { loadSyncTasks } = useSyncStore();

  useEffect(() => {
    const existingTemplates = templateStorage.getAll();
    if (existingTemplates.length === 0) {
      const initialTemplates = initializeTemplates();
      templateStorage.save(initialTemplates);
      console.log('[App] Initial templates loaded');
    }

    initializeMockAnalytics();

    loadTemplates();
    loadFormData();
    loadUserInfo();
    loadSyncTasks();
    console.log('[App] App initialized');
  }, [loadTemplates, loadFormData, loadUserInfo, loadSyncTasks]);

  useDidShow(() => {
    loadFormData();
    loadTemplates();
    loadSyncTasks();
    console.log('[App] App shown, data refreshed');
  });

  useDidHide(() => {
    console.log('[App] App hidden');
  });

  return props.children;
}

export default App;
