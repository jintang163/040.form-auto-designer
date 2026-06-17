import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { NetworkStatus as NetworkStatusType } from '@/types';

interface NetworkStatusProps {
  status: NetworkStatusType;
  showLabel?: boolean;
}

const statusConfig = {
  online: { label: '在线', color: '#00b42a', bgColor: 'rgba(0, 180, 42, 0.1)' },
  offline: { label: '离线', color: '#86909c', bgColor: 'rgba(134, 144, 156, 0.1)' },
  unknown: { label: '未知', color: '#86909c', bgColor: 'rgba(134, 144, 156, 0.1)' }
};

const NetworkStatus: React.FC<NetworkStatusProps> = ({ status, showLabel = true }) => {
  const config = statusConfig[status];

  return (
    <View className={styles.networkStatus}>
      <View
        className={classnames(styles.dot, styles[status])}
        style={{ backgroundColor: config.color }}
      />
      {showLabel && <Text className={styles.label} style={{ color: config.color }}>{config.label}</Text>}
    </View>
  );
};

export default NetworkStatus;
