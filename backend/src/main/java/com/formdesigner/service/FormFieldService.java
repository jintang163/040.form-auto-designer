package com.formdesigner.service;

import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import java.util.List;

public interface FormFieldService {

    FormField createField(FieldConfigDTO dto);

    FormField updateField(Long id, FieldConfigDTO dto);

    FormField getById(Long id);

    List<FormField> listByTemplateId(Long templateId);

    boolean deleteById(Long id);
}
