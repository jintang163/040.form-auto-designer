package com.formdesigner.service.impl;

import com.formdesigner.entity.FormVersion;
import com.formdesigner.mapper.FormVersionMapper;
import com.formdesigner.service.FormVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FormVersionServiceImpl implements FormVersionService {

    private final FormVersionMapper formVersionMapper;

    @Override
    public FormVersion getById(Long id) {
        return formVersionMapper.selectById(id);
    }

    @Override
    public List<FormVersion> listByTemplateId(Long templateId) {
        return formVersionMapper.selectByTemplateId(templateId);
    }

    @Override
    public FormVersion getByTemplateIdAndVersion(Long templateId, Integer version) {
        return formVersionMapper.selectByTemplateIdAndVersion(templateId, version);
    }
}
