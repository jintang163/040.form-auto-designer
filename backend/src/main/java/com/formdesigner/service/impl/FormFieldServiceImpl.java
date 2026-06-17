package com.formdesigner.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.SysTenantQuota;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.service.FormFieldService;
import com.formdesigner.service.FormI18nService;
import com.formdesigner.service.SysTenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormFieldServiceImpl implements FormFieldService {

    private final FormFieldMapper formFieldMapper;
    private final SysTenantService tenantService;
    private final FormI18nService i18nService;

    private Long currentTenantId() { Long tid = TenantContext.getTenantId(); return tid != null ? tid : 1L; }

    private void assertFieldQuota(Long templateId, int additionalFields) {
        SysTenantQuota quota = tenantService.getQuotaByTenantId(currentTenantId());
        if (quota == null) {
            throw new IllegalArgumentException("租户配额不存在");
        }
        List<FormField> existingFields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
        int currentCount = existingFields != null ? existingFields.size() : 0;
        if (currentCount + additionalFields > quota.getMaxFieldsPerTemplate()) {
            throw new IllegalArgumentException(String.format(
                "单模板字段数已达上限：当前 %d / 上限 %d",
                currentCount, quota.getMaxFieldsPerTemplate()
            ));
        }
    }

    @Override
    public FormField createField(FieldConfigDTO dto) {
        assertFieldQuota(dto.getTemplateId(), 1);
        FormField field = new FormField();
        field.setTemplateId(dto.getTemplateId());
        field.setFieldName(dto.getFieldName());
        field.setFieldLabel(dto.getFieldLabel());
        field.setFieldType(dto.getFieldType());
        field.setInputType(dto.getInputType());
        field.setRequired(dto.getRequired() != null ? dto.getRequired() : false);
        field.setDefaultValue(dto.getDefaultValue());
        field.setValidationRules(dto.getValidationRules());
        field.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        field.setLayoutConfig(dto.getLayoutConfig());
        field.setTenantId(currentTenantId());
        formFieldMapper.insert(field);
        return field;
    }

    @Override
    public FormField updateField(Long id, FieldConfigDTO dto) {
        FormField field = formFieldMapper.selectById(id);
        if (field == null) {
            throw new IllegalArgumentException("字段不存在");
        }
        if (dto.getFieldName() != null) {
            field.setFieldName(dto.getFieldName());
        }
        if (dto.getFieldLabel() != null) {
            field.setFieldLabel(dto.getFieldLabel());
        }
        if (dto.getFieldType() != null) {
            field.setFieldType(dto.getFieldType());
        }
        if (dto.getInputType() != null) {
            field.setInputType(dto.getInputType());
        }
        if (dto.getRequired() != null) {
            field.setRequired(dto.getRequired());
        }
        if (dto.getDefaultValue() != null) {
            field.setDefaultValue(dto.getDefaultValue());
        }
        if (dto.getValidationRules() != null) {
            field.setValidationRules(dto.getValidationRules());
        }
        if (dto.getSortOrder() != null) {
            field.setSortOrder(dto.getSortOrder());
        }
        if (dto.getLayoutConfig() != null) {
            field.setLayoutConfig(dto.getLayoutConfig());
        }
        formFieldMapper.updateById(field);
        return field;
    }

    @Override
    public FormField getById(Long id) {
        return formFieldMapper.selectById(id);
    }

    @Override
    public List<FormField> listByTemplateId(Long templateId) {
        return formFieldMapper.selectByTemplateId(templateId, currentTenantId());
    }

    @Override
    public List<FormField> listByTemplateIdWithTranslation(Long templateId, String language) {
        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
        if (fields == null || fields.isEmpty() || StrUtil.isBlank(language) || "zh-CN".equals(language)) {
            return fields;
        }

        Map<String, String> translations = i18nService.getTranslations(templateId, language);
        if (translations == null || translations.isEmpty()) {
            return fields;
        }

        List<FormField> translatedFields = new ArrayList<>();
        for (FormField field : fields) {
            FormField translated = new FormField();
            translated.setId(field.getId());
            translated.setTemplateId(field.getTemplateId());
            translated.setFieldName(field.getFieldName());
            translated.setFieldLabel(translations.getOrDefault(field.getFieldName(), field.getFieldLabel()));
            translated.setFieldType(field.getFieldType());
            translated.setInputType(field.getInputType());
            translated.setRequired(field.getRequired());
            translated.setDefaultValue(field.getDefaultValue());
            translated.setValidationRules(field.getValidationRules());
            translated.setSortOrder(field.getSortOrder());
            translated.setLayoutConfig(field.getLayoutConfig());
            translated.setTenantId(field.getTenantId());
            translated.setFieldLabelI18n(field.getFieldLabelI18n());
            translated.setOptionsI18n(field.getOptionsI18n());

            if (StrUtil.isNotBlank(field.getOptionsI18n())) {
                try {
                    JSONObject optionsI18n = JSONUtil.parseObj(field.getOptionsI18n());
                    if (optionsI18n.containsKey(language)) {
                        String translatedOptions = optionsI18n.getStr(language);
                        translated.setLayoutConfig(translatedOptions);
                    }
                } catch (Exception e) {
                    log.warn("解析多语言选项失败, field={}", field.getFieldName(), e);
                }
            }

            translatedFields.add(translated);
        }

        return translatedFields;
    }

    @Override
    public boolean deleteById(Long id) {
        return formFieldMapper.deleteById(id) > 0;
    }

    @Override
    public void saveFieldLabelsI18n(Long templateId, String language, Map<String, String> labels) {
        if (labels == null || labels.isEmpty()) return;

        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
        Map<String, FormField> fieldMap = new HashMap<>();
        for (FormField field : fields) {
            fieldMap.put(field.getFieldName(), field);
        }

        for (Map.Entry<String, String> entry : labels.entrySet()) {
            String fieldName = entry.getKey();
            String translatedLabel = entry.getValue();

            FormField field = fieldMap.get(fieldName);
            if (field == null) continue;

            if (StrUtil.isBlank(translatedLabel)) continue;

            Map<String, String> labelI18n;
            if (StrUtil.isNotBlank(field.getFieldLabelI18n())) {
                try {
                    labelI18n = JSONUtil.toBean(field.getFieldLabelI18n(), Map.class);
                } catch (Exception e) {
                    labelI18n = new HashMap<>();
                }
            } else {
                labelI18n = new HashMap<>();
            }

            labelI18n.put(language, translatedLabel);
            field.setFieldLabelI18n(JSONUtil.toJsonStr(labelI18n));
            formFieldMapper.updateById(field);
        }

        i18nService.saveBatchTranslations(templateId, language, labels);
        log.info("保存字段多语言标签完成, templateId={}, lang={}, count={}", templateId, language, labels.size());
    }
}
