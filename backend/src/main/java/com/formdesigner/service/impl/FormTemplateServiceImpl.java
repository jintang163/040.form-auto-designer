package com.formdesigner.service.impl;

import com.formdesigner.dto.TemplateCreateDTO;
import com.formdesigner.dto.TemplateUpdateDTO;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.FormVersion;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.mapper.FormVersionMapper;
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

    @Override
    @Transactional
    public FormTemplate createTemplate(TemplateCreateDTO dto) {
        FormTemplate template = new FormTemplate();
        template.setTemplateName(dto.getTemplateName());
        template.setTemplateCode(dto.getTemplateCode());
        template.setSchemaJson(dto.getSchemaJson());
        template.setVersion(1);
        template.setStatus(1);
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());
        formTemplateMapper.insert(template);

        FormVersion version = new FormVersion();
        version.setTemplateId(template.getId());
        version.setVersion(1);
        version.setSchemaJson(dto.getSchemaJson());
        version.setChangeLog("初始创建");
        version.setCreatedAt(LocalDateTime.now());
        formVersionMapper.insert(version);

        return template;
    }

    @Override
    @Transactional
    public FormTemplate updateTemplate(Long id, TemplateUpdateDTO dto) {
        FormTemplate template = formTemplateMapper.selectById(id);
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }
        if (dto.getTemplateName() != null) {
            template.setTemplateName(dto.getTemplateName());
        }
        if (dto.getSchemaJson() != null) {
            template.setSchemaJson(dto.getSchemaJson());
        }
        if (dto.getStatus() != null) {
            template.setStatus(dto.getStatus());
        }
        template.setUpdatedAt(LocalDateTime.now());

        if (dto.getSchemaJson() != null) {
            int newVersion = template.getVersion() + 1;
            template.setVersion(newVersion);

            FormVersion version = new FormVersion();
            version.setTemplateId(id);
            version.setVersion(newVersion);
            version.setSchemaJson(dto.getSchemaJson());
            version.setChangeLog(dto.getChangeLog() != null ? dto.getChangeLog() : "版本更新");
            version.setCreatedAt(LocalDateTime.now());
            formVersionMapper.insert(version);
        }

        formTemplateMapper.updateById(template);
        return template;
    }

    @Override
    public FormTemplate getById(Long id) {
        return formTemplateMapper.selectById(id);
    }

    @Override
    public List<FormTemplate> listAll() {
        return formTemplateMapper.selectAll();
    }

    @Override
    @Transactional
    public boolean deleteById(Long id) {
        return formTemplateMapper.deleteById(id) > 0;
    }
}
