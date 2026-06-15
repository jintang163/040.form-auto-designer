package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.service.FormDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

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

    @GetMapping("/template/{templateId}")
    public R<List<FormData>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(formDataService.listByTemplateId(templateId));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        formDataService.deleteById(id);
        return R.ok();
    }
}
