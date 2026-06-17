package com.formdesigner.service;

import com.formdesigner.dto.FormI18nDTO;
import com.formdesigner.vo.FormI18nVO;
import java.util.List;
import java.util.Map;

public interface FormI18nService {

    void saveTranslation(FormI18nDTO dto);

    void saveBatchTranslations(Long templateId, String language, Map<String, String> translations);

    String translate(String resourceKey, String language, String defaultValue);

    Map<String, String> getTranslations(Long templateId, String language);

    Map<String, Map<String, String>> getAllTranslations(Long templateId);

    List<FormI18nVO> listTranslations(Long templateId);

    List<FormI18nVO> listTranslationsByLanguage(Long templateId, String language);

    void deleteTranslation(String resourceKey, String language);

    void deleteTemplateTranslations(Long templateId);

    List<String> getSupportedLanguages();
}
