import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useFormStore } from '@/store/useFormStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetwork } from '@/hooks/useNetwork';
import FormField from '@/components/FormField';
import NetworkStatus from '@/components/NetworkStatus';
import { validateForm } from '@/utils/validator';
import { formTracker } from '@/utils/formTracker';
import dayjs from 'dayjs';
import type { FormTemplate, FormField as FormFieldType, ValidationResult } from '@/types';

const FormFillPage: React.FC = () => {
  const { networkStatus, isOnline } = useNetwork();
  const {
    templates,
    currentForm,
    currentTemplate,
    setCurrentTemplate,
    createNewForm,
    updateField,
    saveDraft,
    submitForm,
    loadTemplates,
    loadFormData
  } = useFormStore();
  const { refreshStats } = useSyncStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const downloadedTemplates = useMemo(() => {
    return templates.filter((t: FormTemplate) => t.downloaded);
  }, [templates]);

  useDidShow(() => {
    loadTemplates();
    loadFormData();
    const session = formTracker.getCurrentSession();
    if (session) {
      setElapsedTime(formTracker.getElapsedTime());
    }
  });

  useDidHide(() => {
    if (currentForm) {
      saveDraft();
      formTracker.trackFieldBlur();
      console.log('[FormFill] Draft saved on page hide');
    }
  });

  const handleSelectTemplate = (template: FormTemplate) => {
    setCurrentTemplate(template);
    const newForm = createNewForm(template.id);
    setErrors({});
    setElapsedTime(0);

    if (newForm) {
      formTracker.startForm(
        newForm.id,
        template.id,
        template.name,
        networkStatus
      );
    }
  };

  const handleFieldFocus = useCallback((field: FormFieldType) => {
    formTracker.trackFieldFocus(field.id, field.label, field.type);
  }, []);

  const handleFieldBlur = useCallback(() => {
    formTracker.trackFieldBlur();
  }, []);

  const handleFieldChange = (fieldId: string, value: string | string[] | number) => {
    updateField(fieldId, value);
    formTracker.trackFieldEdit(fieldId, value);

    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const showValidationError = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

  const handleSaveDraft = () => {
    if (!currentForm) {
      Taro.showToast({
        title: '请先选择表单模板',
        icon: 'none'
      });
      return;
    }

    try {
      saveDraft();
      refreshStats();
      Taro.showToast({
        title: '暂存成功',
        icon: 'success'
      });
      console.log('[FormFill] Draft saved successfully');
    } catch (error) {
      console.error('[FormFill] Save draft error:', error);
      Taro.showToast({
        title: '暂存失败',
        icon: 'none'
      });
    }
  };

  const handleSubmit = () => {
    if (!currentForm || !currentTemplate) {
      Taro.showToast({
        title: '请先选择表单模板',
        icon: 'none'
      });
      return;
    }

    const validation: ValidationResult = validateForm(
      currentTemplate.fields,
      currentForm.fields
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      showValidationError(firstError);

      Object.entries(validation.errors).forEach(([fieldId, errorMsg]) => {
        formTracker.trackFieldError(fieldId, errorMsg);
      });

      console.error('[FormFill] Validation failed:', validation.errors);
      return;
    }

    try {
      submitForm();
      refreshStats();
      formTracker.completeForm();

      Taro.showModal({
        title: '提交成功',
        content: isOnline ? '表单已提交，正在同步...' : '表单已暂存，联网后将自动同步',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          setCurrentTemplate(null);
          Taro.switchTab({
            url: '/pages/home/index'
          });
        }
      });

      console.log('[FormFill] Form submitted successfully');
    } catch (error) {
      console.error('[FormFill] Submit error:', error);
      Taro.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  };

  const renderTemplateSelector = () => (
    <View className={styles.templateSelector}>
      <Text className={styles.selectorTitle}>选择表单模板</Text>
      <Text className={styles.selectorDesc}>
        请从已下载的模板中选择要填写的表单
      </Text>

      {downloadedTemplates.length > 0 ? (
        <View className={styles.templateList}>
          {downloadedTemplates.map((template: FormTemplate) => (
            <View
              key={template.id}
              className={classnames(
                styles.templateOption,
                currentTemplate?.id === template.id && styles.selected
              )}
              onClick={() => handleSelectTemplate(template)}
            >
              <View className={styles.optionIcon}>
                <Text>{template.icon || '📋'}</Text>
              </View>
              <View className={styles.optionInfo}>
                <Text className={styles.optionName}>{template.name}</Text>
                <Text className={styles.optionFields}>
                  {template.fields.length} 个字段 · {template.version}
                </Text>
              </View>
              <View
                className={classnames(
                  styles.optionCheck,
                  currentTemplate?.id === template.id && styles.checked
                )}
              />
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📥</Text>
          <Text className={styles.emptyText}>暂无已下载的模板</Text>
          <Text className={styles.emptySubText}>请先到任务大厅下载表单模板</Text>
          <View
            className={styles.startBtn}
            onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
          >
            <Text>去下载</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderFormContent = () => (
    <>
      <View className={styles.pageHeader}>
        <View className={styles.templateInfo}>
          <View className={styles.templateIcon}>
            <Text>{currentTemplate?.icon || '📋'}</Text>
          </View>
          <View className={styles.templateMeta}>
            <Text className={styles.templateName}>{currentTemplate?.name}</Text>
            <Text className={styles.templateDesc}>{currentTemplate?.description}</Text>
          </View>
        </View>
        <View className={styles.formInfoRow}>
          <View className={styles.formInfoItem}>
            <Text className={styles.label}>字段数：</Text>
            <Text className={styles.value}>{currentTemplate?.fields.length || 0}</Text>
          </View>
          <View className={styles.formInfoItem}>
            <Text className={styles.label}>版本：</Text>
            <Text className={styles.value}>{currentTemplate?.version}</Text>
          </View>
          <View className={styles.formInfoItem}>
            <Text className={styles.label}>创建时间：</Text>
            <Text className={styles.value}>
              {dayjs(currentForm?.createdAt).format('MM-DD HH:mm')}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.formContent}>
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>表单内容</Text>
          {currentTemplate?.fields.map((field: FormFieldType) => (
            <FormField
              key={field.id}
              field={field}
              value={currentForm?.fields[field.id] || ''}
              error={errors[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              onFocus={() => handleFieldFocus(field)}
              onBlur={handleFieldBlur}
            />
          ))}
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={classnames(styles.btn, styles.draft)} onClick={handleSaveDraft}>
          <Text>暂存</Text>
        </View>
        <View className={classnames(styles.btn, styles.submit)} onClick={handleSubmit}>
          <Text>{isOnline ? '提交' : '提交（离线）'}</Text>
        </View>
      </View>
    </>
  );

  return (
    <View className={styles.formFillPage}>
      {!isOnline && (
        <View className={styles.offlineBanner}>
          <NetworkStatus status={networkStatus} />
          <Text className={styles.offlineText}>当前处于离线模式，数据将暂存本地</Text>
        </View>
      )}

      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
      >
        {!currentTemplate ? renderTemplateSelector() : renderFormContent()}
      </ScrollView>

      {showError && (
        <View className={styles.errorToast}>
          <Text>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
};

export default FormFillPage;
