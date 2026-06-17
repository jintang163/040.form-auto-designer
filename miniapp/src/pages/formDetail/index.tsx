import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetwork } from '@/hooks/useNetwork';
import StatusBadge from '@/components/StatusBadge';
import dayjs from 'dayjs';
import type { FormData, FormField, FormImage } from '@/types';

const FormDetailPage: React.FC = () => {
  const router = useRouter();
  const formId = router.params.id as string;

  const { isOnline } = useNetwork();
  const { formDataList, templates, getFormById, deleteForm, loadFormData } = useFormStore();
  const { retrySync } = useSyncStore();

  const [form, setForm] = useState<FormData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadFormData();
  }, []);

  useDidShow(() => {
    loadFormData();
    if (formId) {
      const foundForm = getFormById(formId);
      setForm(foundForm || null);
    }
  });

  const template = useMemo(() => {
    if (!form) return null;
    return templates.find((t) => t.id === form.templateId) || null;
  }, [form, templates]);

  const getFieldValue = (field: FormField) => {
    if (!form) return '';
    const value = form.fields[field.id];
    if (value === undefined || value === null || value === '') {
      return '未填写';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join('、') : '未填写';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return value;
  };

  const getFieldImages = (fieldId: string): FormImage[] => {
    if (!form) return [];
    return form.images.filter((img) => img.fieldId === fieldId);
  };

  const getFieldTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      text: '文本',
      textarea: '多行文本',
      number: '数字',
      select: '单选',
      radio: '单选',
      checkbox: '多选',
      date: '日期',
      time: '时间',
      image: '图片',
      location: '位置'
    };
    return map[type] || type;
  };

  const handleRetry = async () => {
    if (!form) return;
    if (!isOnline) {
      Taro.showToast({
        title: '当前无网络连接',
        icon: 'none'
      });
      return;
    }

    Taro.showLoading({ title: '重试中...' });
    try {
      const success = await retrySync(form.id);
      Taro.hideLoading();
      if (success) {
        Taro.showToast({
          title: '同步成功',
          icon: 'success'
        });
        const updatedForm = getFormById(form.id);
        setForm(updatedForm || null);
      } else {
        Taro.showToast({
          title: '同步失败',
          icon: 'none'
        });
      }
    } catch (error) {
      Taro.hideLoading();
      console.error('[FormDetail] Retry error:', error);
      Taro.showToast({
        title: '同步失败',
        icon: 'none'
      });
    }
  };

  const handleDelete = () => {
    if (!form) return;
    Taro.showModal({
      title: '确认删除',
      content: '删除后数据将无法恢复，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          try {
            deleteForm(form.id);
            Taro.showToast({
              title: '删除成功',
              icon: 'success'
            });
            setTimeout(() => {
              Taro.navigateBack();
            }, 1000);
          } catch (error) {
            console.error('[FormDetail] Delete error:', error);
            Taro.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  };

  const handlePreviewImage = (imagePath: string) => {
    setPreviewImage(imagePath);
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  const timelineEvents = useMemo(() => {
    if (!form) return [];
    const events = [];

    events.push({
      status: 'success' as const,
      title: '表单创建',
      time: form.createdAt,
      desc: '表单数据已保存到本地'
    });

    if (form.submittedAt) {
      events.push({
        status: 'success' as const,
        title: '表单提交',
        time: form.submittedAt,
        desc: '表单已提交，等待同步'
      });
    }

    if (form.syncStatus === 'syncing') {
      events.push({
        status: 'syncing' as const,
        title: '正在同步',
        time: form.updatedAt,
        desc: '数据正在上传到服务器...'
      });
    }

    if (form.syncStatus === 'completed' && form.syncedAt) {
      events.push({
        status: 'success' as const,
        title: '同步完成',
        time: form.syncedAt,
        desc: '数据已成功同步到服务器'
      });
    }

    if (form.syncStatus === 'failed') {
      events.push({
        status: 'failed' as const,
        title: '同步失败',
        time: form.updatedAt,
        desc: form.errorMessage || '未知错误，请重试'
      });
    }

    if (form.syncStatus === 'pending') {
      events.push({
        status: 'pending' as const,
        title: '等待同步',
        time: form.updatedAt,
        desc: isOnline ? '网络连接正常，即将开始同步' : '网络连接中断，等待网络恢复后自动同步'
      });
    }

    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [form, isOnline]);

  if (!form) {
    return (
      <View className={styles.formDetail}>
        <View style={{ padding: '160rpx 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '80rpx', opacity: 0.3 }}>📄</Text>
          <Text style={{ display: 'block', fontSize: '$font-size-lg', color: '$color-text-secondary', marginTop: '32rpx' }}>
            表单不存在
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.formDetail}>
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className={styles.header}>
          <View className={styles.headerTop}>
            <Text className={styles.formTitle}>{form.templateName}</Text>
            <StatusBadge status={form.syncStatus} size="md" />
          </View>

          <View className={styles.formMeta}>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>表单编号：</Text>
              <Text className={styles.metaValue}>{form.id}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>创建时间：</Text>
              <Text className={styles.metaValue}>{dayjs(form.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>更新时间：</Text>
              <Text className={styles.metaValue}>{dayjs(form.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </View>
          </View>

          <View className={styles.formStats}>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{template?.fields.length || 0}</Text>
              <Text className={styles.statLabel}>字段数</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{Object.keys(form.fields).filter((k) => form.fields[k] !== '').length}</Text>
              <Text className={styles.statLabel}>已填写</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{form.images.length}</Text>
              <Text className={styles.statLabel}>图片</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{form.retryCount || 0}/3</Text>
              <Text className={styles.statLabel}>重试</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>表单内容</Text>
            <Text className={styles.sectionCount}>{template?.fields.length || 0} 个字段</Text>
          </View>

          <View className={styles.fieldsList}>
            {template?.fields.map((field) => {
              const fieldImages = getFieldImages(field.id);
              return (
                <View key={field.id} className={styles.fieldItem}>
                  <View className={styles.fieldHeader}>
                    <View className={styles.fieldLabel}>
                      {field.required && <Text className={styles.required}>*</Text>}
                      <Text>{field.label}</Text>
                    </View>
                    <View className={styles.fieldType}>{getFieldTypeLabel(field.type)}</View>
                  </View>

                  {field.type !== 'image' && (
                    <View className={classnames(styles.fieldValue, getFieldValue(field) === '未填写' && styles.empty)}>
                      {getFieldValue(field)}
                    </View>
                  )}

                  {field.type === 'image' && (
                    fieldImages.length > 0 ? (
                      <View className={styles.imageList}>
                        {fieldImages.map((img) => (
                          <View
                            key={img.id}
                            className={styles.imageItem}
                            onClick={() => handlePreviewImage(img.localPath)}
                          >
                            <Image
                              src={img.localPath}
                              mode="aspectFill"
                              className={styles.image}
                            />
                            <View className={styles.imageOverlay}>
                              <Text className={styles.imageName}>{img.name}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className={classnames(styles.fieldValue, styles.empty)}>未上传图片</View>
                    )
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {form.location && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>位置信息</Text>
            </View>
            <View className={styles.syncInfo}>
              <View className={styles.syncInfoRow}>
                <Text className={styles.syncLabel}>经度</Text>
                <Text className={styles.syncValue}>{form.location.longitude.toFixed(6)}</Text>
              </View>
              <View className={styles.syncInfoRow}>
                <Text className={styles.syncLabel}>纬度</Text>
                <Text className={styles.syncValue}>{form.location.latitude.toFixed(6)}</Text>
              </View>
              {form.location.address && (
                <View className={styles.syncInfoRow}>
                  <Text className={styles.syncLabel}>地址</Text>
                  <Text className={styles.syncValue}>{form.location.address}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>同步信息</Text>
          </View>
          <View className={styles.syncInfo}>
            <View className={styles.syncInfoRow}>
              <Text className={styles.syncLabel}>同步状态</Text>
              <Text className={styles.syncValue}>
                {form.syncStatus === 'pending' && '等待同步'}
                {form.syncStatus === 'syncing' && '同步中'}
                {form.syncStatus === 'completed' && '已完成'}
                {form.syncStatus === 'failed' && '同步失败'}
              </Text>
            </View>
            <View className={styles.syncInfoRow}>
              <Text className={styles.syncLabel}>提交时间</Text>
              <Text className={styles.syncValue}>{form.submittedAt ? dayjs(form.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '未提交'}</Text>
            </View>
            <View className={styles.syncInfoRow}>
              <Text className={styles.syncLabel}>同步时间</Text>
              <Text className={styles.syncValue}>{form.syncedAt ? dayjs(form.syncedAt).format('YYYY-MM-DD HH:mm:ss') : '未同步'}</Text>
            </View>
            <View className={styles.syncInfoRow}>
              <Text className={styles.syncLabel}>重试次数</Text>
              <Text className={styles.syncValue}>{form.retryCount || 0} 次</Text>
            </View>
          </View>

          {form.errorMessage && (
            <View className={styles.errorMessage}>
              <Text className={styles.errorTitle}>错误信息</Text>
              <Text className={styles.errorContent}>{form.errorMessage}</Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>操作记录</Text>
          </View>
          <View className={styles.timeline}>
            {timelineEvents.map((event, index) => (
              <View key={index} className={styles.timelineItem}>
                <View className={classnames(styles.timelineDot, event.status)} />
                <View className={styles.timelineLine} />
                <View className={styles.timelineContent}>
                  <Text className={styles.timelineTitle}>{event.title}</Text>
                  <Text className={styles.timelineTime}>{dayjs(event.time).format('YYYY-MM-DD HH:mm:ss')}</Text>
                  <Text className={styles.timelineDesc}>{event.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        {form.syncStatus === 'failed' && (
          <View
            className={classnames(styles.bottomBtn, styles.primary, !isOnline && styles.disabled)}
            onClick={handleRetry}
          >
            <Text>重试同步</Text>
          </View>
        )}
        <View className={classnames(styles.bottomBtn, styles.danger)} onClick={handleDelete}>
          <Text>删除</Text>
        </View>
      </View>

      {previewImage && (
        <View className={styles.previewMask} onClick={handleClosePreview}>
          <Image src={previewImage} mode="aspectFit" className={styles.previewImage} />
          <View className={styles.closeBtn} onClick={handleClosePreview}>
            <Text>✕</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default FormDetailPage;
