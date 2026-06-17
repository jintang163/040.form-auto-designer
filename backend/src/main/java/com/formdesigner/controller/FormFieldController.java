package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.service.FormFieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
public class FormFieldController {

    private final FormFieldService formFieldService;

    @PostMapping
    public R<FormField> create(@Valid @RequestBody FieldConfigDTO dto) {
        return R.ok(formFieldService.createField(dto));
    }

    @PutMapping("/{id}")
    public R<FormField> update(@PathVariable Long id, @RequestBody FieldConfigDTO dto) {
        return R.ok(formFieldService.updateField(id, dto));
    }

    @GetMapping("/{id}")
    public R<FormField> getById(@PathVariable Long id) {
        return R.ok(formFieldService.getById(id));
    }

    @GetMapping("/template/{templateId}")
    public R<List<FormField>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(formFieldService.listByTemplateId(templateId));
    }

    @GetMapping("/template/{templateId}/translate")
    public R<List<FormField>> listByTemplateIdWithTranslation(
            @PathVariable Long templateId,
            @RequestParam String language) {
        return R.ok(formFieldService.listByTemplateIdWithTranslation(templateId, language));
    }

    @PostMapping("/template/{templateId}/i18n/{language}")
    public R<Void> saveFieldLabelsI18n(
            @PathVariable Long templateId,
            @PathVariable String language,
            @RequestBody Map<String, String> labels) {
        formFieldService.saveFieldLabelsI18n(templateId, language, labels);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        formFieldService.deleteById(id);
        return R.ok();
    }
}
