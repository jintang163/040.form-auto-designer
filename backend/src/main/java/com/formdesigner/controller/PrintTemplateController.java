package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.PrintTemplateDTO;
import com.formdesigner.entity.PrintTemplate;
import com.formdesigner.service.PrintTemplateService;
import com.formdesigner.vo.PrintTemplateVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/print-templates")
@RequiredArgsConstructor
public class PrintTemplateController {

    private final PrintTemplateService printTemplateService;

    @PostMapping
    public R<PrintTemplate> create(@Valid @RequestBody PrintTemplateDTO dto) {
        return R.ok(printTemplateService.create(dto));
    }

    @PutMapping("/{id}")
    public R<PrintTemplate> update(@PathVariable Long id, @Valid @RequestBody PrintTemplateDTO dto) {
        return R.ok(printTemplateService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        printTemplateService.delete(id);
        return R.ok();
    }

    @GetMapping("/{id}")
    public R<PrintTemplate> getById(@PathVariable Long id) {
        return R.ok(printTemplateService.getById(id));
    }

    @GetMapping("/code/{code}")
    public R<PrintTemplate> getByCode(@PathVariable String code) {
        return R.ok(printTemplateService.getByCode(code));
    }

    @GetMapping("/template/{templateId}")
    public R<List<PrintTemplateVO>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(printTemplateService.listByTemplateId(templateId));
    }

    @GetMapping
    public R<List<PrintTemplateVO>> listAll() {
        return R.ok(printTemplateService.listAll());
    }

    @GetMapping("/default/{templateId}")
    public R<PrintTemplate> getDefault(@PathVariable Long templateId) {
        return R.ok(printTemplateService.getDefault(templateId));
    }

    @PutMapping("/{id}/set-default")
    public R<PrintTemplate> setDefault(@PathVariable Long id) {
        return R.ok(printTemplateService.setDefault(id));
    }

    @PostMapping("/{templateId}/generate-default-content")
    public R<Map<String, String>> generateDefaultContent(@PathVariable Long templateId) {
        String content = printTemplateService.generateDefaultTemplateContent(templateId);
        return R.ok(Map.of("templateContent", content));
    }
}
