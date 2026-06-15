package com.formdesigner.service;

import com.formdesigner.entity.FormVersion;
import java.util.List;

public interface FormVersionService {

    FormVersion getById(Long id);

    List<FormVersion> listByTemplateId(Long templateId);

    FormVersion getByTemplateIdAndVersion(Long templateId, Integer version);
}
