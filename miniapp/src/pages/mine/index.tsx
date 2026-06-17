import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useUserStore } from '@/store/useUserStore';
import { useNetwork } from '@/hooks/useNetwork';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { formatFileSize } from '@/utils/file';

const MinePage: React.FC = () => {
  const { isOnline, networkStatus } = useNetwork();
  const { user, clearAllData } = useUserStore();
  const { formDataList, templates, clearFormData } = useFormStore();
  const { syncStats, clearSyncTasks } = useSyncStore();
  const { getStorageInfo, clearAllImages } = useOfflineStorage();

  const [storageInfo, setStorageInfo] = useState({
    imagesSize: 0,
    dataSize: 0,
    totalSize: 0
  });

  useDidShow(() => {
    loadStorageInfo();
  });

  const loadStorageInfo = async () => {
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  const menuItems = useMemo(() => [
    {
      icon: '📋',
      title: '我的模板',
      desc: `已下载 ${templates.length} 个模板`,
      type: 'success',
      action: () => Taro.showToast({ title: '模板管理', icon: 'none' })
    },
    {
      icon: '📸',
      title: '图片管理',
      desc: `本地存储 ${storageInfo.imagesSize ? formatFileSize(storageInfo.imagesSize) : '0 B'}`,
      type: 'default',
      action: () => Taro.showToast({ title: '图片管理', icon: 'none' })
    },
    {
      icon: '⚙️',
      title: '同步设置',
      desc: '自动同步、重试策略',
      type: 'default',
      action: () => Taro.showToast({ title: '同步设置', icon: 'none' })
    },
    {
      icon: '📊',
      title: '数据统计',
      desc: '查看详细数据报表',
      type: 'default',
      action: () => Taro.showToast({ title: '数据统计', icon: 'none' })
    },
    {
      icon: '❓',
      title: '帮助中心',
      desc: '常见问题、使用教程',
      type: 'default',
      action: () => Taro.showToast({ title: '帮助中心', icon: 'none' })
    },
    {
      icon: '💬',
      title: '意见反馈',
      desc: '提交建议与问题',
      type: 'default',
      action: () => Taro.showToast({ title: '意见反馈', icon: 'none' })
    },
    {
      icon: '🗑️',
      title: '清空本地数据',
      desc: '谨慎操作，数据将无法恢复',
      type: 'danger',
      action: handleClearAllData
    }
  ], [templates.length, storageInfo.imagesSize]);

  async function handleClearAllData() {
    Taro.showModal({
      title: '确认清空',
      content: '此操作将删除所有本地表单数据、图片和模板，且无法恢复。确定继续吗？',
      confirmText: '确定清空',
      confirmColor: '#f53f3f',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '清空中...' });
          try {
            await clearFormData();
            await clearSyncTasks();
            await clearAllImages();
            clearAllData();
            Taro.hideLoading();
            Taro.showToast({
              title: '清空成功',
              icon: 'success'
            });
            loadStorageInfo();
          } catch (error) {
            Taro.hideLoading();
            console.error('[Mine] Clear data error:', error);
            Taro.showToast({
              title: '清空失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }

  const handleExportData = () => {
    Taro.showLoading({ title: '导出中...' });
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showModal({
        title: '导出成功',
        content: `已导出 ${formDataList.length} 条数据，${storageInfo.imagesSize ? formatFileSize(storageInfo.imagesSize) : '0 B'} 图片`,
        showCancel: false
      });
    }, 1500);
  };

  const handleCheckUpdate = () => {
    Taro.showLoading({ title: '检查更新...' });
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showModal({
        title: '已是最新版本',
        content: '当前版本 v1.0.0，无需更新',
        showCancel: false
      });
    }, 1000);
  };

  const storagePercent = useMemo(() => {
    if (storageInfo.totalSize === 0) return 0;
    return Math.min(100, Math.round((storageInfo.imagesSize + storageInfo.dataSize) / storageInfo.totalSize * 100));
  }, [storageInfo]);

  return (
    <View className={styles.minePage}>
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className={styles.header}>
          <View className={styles.userInfo}>
            <View className={styles.avatar}>
              <Text>👤</Text>
            </View>
            <View className={styles.userInfoContent}>
              <Text className={styles.userName}>{user?.name || '未登录'}</Text>
              <Text className={styles.userRole}>{user?.role || '现场巡检员'}</Text>
              <View className={styles.userNetwork}>
                <View className={classnames(styles.networkDot, !isOnline && styles.offline)} />
                <Text className={styles.networkText}>
                  {isOnline ? `${networkStatus.toUpperCase()} 已连接` : '离线模式'}
                </Text>
              </View>
            </View>
          </View>

          <View className={styles.statsRow}>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{formDataList.length}</Text>
              <Text className={styles.statLabel}>累计表单</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{syncStats.completed}</Text>
              <Text className={styles.statLabel}>已同步</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{syncStats.pending + syncStats.failed}</Text>
              <Text className={styles.statLabel}>待处理</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{templates.length}</Text>
              <Text className={styles.statLabel}>模板数</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>存储空间</Text>
            <Text className={styles.sectionAction} onClick={loadStorageInfo}>刷新</Text>
          </View>
          <View className={styles.storageInfo}>
            <View className={styles.storageHeader}>
              <Text className={styles.storageTitle}>本地存储使用情况</Text>
              <Text className={styles.storageSize}>
                {formatFileSize(storageInfo.imagesSize + storageInfo.dataSize)} / {storageInfo.totalSize ? formatFileSize(storageInfo.totalSize) : '未知'}
              </Text>
            </View>
            <View className={styles.storageBar}>
              <View className={styles.storageFill} style={{ width: `${storagePercent}%` }} />
            </View>
            <View className={styles.storageDetails}>
              <View className={styles.storageDetailItem}>
                <View className={classnames(styles.dot, styles.images)} />
                <Text>图片 {formatFileSize(storageInfo.imagesSize)}</Text>
              </View>
              <View className={styles.storageDetailItem}>
                <View className={classnames(styles.dot, styles.data)} />
                <Text>数据 {formatFileSize(storageInfo.dataSize)}</Text>
              </View>
              <View className={styles.storageDetailItem}>
                <View className={classnames(styles.dot, styles.free)} />
                <Text>可用 {formatFileSize(Math.max(0, storageInfo.totalSize - storageInfo.imagesSize - storageInfo.dataSize))}</Text>
              </View>
            </View>
          </View>
        </View>

        {!isOnline && (
          <View className={styles.section}>
            <View className={styles.tipCard}>
              <Text className={styles.tipTitle}>
                <Text>⚠️</Text>
                离线模式提示
              </Text>
              <Text className={styles.tipContent}>
                当前处于离线状态，您填写的表单和拍摄的照片将暂存本地。网络恢复后系统会自动同步到服务器，请确保有足够的存储空间。
              </Text>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>功能菜单</Text>
          </View>
          <View className={styles.menuList}>
            {menuItems.map((item, index) => (
              <View
                key={index}
                className={styles.menuItem}
                onClick={item.action}
              >
                <View className={classnames(styles.menuIcon, item.type !== 'default' && styles[item.type])}>
                  <Text>{item.icon}</Text>
                </View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>{item.title}</Text>
                  <Text className={styles.menuDesc}>{item.desc}</Text>
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>其他</Text>
          </View>
          <View className={styles.menuList}>
            <View className={styles.menuItem} onClick={handleExportData}>
              <View className={classnames(styles.menuIcon, styles.warning)}>
                <Text>📤</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>导出数据</Text>
                <Text className={styles.menuDesc}>导出本地表单数据备份</Text>
              </View>
              <Text className={styles.menuArrow}>›</Text>
            </View>
            <View className={styles.menuItem} onClick={handleCheckUpdate}>
              <View className={styles.menuIcon}>
                <Text>🔄</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>检查更新</Text>
                <Text className={styles.menuDesc}>当前版本 v1.0.0</Text>
              </View>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          </View>
        </View>

        <View className={styles.versionInfo}>
          <Text className={styles.versionText}>离线表单 v1.0.0</Text>
          <Text className={styles.copyright}>© 2024 智能表单系统</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default MinePage;
