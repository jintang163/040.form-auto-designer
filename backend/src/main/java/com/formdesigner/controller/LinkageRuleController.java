package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.LinkageEvaluateResultDTO;
import com.formdesigner.entity.LinkageRule;
import com.formdesigner.service.LinkageRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/linkage-rules")
@RequiredArgsConstructor
public class LinkageRuleController {

    private final LinkageRuleService linkageRuleService;

    @PostMapping
    public R<LinkageRule> create(@RequestBody LinkageRule rule) {
        return R.ok(linkageRuleService.create(rule));
    }

    @PutMapping
    public R<LinkageRule> update(@RequestBody LinkageRule rule) {
        return R.ok(linkageRuleService.update(rule));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        linkageRuleService.deleteById(id);
        return R.ok();
    }

    @GetMapping("/{id}")
    public R<LinkageRule> getById(@PathVariable Long id) {
        return R.ok(linkageRuleService.getById(id));
    }

    @GetMapping("/template/{templateId}")
    public R<List<LinkageRule>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(linkageRuleService.listByTemplateId(templateId));
    }

    @GetMapping
    public R<List<LinkageRule>> listAll() {
        return R.ok(linkageRuleService.listAll());
    }

    @PostMapping("/evaluate")
    public R<List<LinkageEvaluateResultDTO>> evaluate(@RequestBody Map<String, Object> payload) {
        Long templateId = Long.valueOf(payload.get("templateId").toString());
        String sourceField = (String) payload.getOrDefault("sourceField", null);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldValues = (Map<String, Object>) payload.getOrDefault("fieldValues", Map.of());
        if (sourceField != null && !sourceField.isEmpty()) {
            return R.ok(linkageRuleService.evaluate(templateId, sourceField, fieldValues));
        }
        return R.ok(linkageRuleService.evaluateAll(templateId, fieldValues));
    }
}
