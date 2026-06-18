package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.service.FormDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/form-data")
@RequiredArgsConstructor
public class FormDataController {

    private final FormDataService formDataService;

    @PostMapping
    public R<FormData> submit(@Valid @RequestBody FormSubmitDTO dto) {
        return R.ok(formDataService.submit(dto));
    }

    @GetMapping("/{id}")
    public R<FormData> getById(@PathVariable Long id) {
        return R.ok(formDataService.getById(id));
    }

    @GetMapping("/{id}/detail")
    public R<Map<String, Object>> getDetailWithPermissions(@PathVariable Long id) {
        return R.ok(formDataService.getDetailWithPermissions(id));
    }

    @GetMapping("/template/{templateId}")
    public R<List<FormData>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(formDataService.listByTemplateId(templateId));
    }

    @GetMapping("/template/{templateId}/paged")
    public R<Map<String, Object>> listByTemplateIdPaged(
            @PathVariable Long templateId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String fieldName,
            @RequestParam(required = false) String fieldValue) {
        return R.ok(formDataService.listByTemplateIdPaged(templateId, page, pageSize, fieldName, fieldValue));
    }

    @GetMapping("/template/{templateId}/export")
    public void exportExcel(
            @PathVariable Long templateId,
            @RequestParam(required = false) String fieldName,
            @RequestParam(required = false) String fieldValue,
            HttpServletResponse response) {
        formDataService.exportExcel(templateId, fieldName, fieldValue, response);
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        formDataService.deleteById(id);
        return R.ok();
    }

    @GetMapping("/{id}/field/{fieldName}/raw")
    public R<String> getFieldRawValue(
            @PathVariable Long id,
            @PathVariable String fieldName) {
        return R.ok(formDataService.getFieldRawValue(id, fieldName));
    }
}
