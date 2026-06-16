package com.formdesigner.service;

import com.formdesigner.entity.WebhookRule;
import java.util.List;

public interface WebhookRuleService {
    WebhookRule create(WebhookRule rule);
    WebhookRule getById(Long id);
    List<WebhookRule> listByTemplateId(Long templateId);
    List<WebhookRule> listAll();
    WebhookRule update(WebhookRule rule);
    boolean deleteById(Long id);
    void triggerWebhooks(Long templateId, String formDataJson);
}
