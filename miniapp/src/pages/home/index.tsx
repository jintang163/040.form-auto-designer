import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useUserStore } from '@/store/useUserStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetwork } from '@/hooks/useNetwork';
import NetworkStatus from '@/components/NetworkStatus';
import TaskCard from '@/components/TaskCard';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import type { FormTemplate, FormData } from '@/types';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待同步' },
  { key: 'completed', label: '已完成' },
  { key: 'failed', label: '失败' }
];

const HomePage: React.FC = () => {
  const { networkStatus, isOnline } = useNetwork();
  const { templates, formDataList, loadTemplates, loadFormData } = useFormStore();
  const { userInfo } = useUserStore();
  const { refreshStats, syncStats } = useSyncStore();
  const { saveTemplate } = useOfflineStorage();
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useDidShow(() => {
    loadTemplates();
    loadFormData();
    refreshStats();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      loadTemplates();
      loadFormData();
      refreshStats();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') {
      return formDataList;
    }
    return formDataList.filter((form: FormData) => form.syncStatus === activeFilter);
  }, [formDataList, activeFilter]);

  const inProgressCount = useMemo(() => {
    return formDataList.filter((f: FormData) => f.status === 'in_progress').length;
  }, [formDataList]);

  const handleDownloadTemplate = async (e: React.MouseEvent, template: FormTemplate) => {
    e.stopPropagation();
    if (template.downloaded) {
      Taro.showToast({
        title: '模板已下载',
        icon: 'success'
      });
      return;
    }

    try {
      saveTemplate(template);
      loadTemplates();
      Taro.showToast({
        title: '下载成功',
        icon: 'success'
      });
      console.log('[Home] Template downloaded:', template.id);
    } catch (error) {
      console.error('[Home] Download template error:', error);
      Taro.showToast({
        title: '下载失败',
        icon: 'none'
      });
    }
  };

  const handleStartForm = (template: FormTemplate) => {
    if (!template.downloaded) {
      Taro.showToast({
        title: '请先下载模板',
        icon: 'none'
      });
      return;
    }

    Taro.switchTab({
      url: '/pages/formFill/index'
    }).then(() => {
      const { createNewForm, setCurrentTemplate } = useFormStore.getState();
      setCurrentTemplate(template);
      createNewForm(template.id);
    });
  };

  const handleTaskClick = (formData: FormData) => {
    Taro.navigateTo({
      url: `/pages/formDetail/index?id=${formData.id}`
    });
  };

  const handleFabClick = () => {
    const downloadedTemplates = templates.filter((t: FormTemplate) => t.downloaded);
    if (downloadedTemplates.length === 0) {
      Taro.showToast({
        title: '请先下载表单模板',
        icon: 'none'
      });
      return;
    }
    Taro.switchTab({
      url: '/pages/formFill/index'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <View className={styles.homePage}>
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
          <View className={styles.header}>
            <View className={styles.headerTop}>
              <View className={styles.greeting}>
                <Text className={styles.hello}>{getGreeting()}，{userInfo?.name || '用户'}</Text>
                <Text className={styles.subText}>今天也要加油哦 💪</Text>
              </View>
              <NetworkStatus status={networkStatus} />
            </View>

            <View className={styles.statsRow}>
              <View className={styles.statCard}>
                <Text className={styles.statNumber}>{inProgressCount}</Text>
                <Text className={styles.statLabel}>填写中</Text>
              </View>
              <View className={styles.statCard}>
                <Text className={styles.statNumber}>{syncStats.pending + syncStats.failed}</Text>
                <Text className={styles.statLabel}>待同步</Text>
              </View>
              <View className={styles.statCard}>
                <Text className={styles.statNumber}>{syncStats.completed}</Text>
                <Text className={styles.statLabel}>已完成</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>表单模板</Text>
            </View>
          </View>

          <View className={styles.templatesScroll}>
            <ScrollView
              scrollX
              enhanced
              showScrollbar={false}
              className={styles.templateList}
            >
              {templates.map((template: FormTemplate) => (
                <View
                  key={template.id}
                  className={classnames(styles.templateCard, template.downloaded && styles.downloaded)}
                  onClick={() => handleStartForm(template)}
                >
                  <View className={styles.templateIcon}>
                    <Text>{template.icon || '📋'}</Text>
                  </View>
                  <Text className={styles.templateName}>{template.name}</Text>
                  <Text className={styles.templateDesc}>{template.description}</Text>
                  <View className={styles.templateFooter}>
                    <Text className={styles.templateVersion}>{template.version}</Text>
                    <View
                      className={classnames(
                        styles.downloadBtn,
                        template.downloaded ? styles.downloaded : styles.notDownloaded
                      )}
                      onClick={(e) => handleDownloadTemplate(e, template)}
                    >
                      <Text>{template.downloaded ? '已下载' : '下载'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>最近任务</Text>
            </View>

            <ScrollView
              scrollX
              enhanced
              showScrollbar={false}
              className={styles.filterTabs}
            >
              {FILTERS.map((filter) => (
                <View
                  key={filter.key}
                  className={classnames(styles.filterTab, activeFilter === filter.key && styles.active)}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  <Text>{filter.label}</Text>
                </View>
              ))}
            </ScrollView>

            <View className={styles.taskList}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((formData: FormData) => (
                  <TaskCard
                    key={formData.id}
                    formData={formData}
                    onClick={() => handleTaskClick(formData)}
                  />
                ))
              ) : (
                <View className={styles.emptyState}>
                  <Text className={styles.emptyIcon}>📝</Text>
                  <Text className={styles.emptyText}>暂无任务记录</Text>
                  <Text className={styles.emptySubText}>点击下方按钮开始填写表单</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

      <View className={styles.fab} onClick={handleFabClick}>
        <Text className={styles.fabIcon}>+</Text>
      </View>
    </View>
  );
};

export default HomePage;
