package com.formdesigner.service;

import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import java.util.List;
import java.util.Map;

public interface FormFieldService {

    FormField createField(FieldConfigDTO dto);

    FormField updateField(Long id, FieldConfigDTO dto);

    FormField getById(Long id);

    List<FormField> listByTemplateId(Long templateId);

    List<FormField> listByTemplateIdWithTranslation(Long templateId, String language);

    boolean deleteById(Long id);

    void saveFieldLabelsI18n(Long templateId, String language, Map<String, String> labels);
}
