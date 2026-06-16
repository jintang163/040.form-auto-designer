package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.FormDraft;
import com.formdesigner.mapper.FormDraftMapper;
import com.formdesigner.service.FormDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FormDraftServiceImpl implements FormDraftService {

    private final FormDraftMapper formDraftMapper;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    public FormDraft getById(Long id) {
        return formDraftMapper.selectById(id, currentTenantId());
    }

    @Override
    public List<FormDraft> listByTemplateId(Long templateId) {
        return formDraftMapper.selectByTemplateId(templateId, currentTenantId());
    }

    @Override
    public List<FormDraft> listByUserId(String userId) {
        return formDraftMapper.selectByUserId(userId, currentTenantId());
    }

    @Override
    public FormDraft getByUserIdAndTemplateId(String userId, Long templateId) {
        return formDraftMapper.selectByUserIdAndTemplateId(userId, templateId, currentTenantId());
    }

    @Override
    public FormDraft save(FormDraft draft) {
        draft.setTenantId(currentTenantId());
        formDraftMapper.insert(draft);
        return draft;
    }

    @Override
    public void deleteById(Long id) {
        formDraftMapper.deleteById(id, currentTenantId());
    }

    @Override
    public void deleteByUserIdAndTemplateId(String userId, Long templateId) {
        formDraftMapper.deleteByUserIdAndTemplateId(userId, templateId, currentTenantId());
    }
}
