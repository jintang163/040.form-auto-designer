package com.formdesigner.service.impl;

import com.formdesigner.entity.FormField;
import com.formdesigner.service.DataMaskingService;
import com.formdesigner.service.FieldPermissionService;
import com.formdesigner.util.DataMaskingUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataMaskingServiceImpl implements DataMaskingService {

    private final FieldPermissionService permissionService;

    @Override
    public Map<String, Object> maskFieldValues(
            Long templateId,
            Map<String, Object> fieldValues,
            List<FormField> fields) {

        if (fieldValues == null || fields == null) {
            return fieldValues;
        }

        Map<String, Object> masked = new HashMap<>(fieldValues);
        Map<String, FormField> fieldMap = new HashMap<>();
        for (FormField f : fields) {
            fieldMap.put(f.getFieldName(), f);
        }

        for (Map.Entry<String, Object> entry : masked.entrySet()) {
            String fieldName = entry.getKey();
            FormField field = fieldMap.get(fieldName);
            if (field != null && entry.getValue() != null) {
                if (needsMasking(templateId, field)) {
                    String strValue = String.valueOf(entry.getValue());
                    String maskedValue = DataMaskingUtil.autoMask(
                            field.getFieldName(),
                            field.getFieldLabel(),
                            strValue);
                    entry.setValue(maskedValue);
                }
            }
        }

        return masked;
    }

    @Override
    public Map<String, Object> maskFieldValuesForExport(
            Long templateId,
            Map<String, Object> fieldValues,
            List<FormField> fields) {

        if (fieldValues == null || fields == null) {
            return fieldValues;
        }

        Map<String, Object> masked = new HashMap<>(fieldValues);
        Map<String, FormField> fieldMap = new HashMap<>();
        for (FormField f : fields) {
            fieldMap.put(f.getFieldName(), f);
        }

        for (Map.Entry<String, Object> entry : masked.entrySet()) {
            String fieldName = entry.getKey();
            FormField field = fieldMap.get(fieldName);
            if (field != null && entry.getValue() != null) {
                if (needsMaskingForExport(templateId, field)) {
                    String strValue = String.valueOf(entry.getValue());
                    String maskedValue = DataMaskingUtil.autoMask(
                            field.getFieldName(),
                            field.getFieldLabel(),
                            strValue);
                    entry.setValue(maskedValue);
                }
            }
        }

        return masked;
    }

    @Override
    public String maskFieldValue(Long templateId, FormField field, String value) {
        if (value == null || !needsMasking(templateId, field)) {
            return value;
        }
        return DataMaskingUtil.autoMask(field.getFieldName(), field.getFieldLabel(), value);
    }

    @Override
    public boolean isFieldSensitive(FormField field) {
        if (field == null) return false;

        if (Boolean.TRUE.equals(field.getIsSensitive())) {
            return true;
        }

        String fieldName = field.getFieldName() != null ? field.getFieldName().toLowerCase() : "";
        String fieldLabel = field.getFieldLabel() != null ? field.getFieldLabel().toLowerCase() : "";

        return fieldName.contains("phone") || fieldName.contains("mobile")
                || fieldName.contains("idcard") || fieldName.contains("id_card") || fieldName.contains("identity")
                || fieldName.contains("email") || fieldName.contains("mail")
                || fieldName.contains("bank") || fieldName.contains("card") || fieldName.contains("account")
                || fieldName.contains("address")
                || fieldName.contains("name")
                || fieldLabel.contains("手机") || fieldLabel.contains("电话")
                || fieldLabel.contains("身份证") || fieldLabel.contains("证件号")
                || fieldLabel.contains("邮箱") || fieldLabel.contains("邮件")
                || fieldLabel.contains("银行卡") || fieldLabel.contains("账号") || fieldLabel.contains("卡号")
                || fieldLabel.contains("地址")
                || fieldLabel.contains("姓名") || fieldLabel.contains("申请人");
    }

    @Override
    public boolean needsMasking(Long templateId, FormField field) {
        if (!isFieldSensitive(field)) {
            return false;
        }
        return !permissionService.canViewSensitive(templateId, field.getFieldName());
    }

    @Override
    public boolean needsMaskingForExport(Long templateId, FormField field) {
        if (!isFieldSensitive(field)) {
            return false;
        }
        return !permissionService.canExport(templateId, field.getFieldName());
    }

    @Override
    public Map<String, Object> getFieldMaskingInfo(Long templateId, List<FormField> fields) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> fieldInfo = new HashMap<>();

        for (FormField field : fields) {
            Map<String, Object> info = new HashMap<>();
            info.put("isSensitive", isFieldSensitive(field));
            info.put("canViewSensitive", permissionService.canViewSensitive(templateId, field.getFieldName()));
            info.put("canEdit", permissionService.canEdit(templateId, field.getFieldName()));
            info.put("canExport", permissionService.canExport(templateId, field.getFieldName()));
            fieldInfo.put(field.getFieldName(), info);
        }

        result.put("fieldPermissions", fieldInfo);
        return result;
    }
}
