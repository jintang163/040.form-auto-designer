package com.formdesigner.service;

import com.formdesigner.dto.VersionCompareDTO;
import com.formdesigner.dto.VersionRollbackDTO;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.FormVersion;
import com.formdesigner.vo.VersionCompareResultVO;

import java.util.List;

public interface FormVersionService {

    FormVersion getById(Long id);

    List<FormVersion> listByTemplateId(Long templateId);

    FormVersion getByTemplateIdAndVersion(Long templateId, Integer version);

    FormVersion createVersion(Long templateId, String changeLog);

    VersionCompareResultVO compareVersions(Long templateId, Integer sourceVersion, Integer targetVersion);

    FormTemplate rollbackVersion(Long templateId, VersionRollbackDTO dto);
}
