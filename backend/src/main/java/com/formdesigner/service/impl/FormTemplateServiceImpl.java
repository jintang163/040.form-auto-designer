package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.dto.TemplateCreateDTO;
import com.formdesigner.dto.TemplateUpdateDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.FormVersion;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.mapper.FormVersionMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.service.FormTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FormTemplateServiceImpl implements FormTemplateService {

    private final FormTemplateMapper formTemplateMapper;
    private final FormVersionMapper formVersionMapper;
    private final FormFieldMapper formFieldMapper;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    private String serializeFields(Long templateId) {
        try {
            List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
            return objectMapper.writeValueAsString(fields);
        } catch (Exception e) {
            throw new RuntimeException("序列化字段数据失败: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public FormTemplate createTemplate(TemplateCreateDTO dto) {
        FormTemplate template = new FormTemplate();
        template.setTemplateName(dto.getTemplateName());
        template.setTemplateCode(dto.getTemplateCode());
        template.setDescription(dto.getDescription());
        template.setSchemaJson(dto.getSchemaJson());
        template.setVersion(1);
        template.setStatus("DRAFT");
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());
        template.setTenantId(currentTenantId());
        formTemplateMapper.insert(template);

        String fieldsJson = serializeFields(template.getId());

        FormVersion version = new FormVersion();
        version.setTemplateId(template.getId());
        version.setVersion(1);
        version.setSchemaJson(dto.getSchemaJson());
        version.setFieldsJson(fieldsJson);
        version.setChangeLog(dto.getChangeLog() != null ? dto.getChangeLog() : "初始创建");
        version.setCreatedAt(LocalDateTime.now());
        version.setTenantId(currentTenantId());
        formVersionMapper.insert(version);

        return template;
    }

    @Override
    @Transactional
    public FormTemplate updateTemplate(Long id, TemplateUpdateDTO dto) {
        FormTemplate template = formTemplateMapper.selectById(id, currentTenantId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }
        boolean hasSchemaChange = false;
        if (dto.getTemplateName() != null) {
            template.setTemplateName(dto.getTemplateName());
        }
        if (dto.getDescription() != null) {
            template.setDescription(dto.getDescription());
        }
        if (dto.getSchemaJson() != null) {
            template.setSchemaJson(dto.getSchemaJson());
            hasSchemaChange = true;
        }
        if (dto.getStatus() != null) {
            template.setStatus(dto.getStatus());
        }
        template.setUpdatedAt(LocalDateTime.now());

        if (hasSchemaChange) {
            int newVersion = template.getVersion() + 1;
            template.setVersion(newVersion);

            String fieldsJson = serializeFields(id);

            FormVersion version = new FormVersion();
            version.setTemplateId(id);
            version.setVersion(newVersion);
            version.setSchemaJson(dto.getSchemaJson());
            version.setFieldsJson(fieldsJson);
            version.setChangeLog(dto.getChangeLog() != null ? dto.getChangeLog() : "版本更新");
            version.setCreatedAt(LocalDateTime.now());
            version.setTenantId(currentTenantId());
            formVersionMapper.insert(version);
        }

        formTemplateMapper.updateById(template);
        return template;
    }

    @Override
    public FormTemplate getById(Long id) {
        return formTemplateMapper.selectById(id, currentTenantId());
    }

    @Override
    public List<FormTemplate> listAll() {
        return formTemplateMapper.selectAll(currentTenantId());
    }

    @Override
    @Transactional
    public boolean deleteById(Long id) {
        return formTemplateMapper.deleteById(id) > 0;
    }

    @Override
    @Transactional
    public FormTemplate publishTemplate(Long id) {
        FormTemplate template = formTemplateMapper.selectById(id, currentTenantId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }
        template.setStatus("PUBLISHED");
        template.setUpdatedAt(LocalDateTime.now());

        int newVersion = template.getVersion() + 1;
        template.setVersion(newVersion);

        String fieldsJson = serializeFields(id);

        FormVersion version = new FormVersion();
        version.setTemplateId(id);
        version.setVersion(newVersion);
        version.setSchemaJson(template.getSchemaJson());
        version.setFieldsJson(fieldsJson);
        version.setChangeLog("发布版本");
        version.setCreatedAt(LocalDateTime.now());
        version.setTenantId(currentTenantId());
        formVersionMapper.insert(version);

        formTemplateMapper.updateById(template);
        return template;
    }

    @Override
    @Transactional
    public FormTemplate copyTemplate(Long id) {
        FormTemplate source = formTemplateMapper.selectById(id, currentTenantId());
        if (source == null) {
            throw new IllegalArgumentException("模板不存在");
        }

        List<FormField> sourceFields = formFieldMapper.selectByTemplateId(id, currentTenantId());

        FormTemplate copy = new FormTemplate();
        copy.setTemplateName(source.getTemplateName() + "_副本");
        copy.setTemplateCode(source.getTemplateCode() + "_copy_" + System.currentTimeMillis());
        copy.setDescription(source.getDescription());
        copy.setSchemaJson(source.getSchemaJson());
        copy.setVersion(1);
        copy.setStatus("DRAFT");
        copy.setCreatedAt(LocalDateTime.now());
        copy.setUpdatedAt(LocalDateTime.now());
        copy.setTenantId(currentTenantId());
        formTemplateMapper.insert(copy);

        for (FormField field : sourceFields) {
            FormField newField = new FormField();
            newField.setTemplateId(copy.getId());
            newField.setFieldName(field.getFieldName());
            newField.setFieldLabel(field.getFieldLabel());
            newField.setFieldType(field.getFieldType());
            newField.setInputType(field.getInputType());
            newField.setRequired(field.getRequired());
            newField.setDefaultValue(field.getDefaultValue());
            newField.setValidationRules(field.getValidationRules());
            newField.setSortOrder(field.getSortOrder());
            newField.setLayoutConfig(field.getLayoutConfig());
            newField.setTenantId(currentTenantId());
            formFieldMapper.insert(newField);
        }

        String fieldsJson = serializeFields(copy.getId());

        FormVersion version = new FormVersion();
        version.setTemplateId(copy.getId());
        version.setVersion(1);
        version.setSchemaJson(copy.getSchemaJson());
        version.setFieldsJson(fieldsJson);
        version.setChangeLog("复制自模板 " + source.getTemplateName() + "(v" + source.getVersion() + ")");
        version.setCreatedAt(LocalDateTime.now());
        version.setTenantId(currentTenantId());
        formVersionMapper.insert(version);

        return copy;
    }
}
