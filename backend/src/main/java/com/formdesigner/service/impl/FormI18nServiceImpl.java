package com.formdesigner.service.impl;

import cn.hutool.core.util.StrUtil;
import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.FormI18nDTO;
import com.formdesigner.entity.FormI18nResource;
import com.formdesigner.mapper.FormI18nResourceMapper;
import com.formdesigner.service.FormI18nService;
import com.formdesigner.vo.FormI18nVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormI18nServiceImpl implements FormI18nService {

    private final FormI18nResourceMapper i18nMapper;

    private static final List<String> SUPPORTED_LANGUAGES = Arrays.asList("zh-CN", "en-US");

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    private FormI18nVO toVO(FormI18nResource entity) {
        if (entity == null) return null;
        FormI18nVO vo = new FormI18nVO();
        vo.setResourceKey(entity.getResourceKey());
        vo.setLanguage(entity.getLanguage());
        vo.setResourceValue(entity.getResourceValue());
        vo.setResourceType(entity.getResourceType());
        vo.setTemplateId(entity.getTemplateId());
        vo.setFieldName(entity.getFieldName());
        vo.setCreatedAt(entity.getCreatedAt());
        vo.setUpdatedAt(entity.getUpdatedAt());
        return vo;
    }

    @Override
    public void saveTranslation(FormI18nDTO dto) {
        Long tenantId = currentTenantId();

        FormI18nResource existing = i18nMapper.selectByKeyAndLanguage(
                dto.getResourceKey(),
                dto.getLanguage(),
                tenantId
        );

        if (existing != null) {
            existing.setResourceValue(dto.getResourceValue());
            existing.setResourceType(dto.getResourceType());
            existing.setTemplateId(dto.getTemplateId());
            existing.setFieldName(dto.getFieldName());
            existing.setUpdatedAt(LocalDateTime.now());
            i18nMapper.update(existing);
            log.info("更新翻译, key={}, lang={}", dto.getResourceKey(), dto.getLanguage());
        } else {
            FormI18nResource entity = new FormI18nResource();
            entity.setResourceKey(dto.getResourceKey());
            entity.setLanguage(dto.getLanguage());
            entity.setResourceValue(dto.getResourceValue());
            entity.setResourceType(dto.getResourceType());
            entity.setTemplateId(dto.getTemplateId());
            entity.setFieldName(dto.getFieldName());
            entity.setTenantId(tenantId);
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdatedAt(LocalDateTime.now());
            i18nMapper.insert(entity);
            log.info("新增翻译, key={}, lang={}", dto.getResourceKey(), dto.getLanguage());
        }
    }

    @Override
    public void saveBatchTranslations(Long templateId, String language, Map<String, String> translations) {
        if (translations == null || translations.isEmpty()) return;

        Long tenantId = currentTenantId();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<String, String> entry : translations.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            if (StrUtil.isBlank(key) || StrUtil.isBlank(value)) continue;

            FormI18nResource existing = i18nMapper.selectByKeyAndLanguage(key, language, tenantId);
            if (existing != null) {
                existing.setResourceValue(value);
                existing.setTemplateId(templateId);
                existing.setUpdatedAt(now);
                i18nMapper.update(existing);
            } else {
                FormI18nResource entity = new FormI18nResource();
                entity.setResourceKey(key);
                entity.setLanguage(language);
                entity.setResourceValue(value);
                entity.setResourceType("field_label");
                entity.setTemplateId(templateId);
                entity.setTenantId(tenantId);
                entity.setCreatedAt(now);
                entity.setUpdatedAt(now);
                i18nMapper.insert(entity);
            }
        }

        log.info("批量保存翻译完成, templateId={}, lang={}, count={}", templateId, language, translations.size());
    }

    @Override
    public String translate(String resourceKey, String language, String defaultValue) {
        if (StrUtil.isBlank(resourceKey)) return defaultValue;

        FormI18nResource resource = i18nMapper.selectByKeyAndLanguage(
                resourceKey,
                language,
                currentTenantId()
        );

        if (resource != null && StrUtil.isNotBlank(resource.getResourceValue())) {
            return resource.getResourceValue();
        }

        return defaultValue;
    }

    @Override
    public Map<String, String> getTranslations(Long templateId, String language) {
        List<FormI18nResource> resources = i18nMapper.selectByTemplateIdAndLanguage(
                templateId,
                language,
                currentTenantId()
        );

        Map<String, String> translations = new HashMap<>();
        for (FormI18nResource resource : resources) {
            if (StrUtil.isNotBlank(resource.getResourceKey()) && StrUtil.isNotBlank(resource.getResourceValue())) {
                translations.put(resource.getResourceKey(), resource.getResourceValue());
            }
        }

        return translations;
    }

    @Override
    public Map<String, Map<String, String>> getAllTranslations(Long templateId) {
        List<FormI18nResource> resources = i18nMapper.selectByTemplateId(
                templateId,
                currentTenantId()
        );

        Map<String, Map<String, String>> result = new HashMap<>();

        for (FormI18nResource resource : resources) {
            String lang = resource.getLanguage();
            String key = resource.getResourceKey();
            String value = resource.getResourceValue();

            if (StrUtil.isBlank(key) || StrUtil.isBlank(value)) continue;

            result.computeIfAbsent(lang, k -> new HashMap<>()).put(key, value);
        }

        return result;
    }

    @Override
    public List<FormI18nVO> listTranslations(Long templateId) {
        List<FormI18nResource> resources = i18nMapper.selectByTemplateId(
                templateId,
                currentTenantId()
        );

        return resources.stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public List<FormI18nVO> listTranslationsByLanguage(Long templateId, String language) {
        List<FormI18nResource> resources = i18nMapper.selectByTemplateIdAndLanguage(
                templateId,
                language,
                currentTenantId()
        );

        return resources.stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteTranslation(String resourceKey, String language) {
        i18nMapper.deleteByKeyAndLanguage(resourceKey, language, currentTenantId());
        log.info("删除翻译, key={}, lang={}", resourceKey, language);
    }

    @Override
    public void deleteTemplateTranslations(Long templateId) {
        i18nMapper.deleteByTemplateId(templateId, currentTenantId());
        log.info("删除模板所有翻译, templateId={}", templateId);
    }

    @Override
    public List<String> getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }
}
