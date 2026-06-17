import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useNetwork } from '@/hooks/useNetwork';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import dayjs from 'dayjs';
import type { FormTemplate, FieldType } from '@/types';

const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: '📝',
  textarea: '📄',
  number: '🔢',
  select: '📋',
  radio: '🔘',
  checkbox: '☑️',
  date: '📅',
  time: '⏰',
  image: '📸',
  location: '📍'
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  select: '下拉选择',
  radio: '单选',
  checkbox: '多选',
  date: '日期',
  time: '时间',
  image: '图片',
  location: '位置'
};

const TemplateDetailPage: React.FC = () => {
  const router = useRouter();
  const templateId = router.params.id as string;

  const { isOnline } = useNetwork();
  const { templates, setCurrentTemplate, createNewForm, loadTemplates } = useFormStore();
  const { downloadTemplate, deleteTemplate, getStorageInfo } = useOfflineStorage();

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  useDidShow(() => {
    loadTemplates();
    if (templateId) {
      const foundTemplate = templates.find((t) => t.id === templateId);
      setTemplate(foundTemplate || null);
    }
  });

  const fieldStats = useMemo(() => {
    if (!template) return { total: 0, required: 0, optional: 0 };
    const fields = template.fields;
    return {
      total: fields.length,
      required: fields.filter((f) => f.required).length,
      optional: fields.filter((f) => !f.required).length
    };
  }, [template]);

  const handleDownload = async () => {
    if (!template) return;
    if (!isOnline) {
      Taro.showToast({
        title: '无网络，无法下载',
        icon: 'none'
      });
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await downloadTemplate(template.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownloadProgress(100);

      Taro.showToast({
        title: '下载成功',
        icon: 'success'
      });

      loadTemplates();
      const updatedTemplate = templates.find((t) => t.id === templateId);
      setTemplate(updatedTemplate || null);
    } catch (error) {
      console.error('[TemplateDetail] Download error:', error);
      Taro.showToast({
        title: '下载失败',
        icon: 'none'
      });
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
      }, 500);
    }
  };

  const handleDelete = () => {
    if (!template) return;
    Taro.showModal({
      title: '确认删除',
      content: '删除后需要重新下载才能使用该模板，确定继续吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteTemplate(template.id);
            loadTemplates();
            Taro.showToast({
              title: '删除成功',
              icon: 'success'
            });
            setTimeout(() => {
              Taro.navigateBack();
            }, 1000);
          } catch (error) {
            console.error('[TemplateDetail] Delete error:', error);
            Taro.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  };

  const handleStartFill = () => {
    if (!template) return;
    if (!template.downloaded) {
      Taro.showToast({
        title: '请先下载模板',
        icon: 'none'
      });
      return;
    }

    setCurrentTemplate(template);
    const newForm = createNewForm(template.id);
    if (newForm) {
      Taro.switchTab({
        url: '/pages/formFill/index'
      });
    } else {
      Taro.showToast({
        title: '创建表单失败',
        icon: 'none'
      });
    }
  };

  const getFieldPlaceholder = (field: any) => {
    if (field.options && field.options.length > 0) {
      return `选项：${field.options.slice(0, 3).join('、')}${field.options.length > 3 ? '...' : ''}`;
    }
    if (field.placeholder) {
      return field.placeholder;
    }
    if (field.maxLength) {
      return `最多 ${field.maxLength} 字符`;
    }
    if (field.min !== undefined || field.max !== undefined) {
      return `范围：${field.min ?? '无限制'} ~ ${field.max ?? '无限制'}`;
    }
    return '点击填写';
  };

  if (!template) {
    return (
      <View className={styles.templateDetail}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📋</Text>
          <Text className={styles.emptyText}>模板不存在</Text>
          <Text className={styles.emptySubText}>请返回列表重新选择</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.templateDetail}>
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className={styles.header}>
          <View className={styles.headerTop}>
            <View className={styles.templateIcon}>
              <Text>{template.icon || '📋'}</Text>
            </View>
            <View className={styles.templateInfo}>
              <Text className={styles.templateName}>{template.name}</Text>
              <View className={styles.templateCategory}>{template.category}</View>
              <Text className={styles.templateDesc}>{template.description}</Text>

              <View className={styles.downloadStatus}>
                <View className={classnames(styles.statusDot, !template.downloaded && styles.notDownloaded)} />
                <Text className={styles.statusText}>
                  {template.downloaded
                    ? template.downloadAt
                      ? `已下载 · ${dayjs(template.downloadAt).format('MM-DD HH:mm')}`
                      : '已下载'
                    : '未下载'}
                </Text>
              </View>
            </View>
          </View>

          <View className={styles.templateStats}>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{fieldStats.total}</Text>
              <Text className={styles.statLabel}>总字段</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{fieldStats.required}</Text>
              <Text className={styles.statLabel}>必填项</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{fieldStats.optional}</Text>
              <Text className={styles.statLabel}>选填项</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>v{template.version}</Text>
              <Text className={styles.statLabel}>版本</Text>
            </View>
          </View>
        </View>

        {downloading && (
          <View className={styles.section}>
            <View className={styles.downloadProgress}>
              <View className={styles.progressHeader}>
                <Text className={styles.progressTitle}>正在下载模板...</Text>
                <Text className={styles.progressPercent}>{downloadProgress}%</Text>
              </View>
              <View className={styles.progressBar}>
                <View className={styles.progressFill} style={{ width: `${downloadProgress}%` }} />
              </View>
              <Text className={styles.progressText}>
                {downloadProgress < 100 ? '正在获取模板数据...' : '下载完成！'}
              </Text>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>字段预览</Text>
            <Text className={styles.sectionCount}>{fieldStats.total} 个字段</Text>
          </View>

          <View className={styles.fieldsPreview}>
            {template.fields.map((field, index) => (
              <View key={field.id} className={styles.fieldPreviewItem}>
                <View className={classnames(styles.fieldIcon, field.required && styles.required)}>
                  <View className={styles.fieldTypeIcon}>
                    <Text>{FIELD_TYPE_ICONS[field.type]}</Text>
                  </View>
                </View>
                <View className={styles.fieldContent}>
                  <View className={styles.fieldLabel}>
                    {field.required && <Text className={styles.requiredMark}>*</Text>}
                    <Text>{index + 1}. {field.label}</Text>
                  </View>
                  <Text className={styles.fieldDesc}>{getFieldPlaceholder(field)}</Text>
                </View>
                <View className={styles.fieldTypeTag}>
                  {FIELD_TYPE_LABELS[field.type]}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>模板信息</Text>
          </View>
          <View className={styles.templateMeta}>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>模板编号</Text>
              <Text className={styles.metaValue}>{template.id}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>所属分类</Text>
              <Text className={styles.metaValue}>{template.category}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>当前版本</Text>
              <Text className={styles.metaValue}>v{template.version}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>创建时间</Text>
              <Text className={styles.metaValue}>{dayjs(template.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
            </View>
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>更新时间</Text>
              <Text className={styles.metaValue}>{dayjs(template.updatedAt).format('YYYY-MM-DD HH:mm')}</Text>
            </View>
            {template.downloadAt && (
              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>下载时间</Text>
                <Text className={styles.metaValue}>{dayjs(template.downloadAt).format('YYYY-MM-DD HH:mm')}</Text>
              </View>
            )}
          </View>
        </View>

        {!template.downloaded && (
          <View className={styles.section}>
            <View className={styles.tipCard}>
              <Text className={styles.tipTitle}>
                <Text>💡</Text>
                使用提示
              </Text>
              <View className={styles.tipContent}>
                <Text className={styles.tipItem}>1. 下载模板后可在离线状态下填写</Text>
                <Text className={styles.tipItem}>2. 填写的数据会自动保存在本地</Text>
                <Text className={styles.tipItem}>3. 网络恢复后会自动同步到服务器</Text>
                <Text className={styles.tipItem}>4. 已下载的模板支持删除后重新下载</Text>
              </View>
            </View>
          </View>
        )}

        {template.downloaded && !isOnline && (
          <View className={styles.section}>
            <View className={styles.tipCard}>
              <Text className={styles.tipTitle}>
                <Text>📶</Text>
                离线模式
              </Text>
              <View className={styles.tipContent}>
                <Text className={styles.tipItem}>当前处于离线状态，您可以正常填写表单</Text>
                <Text className={styles.tipItem}>填写的数据会保存在本地，联网后自动同步</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View className={styles.bottomBar}>
        {!template.downloaded ? (
          <View
            className={classnames(styles.bottomBtn, styles.primary, (!isOnline || downloading) && styles.disabled)}
            onClick={handleDownload}
          >
            <Text>{downloading ? `下载中 ${downloadProgress}%` : '下载模板'}</Text>
          </View>
        ) : (
          <>
            <View className={classnames(styles.bottomBtn, styles.danger)} onClick={handleDelete}>
              <Text>删除模板</Text>
            </View>
            <View className={classnames(styles.bottomBtn, styles.primary)} onClick={handleStartFill}>
              <Text>开始填写</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default TemplateDetailPage;
