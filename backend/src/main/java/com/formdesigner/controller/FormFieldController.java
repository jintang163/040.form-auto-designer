package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FieldConfigDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.service.FormFieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

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

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        formFieldService.deleteById(id);
        return R.ok();
    }
}
