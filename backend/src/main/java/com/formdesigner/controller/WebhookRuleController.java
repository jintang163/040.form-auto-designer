package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.entity.WebhookRule;
import com.formdesigner.service.WebhookRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/webhook-rules")
@RequiredArgsConstructor
public class WebhookRuleController {

    private final WebhookRuleService webhookRuleService;

    @PostMapping
    public R<WebhookRule> create(@RequestBody WebhookRule rule) {
        return R.ok(webhookRuleService.create(rule));
    }

    @GetMapping("/{id}")
    public R<WebhookRule> getById(@PathVariable Long id) {
        return R.ok(webhookRuleService.getById(id));
    }

    @GetMapping("/template/{templateId}")
    public R<List<WebhookRule>> listByTemplateId(@PathVariable Long templateId) {
        return R.ok(webhookRuleService.listByTemplateId(templateId));
    }

    @GetMapping
    public R<List<WebhookRule>> listAll() {
        return R.ok(webhookRuleService.listAll());
    }

    @PutMapping("/{id}")
    public R<WebhookRule> update(@PathVariable Long id, @RequestBody WebhookRule rule) {
        rule.setId(id);
        return R.ok(webhookRuleService.update(rule));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        webhookRuleService.deleteById(id);
        return R.ok();
    }
}
