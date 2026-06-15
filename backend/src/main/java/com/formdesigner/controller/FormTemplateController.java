package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.TemplateCreateDTO;
import com.formdesigner.dto.TemplateUpdateDTO;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.service.FormTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    @PostMapping
    public R<FormTemplate> create(@Valid @RequestBody TemplateCreateDTO dto) {
        return R.ok(formTemplateService.createTemplate(dto));
    }

    @PutMapping("/{id}")
    public R<FormTemplate> update(@PathVariable Long id, @RequestBody TemplateUpdateDTO dto) {
        return R.ok(formTemplateService.updateTemplate(id, dto));
    }

    @GetMapping("/{id}")
    public R<FormTemplate> getById(@PathVariable Long id) {
        return R.ok(formTemplateService.getById(id));
    }

    @GetMapping
    public R<List<FormTemplate>> list() {
        return R.ok(formTemplateService.listAll());
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        formTemplateService.deleteById(id);
        return R.ok();
    }
}
