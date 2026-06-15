package com.formdesigner.service.impl;

import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.service.FormFieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FormFieldServiceImpl implements FormFieldService {

    private final FormFieldMapper formFieldMapper;

    @Override
    public FormField createField(FieldConfigDTO dto) {
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
        return formFieldMapper.selectByTemplateId(templateId);
    }

    @Override
    public boolean deleteById(Long id) {
        return formFieldMapper.deleteById(id) > 0;
    }
}
