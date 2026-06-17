import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusBadge from '../StatusBadge';
import dayjs from 'dayjs';
import type { FormData } from '@/types';

interface TaskCardProps {
  formData: FormData;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ formData, onClick }) => {
  const fieldCount = Object.keys(formData.fields).length;
  const imageCount = formData.images?.length || 0;

  return (
    <View className={styles.taskCard} onClick={onClick}>
      <View className={styles.header}>
        <Text className={styles.title}>{formData.templateName}</Text>
        <StatusBadge status={formData.syncStatus} size="sm" />
      </View>

      <View className={styles.meta}>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>字段数</Text>
          <Text className={styles.metaValue}>{fieldCount}</Text>
        </View>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>图片</Text>
          <Text className={styles.metaValue}>{imageCount}</Text>
        </View>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>重试</Text>
          <Text className={styles.metaValue}>{formData.retryCount || 0}</Text>
        </View>
      </View>

      {formData.errorMessage && (
        <View className={styles.errorBox}>
          <Text className={styles.errorText}>{formData.errorMessage}</Text>
        </View>
      )}

      <View className={styles.footer}>
        <Text className={styles.time}>
          {dayjs(formData.updatedAt).format('YYYY-MM-DD HH:mm')}
        </Text>
        <View className={styles.arrow}>
          <Text className={styles.arrowText}>›</Text>
        </View>
      </View>
    </View>
  );
};

export default TaskCard;
