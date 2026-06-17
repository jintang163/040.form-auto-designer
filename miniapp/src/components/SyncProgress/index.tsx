import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { SyncStats } from '@/types';

interface SyncProgressProps {
  stats: SyncStats;
  progress?: number;
  showDetails?: boolean;
}

const SyncProgress: React.FC<SyncProgressProps> = ({ stats, progress = 0, showDetails = true }) => {
  const totalToSync = stats.pending + stats.syncing + stats.failed;
  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <View className={styles.syncProgress}>
      <View className={styles.header}>
        <Text className={styles.title}>同步状态</Text>
        <Text className={styles.percentage}>{percentage}%</Text>
      </View>

      <View className={styles.progressBar}>
        <View
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
        />
      </View>

      {showDetails && (
        <View className={styles.stats}>
          <View className={styles.statItem}>
            <View className={classnames(styles.dot, styles.completed)} />
            <Text className={styles.statLabel}>已完成</Text>
            <Text className={styles.statValue}>{stats.completed}</Text>
          </View>
          <View className={styles.statItem}>
            <View className={classnames(styles.dot, styles.pending)} />
            <Text className={styles.statLabel}>待同步</Text>
            <Text className={styles.statValue}>{totalToSync}</Text>
          </View>
          <View className={styles.statItem}>
            <View className={classnames(styles.dot, styles.failed)} />
            <Text className={styles.statLabel}>失败</Text>
            <Text className={styles.statValue}>{stats.failed}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default SyncProgress;
