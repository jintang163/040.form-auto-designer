import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { TaskStatus, SyncStatus } from '@/types';

type StatusType = TaskStatus | SyncStatus;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: { label: '待同步', className: 'pending' },
  in_progress: { label: '填写中', className: 'syncing' },
  syncing: { label: '同步中', className: 'syncing' },
  completed: { label: '已完成', className: 'completed' },
  failed: { label: '失败', className: 'failed' }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || { label: status, className: 'pending' };

  return (
    <View className={classnames(styles.statusBadge, styles[config.className], styles[size])}>
      <Text className={styles.text}>{config.label}</Text>
    </View>
  );
};

export default StatusBadge;
