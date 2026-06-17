import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetwork } from '@/hooks/useNetwork';
import { useAutoSync } from '@/hooks/useAutoSync';
import StatusBadge from '@/components/StatusBadge';
import dayjs from 'dayjs';
import type { FormData, SyncStatus } from '@/types';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待同步' },
  { key: 'syncing', label: '同步中' },
  { key: 'completed', label: '已完成' },
  { key: 'failed', label: '失败' }
];

const SyncPage: React.FC = () => {
  const { isOnline, networkStatus } = useNetwork();
  const { formDataList, loadFormData, deleteForm } = useFormStore();
  const { syncStats, refreshStats } = useSyncStore();
  const {
    syncing,
    syncProgress,
    autoSyncEnabled,
    manualSync,
    retrySync,
    toggleAutoSync
  } = useAutoSync(isOnline);

  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useDidShow(() => {
    loadFormData();
    refreshStats();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      loadFormData();
      refreshStats();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setRefreshing(false);
    }
  };

  const filteredData = useMemo(() => {
    let data = [...formDataList];
    if (activeFilter !== 'all') {
      data = data.filter((form: FormData) => form.syncStatus === activeFilter);
    }
    return data.sort((a: FormData, b: FormData) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [formDataList, activeFilter]);

  const handleRetry = async (formId: string) => {
    if (!isOnline) {
      Taro.showToast({
        title: '当前无网络连接',
        icon: 'none'
      });
      return;
    }

    Taro.showLoading({ title: '重试中...' });
    try {
      const success = await retrySync(formId);
      Taro.hideLoading();
      if (success) {
        Taro.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        Taro.showToast({
          title: '同步失败',
          icon: 'none'
        });
      }
    } catch (error) {
      Taro.hideLoading();
      console.error('[Sync] Retry error:', error);
      Taro.showToast({
        title: '同步失败',
        icon: 'none'
      });
    } finally {
      loadFormData();
      refreshStats();
    }
  };

  const handleDelete = (formId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '删除后数据将无法恢复，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            deleteForm(formId);
            refreshStats();
            Taro.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('[Sync] Delete error:', error);
            Taro.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  };

  const handleView = (formId: string) => {
    Taro.navigateTo({
      url: `/pages/formDetail/index?id=${formId}`
    });
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      Taro.showToast({
        title: '当前无网络连接',
        icon: 'none'
      });
      return;
    }
    await manualSync();
    loadFormData();
    refreshStats();
  };

  const handleClearCompleted = () => {
    const completedCount = syncStats.completed;
    if (completedCount === 0) {
      Taro.showToast({
        title: '暂无已完成数据',
        icon: 'none'
      });
      return;
    }

    Taro.showModal({
      title: '清理已完成',
      content: `确定要清除 ${completedCount} 条已完成的同步记录吗？`,
      success: (res) => {
        if (res.confirm) {
          const completedForms = formDataList.filter(
            (f: FormData) => f.syncStatus === 'completed'
          );
          completedForms.forEach((f: FormData) => deleteForm(f.id));
          refreshStats();
          Taro.showToast({
            title: '清理成功',
            icon: 'success'
          });
        }
      }
    });
  };

  const getStatusText = (status: SyncStatus) => {
    const map: Record<SyncStatus, string> = {
      pending: '等待同步',
      syncing: '同步中',
      completed: '已完成',
      failed: '同步失败'
    };
    return map[status] || status;
  };

  return (
    <View className={styles.syncPage}>
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
              <Text className={styles.headerTitle}>数据同步</Text>
              <View className={styles.autoSyncToggle}>
                <Text className={styles.toggleLabel}>自动同步</Text>
                <View
                  className={classnames(styles.switch, autoSyncEnabled && styles.active)}
                  onClick={() => toggleAutoSync(!autoSyncEnabled)}
                />
              </View>
            </View>

            <View className={styles.syncControls}>
              <View
                className={classnames(styles.controlBtn, !isOnline && styles.disabled)}
                onClick={handleSyncAll}
              >
                <Text>{syncing ? `同步中 ${syncProgress}%` : '立即同步'}</Text>
              </View>
              <View
                className={classnames(styles.controlBtn, styles.primary)}
                onClick={handleClearCompleted}
              >
                <Text>清理已完成</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <View className={styles.statsGrid}>
              <View className={styles.statCard}>
                <Text className={classnames(styles.statNumber, styles.pending)}>{syncStats.pending}</Text>
                <Text className={styles.statLabel}>待同步</Text>
              </View>
              <View className={styles.statCard}>
                <Text className={classnames(styles.statNumber, styles.syncing)}>{syncStats.syncing}</Text>
                <Text className={styles.statLabel}>同步中</Text>
              </View>
              <View className={styles.statCard}>
                <Text className={classnames(styles.statNumber, styles.completed)}>{syncStats.completed}</Text>
                <Text className={styles.statLabel}>已完成</Text>
              </View>
              <View className={styles.statCard}>
                <Text className={classnames(styles.statNumber, styles.failed)}>{syncStats.failed}</Text>
                <Text className={styles.statLabel}>失败</Text>
              </View>
            </View>

            {syncing && (
              <View className={styles.syncingIndicator}>
                <View className={styles.spinner} />
                <Text className={styles.syncingText}>正在同步数据...</Text>
                <Text className={styles.syncingProgress}>{syncProgress}%</Text>
              </View>
            )}

            {!isOnline && (
              <View className={styles.syncingIndicator}>
                <Text className={styles.syncingText}>当前处于离线模式，联网后将自动同步</Text>
              </View>
            )}

            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>同步列表</Text>
              <Text className={styles.sectionCount}>共 {filteredData.length} 条</Text>
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

            <View className={styles.syncList}>
              {filteredData.length > 0 ? (
                filteredData.map((form: FormData) => (
                  <View key={form.id} className={styles.syncItem}>
                    <View className={styles.syncItemHeader}>
                      <Text className={styles.syncItemTitle}>{form.templateName}</Text>
                      <StatusBadge status={form.syncStatus} size="sm" />
                    </View>

                    <View className={styles.syncItemMeta}>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>字段：</Text>
                        <Text className={styles.metaValue}>{Object.keys(form.fields).length}</Text>
                      </View>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>图片：</Text>
                        <Text className={styles.metaValue}>{form.images?.length || 0}</Text>
                      </View>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>重试：</Text>
                        <Text className={styles.metaValue}>{form.retryCount || 0}/3</Text>
                      </View>
                    </View>

                    {form.errorMessage && (
                      <View style={{
                        background: 'rgba(245, 63, 63, 0.1)',
                        padding: '16rpx',
                        borderRadius: '8rpx',
                        marginBottom: '16rpx'
                      }}>
                        <Text style={{ fontSize: '24rpx', color: '#f53f3f' }}>
                          错误：{form.errorMessage}
                        </Text>
                      </View>
                    )}

                    {form.syncStatus === 'syncing' && (
                      <View className={styles.syncItemProgress}>
                        <View className={styles.progressFill} style={{ width: '60%' }} />
                      </View>
                    )}

                    {form.syncStatus === 'failed' && (
                      <View className={styles.syncItemProgress}>
                        <View className={classnames(styles.progressFill, styles.failed)} style={{ width: '100%' }} />
                      </View>
                    )}

                    <View className={styles.syncItemFooter}>
                      <Text className={styles.syncItemTime}>
                        {getStatusText(form.syncStatus)} · {dayjs(form.updatedAt).format('MM-DD HH:mm')}
                      </Text>
                      <View className={styles.syncItemActions}>
                        <View
                          className={classnames(styles.actionBtn, styles.view)}
                          onClick={() => handleView(form.id)}
                        >
                          <Text>查看</Text>
                        </View>
                        {form.syncStatus === 'failed' && (
                          <View
                            className={classnames(styles.actionBtn, styles.retry)}
                            onClick={() => handleRetry(form.id)}
                          >
                            <Text>重试</Text>
                          </View>
                        )}
                        <View
                          className={classnames(styles.actionBtn, styles.delete)}
                          onClick={() => handleDelete(form.id)}
                        >
                          <Text>删除</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View className={styles.emptyState}>
                  <Text className={styles.emptyIcon}>📤</Text>
                  <Text className={styles.emptyText}>暂无同步记录</Text>
                  <Text className={styles.emptySubText}>填写并提交表单后，数据将在此处显示</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
    </View>
  );
};

export default SyncPage;
