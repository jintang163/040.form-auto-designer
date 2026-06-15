package com.formdesigner.service.impl;

import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.service.FormDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FormDataServiceImpl implements FormDataService {

    private final FormDataMapper formDataMapper;
    private final FormTemplateMapper formTemplateMapper;

    @Override
    public FormData submit(FormSubmitDTO dto) {
        FormTemplate template = formTemplateMapper.selectById(dto.getTemplateId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }

        FormData formData = new FormData();
        formData.setTemplateId(dto.getTemplateId());
        formData.setVersion(dto.getVersion() != null ? dto.getVersion() : template.getVersion());
        formData.setFieldValuesJson(dto.getFieldValuesJson());
        formData.setSubmitterId(dto.getSubmitterId());
        formData.setSubmittedAt(LocalDateTime.now());
        formDataMapper.insert(formData);
        return formData;
    }

    @Override
    public FormData getById(Long id) {
        return formDataMapper.selectById(id);
    }

    @Override
    public List<FormData> listByTemplateId(Long templateId) {
        return formDataMapper.selectByTemplateId(templateId);
    }

    @Override
    public boolean deleteById(Long id) {
        return formDataMapper.deleteById(id) > 0;
    }
}
