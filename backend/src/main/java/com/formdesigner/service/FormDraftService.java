package com.formdesigner.service;

import com.formdesigner.entity.FormDraft;
import java.util.List;

public interface FormDraftService {

    FormDraft getById(Long id);

    List<FormDraft> listByTemplateId(Long templateId);

    List<FormDraft> listByUserId(String userId);

    FormDraft getByUserIdAndTemplateId(String userId, Long templateId);

    FormDraft save(FormDraft draft);

    void deleteById(Long id);

    void deleteByUserIdAndTemplateId(String userId, Long templateId);
}
