package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.entity.FormDraft;
import com.formdesigner.service.FormDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/form-drafts")
@RequiredArgsConstructor
public class FormDraftController {

    private final FormDraftService formDraftService;

    @GetMapping("/{id}")
    public R<FormDraft> getById(@PathVariable Long id) {
        return R.ok(formDraftService.getById(id));
    }

    @GetMapping("/template/{templateId}")
    public R<List<FormDraft>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(formDraftService.listByTemplateId(templateId));
    }

    @GetMapping("/user/{userId}")
    public R<List<FormDraft>> listByUserId(@PathVariable String userId) {
        return R.ok(formDraftService.listByUserId(userId));
    }

    @GetMapping("/user/{userId}/template/{templateId}")
    public R<FormDraft> getByUserIdAndTemplateId(@PathVariable String userId, @PathVariable Long templateId) {
        return R.ok(formDraftService.getByUserIdAndTemplateId(userId, templateId));
    }

    @PostMapping
    public R<FormDraft> save(@RequestBody FormDraft draft) {
        return R.ok(formDraftService.save(draft));
    }

    @DeleteMapping("/{id}")
    public R<Void> deleteById(@PathVariable Long id) {
        formDraftService.deleteById(id);
        return R.ok();
    }

    @DeleteMapping("/user/{userId}/template/{templateId}")
    public R<Void> deleteByUserIdAndTemplateId(@PathVariable String userId, @PathVariable Long templateId) {
        formDraftService.deleteByUserIdAndTemplateId(userId, templateId);
        return R.ok();
    }
}
