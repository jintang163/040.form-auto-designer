import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { i18nApi } from '@/services/api';
import type { I18nContextType, LanguageCode } from '@/types';
import { LANGUAGE_OPTIONS } from '@/types';

const STORAGE_KEY = 'app_language';

const defaultI18nLabels: Record<string, Record<string, string>> = {
  'zh-CN': {
    submit: '提交',
    cancel: '取消',
    save: '保存',
    confirm: '确认',
    reset: '重置',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    close: '关闭',
    loading: '加载中...',
    required: '此项为必填项',
    formTitle: '表单标题',
    formDescription: '表单描述',
    fieldRequired: '字段必填',
  },
  'en-US': {
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    reset: 'Reset',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    close: 'Close',
    loading: 'Loading...',
    required: 'This field is required',
    formTitle: 'Form Title',
    formDescription: 'Form Description',
    fieldRequired: 'Field is required',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as LanguageCode) || 'zh-CN';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    setTranslations(defaultI18nLabels[language] || {});
  }, [language]);

  const loadTranslations = useCallback(async (templateId: string, targetLanguage?: LanguageCode) => {
    const lang = targetLanguage || language;
    try {
      setCurrentTemplateId(templateId);
      const templateTranslations = await i18nApi.getTranslations(templateId, lang);
      setTranslations((prev) => ({
        ...prev,
        ...templateTranslations,
      }));
    } catch (error) {
      console.warn('Failed to load translations:', error);
    }
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (currentTemplateId) {
      loadTranslations(currentTemplateId, lang);
    }
    message.success(lang === 'zh-CN' ? '已切换到中文' : 'Switched to English');
  }, [currentTemplateId, loadTranslations]);

  const translate = useCallback(
    (key: string, defaultValue?: string) => {
      if (translations[key]) {
        return translations[key];
      }
      if (defaultValue) {
        return defaultValue;
      }
      return key;
    },
    [translations]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        translate,
        translations,
        loadTranslations,
        supportedLanguages: LANGUAGE_OPTIONS.map((opt) => opt.code),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
