package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.VersionRollbackDTO;
import com.formdesigner.entity.FormVersion;
import com.formdesigner.service.FormVersionService;
import com.formdesigner.vo.RollbackResultVO;
import com.formdesigner.vo.VersionCompareResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/templates/{templateId}/versions")
@RequiredArgsConstructor
public class FormVersionController {

    private final FormVersionService formVersionService;

    @GetMapping
    public R<List<FormVersion>> listVersions(@PathVariable Long templateId) {
        return R.ok(formVersionService.listByTemplateId(templateId));
    }

    @GetMapping("/{version}")
    public R<FormVersion> getVersion(@PathVariable Long templateId, @PathVariable Integer version) {
        return R.ok(formVersionService.getByTemplateIdAndVersion(templateId, version));
    }

    @PostMapping
    public R<FormVersion> createVersion(@PathVariable Long templateId,
                                        @RequestBody(required = false) Map<String, String> body) {
        String changeLog = body != null ? body.get("changeLog") : null;
        return R.ok(formVersionService.createVersion(templateId, changeLog));
    }

    @GetMapping("/compare")
    public R<VersionCompareResultVO> compareVersions(@PathVariable Long templateId,
                                                     @RequestParam Integer sourceVersion,
                                                     @RequestParam Integer targetVersion) {
        return R.ok(formVersionService.compareVersions(templateId, sourceVersion, targetVersion));
    }

    @PostMapping("/rollback")
    public R<RollbackResultVO> rollbackVersion(@PathVariable Long templateId,
                                               @Valid @RequestBody VersionRollbackDTO dto) {
        return R.ok(formVersionService.rollbackVersion(templateId, dto));
    }
}
