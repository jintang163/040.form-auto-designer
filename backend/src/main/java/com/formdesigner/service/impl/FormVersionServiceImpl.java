package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.dto.VersionRollbackDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.FormVersion;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.mapper.FormVersionMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.service.FormVersionService;
import com.formdesigner.util.SchemaDiffUtil;
import com.formdesigner.vo.FieldDiffVO;
import com.formdesigner.vo.RollbackResultVO;
import com.formdesigner.vo.VersionCompareResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormVersionServiceImpl implements FormVersionService {

    private final FormVersionMapper formVersionMapper;
    private final FormTemplateMapper formTemplateMapper;
    private final FormFieldMapper formFieldMapper;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private Long currentTenantId() { Long tid = TenantContext.getTenantId(); return tid != null ? tid : 1L; }

    private String serializeFields(Long templateId) {
        try {
            List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
            return objectMapper.writeValueAsString(fields);
        } catch (Exception e) {
            throw new RuntimeException("序列化字段数据失败: " + e.getMessage(), e);
        }
    }

    @Override
    public FormVersion getById(Long id) {
        return formVersionMapper.selectById(id, currentTenantId());
    }

    @Override
    public List<FormVersion> listByTemplateId(Long templateId) {
        return formVersionMapper.selectByTemplateId(templateId, currentTenantId());
    }

    @Override
    public FormVersion getByTemplateIdAndVersion(Long templateId, Integer version) {
        return formVersionMapper.selectByTemplateIdAndVersion(templateId, version, currentTenantId());
    }

    @Override
    @Transactional
    public FormVersion createVersion(Long templateId, String changeLog) {
        FormTemplate template = formTemplateMapper.selectById(templateId, currentTenantId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }

        int newVersion = template.getVersion() + 1;
        FormVersion version = new FormVersion();
        version.setTemplateId(templateId);
        version.setVersion(newVersion);
        version.setSchemaJson(template.getSchemaJson());
        version.setFieldsJson(serializeFields(templateId));
        version.setChangeLog(changeLog != null ? changeLog : "手动创建快照");
        version.setCreatedAt(LocalDateTime.now());
        version.setTenantId(currentTenantId());
        formVersionMapper.insert(version);

        template.setVersion(newVersion);
        template.setUpdatedAt(LocalDateTime.now());
        formTemplateMapper.updateById(template);

        return version;
    }

    @Override
    public VersionCompareResultVO compareVersions(Long templateId, Integer sourceVersion, Integer targetVersion) {
        FormVersion source = formVersionMapper.selectByTemplateIdAndVersion(templateId, sourceVersion, currentTenantId());
        FormVersion target = formVersionMapper.selectByTemplateIdAndVersion(templateId, targetVersion, currentTenantId());

        if (source == null) {
            throw new IllegalArgumentException("源版本不存在: v" + sourceVersion);
        }
        if (target == null) {
            throw new IllegalArgumentException("目标版本不存在: v" + targetVersion);
        }

        List<FieldDiffVO> allDiffs = SchemaDiffUtil.compareSchemas(source.getSchemaJson(), target.getSchemaJson());

        VersionCompareResultVO result = new VersionCompareResultVO();
        result.setSourceVersion(source);
        result.setTargetVersion(target);
        result.setAddedFields(allDiffs.stream()
                .filter(d -> "ADDED".equals(d.getChangeType()))
                .collect(Collectors.toList()));
        result.setRemovedFields(allDiffs.stream()
                .filter(d -> "REMOVED".equals(d.getChangeType()))
                .collect(Collectors.toList()));
        result.setModifiedFields(allDiffs.stream()
                .filter(d -> "MODIFIED".equals(d.getChangeType()))
                .collect(Collectors.toList()));

        return result;
    }

    @Override
    @Transactional
    public RollbackResultVO rollbackVersion(Long templateId, VersionRollbackDTO dto) {
        FormTemplate template = formTemplateMapper.selectById(templateId, currentTenantId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }

        FormVersion targetVersion = formVersionMapper.selectByTemplateIdAndVersion(templateId, dto.getTargetVersion(), currentTenantId());
        if (targetVersion == null) {
            throw new IllegalArgumentException("目标版本不存在: v" + dto.getTargetVersion());
        }

        int currentVersionNum = template.getVersion();
        int snapshotVersion = currentVersionNum + 1;
        int rollbackVersionNum = currentVersionNum + 2;

        FormVersion rollbackSnapshot = new FormVersion();
        rollbackSnapshot.setTemplateId(templateId);
        rollbackSnapshot.setVersion(snapshotVersion);
        rollbackSnapshot.setSchemaJson(template.getSchemaJson());
        rollbackSnapshot.setFieldsJson(serializeFields(templateId));
        rollbackSnapshot.setChangeLog("回滚前快照，目标版本 v" + dto.getTargetVersion());
        rollbackSnapshot.setCreatedAt(LocalDateTime.now());
        rollbackSnapshot.setTenantId(currentTenantId());
        formVersionMapper.insert(rollbackSnapshot);

        formFieldMapper.deleteByTemplateId(templateId);

        List<FormField> restoredFields = restoreFieldsFromJson(targetVersion.getFieldsJson(), templateId);
        if (!restoredFields.isEmpty()) {
            formFieldMapper.batchInsert(restoredFields);
        }

        template.setSchemaJson(targetVersion.getSchemaJson());
        template.setVersion(rollbackVersionNum);
        template.setUpdatedAt(LocalDateTime.now());
        formTemplateMapper.updateById(template);

        FormVersion rollbackVersionRecord = new FormVersion();
        rollbackVersionRecord.setTemplateId(templateId);
        rollbackVersionRecord.setVersion(rollbackVersionNum);
        rollbackVersionRecord.setSchemaJson(targetVersion.getSchemaJson());
        rollbackVersionRecord.setFieldsJson(targetVersion.getFieldsJson());
        rollbackVersionRecord.setChangeLog(dto.getChangeLog() != null ? dto.getChangeLog() : "回滚至版本 v" + dto.getTargetVersion());
        rollbackVersionRecord.setCreatedAt(LocalDateTime.now());
        rollbackVersionRecord.setTenantId(currentTenantId());
        formVersionMapper.insert(rollbackVersionRecord);

        RollbackResultVO result = new RollbackResultVO();
        result.setTemplate(template);
        result.setFields(restoredFields);
        result.setNewVersion(rollbackVersionNum);
        return result;
    }

    private List<FormField> restoreFieldsFromJson(String fieldsJson, Long templateId) {
        if (fieldsJson == null || fieldsJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<FormField> fields = objectMapper.readValue(fieldsJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, FormField.class));
            for (FormField field : fields) {
                field.setId(null);
                field.setTemplateId(templateId);
                field.setTenantId(currentTenantId());
            }
            return fields;
        } catch (Exception e) {
            throw new RuntimeException("反序列化字段数据失败: " + e.getMessage(), e);
        }
    }
}
