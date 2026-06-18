package com.formdesigner.service;

import com.formdesigner.entity.FormField;

import java.util.List;
import java.util.Map;

public interface DataMaskingService {

    Map<String, Object> maskFieldValues(
            Long templateId,
            Map<String, Object> fieldValues,
            List<FormField> fields);

    Map<String, Object> maskFieldValuesForExport(
            Long templateId,
            Map<String, Object> fieldValues,
            List<FormField> fields);

    String maskFieldValue(
            Long templateId,
            FormField field,
            String value);

    boolean isFieldSensitive(FormField field);

    boolean needsMasking(Long templateId, FormField field);

    boolean needsMaskingForExport(Long templateId, FormField field);

    Map<String, Object> getFieldMaskingInfo(Long templateId, List<FormField> fields);
}
