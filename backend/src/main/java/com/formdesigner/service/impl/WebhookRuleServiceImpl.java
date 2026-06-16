package com.formdesigner.service.impl;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.formdesigner.entity.WebhookRule;
import com.formdesigner.mapper.WebhookRuleMapper;
import com.formdesigner.service.WebhookRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookRuleServiceImpl implements WebhookRuleService {

    private final WebhookRuleMapper webhookRuleMapper;

    @Override
    public WebhookRule create(WebhookRule rule) {
        rule.setEnabled(true);
        rule.setCreatedAt(LocalDateTime.now());
        rule.setUpdatedAt(LocalDateTime.now());
        webhookRuleMapper.insert(rule);
        return rule;
    }

    @Override
    public WebhookRule getById(Long id) {
        return webhookRuleMapper.selectById(id);
    }

    @Override
    public List<WebhookRule> listByTemplateId(Long templateId) {
        return webhookRuleMapper.selectByTemplateId(templateId);
    }

    @Override
    public List<WebhookRule> listAll() {
        return webhookRuleMapper.selectAll();
    }

    @Override
    public WebhookRule update(WebhookRule rule) {
        rule.setUpdatedAt(LocalDateTime.now());
        webhookRuleMapper.updateById(rule);
        return webhookRuleMapper.selectById(rule.getId());
    }

    @Override
    public boolean deleteById(Long id) {
        return webhookRuleMapper.deleteById(id) > 0;
    }

    @Override
    public void triggerWebhooks(Long templateId, String formDataJson) {
        List<WebhookRule> rules = webhookRuleMapper.selectEnabledByTemplateId(templateId);
        for (WebhookRule rule : rules) {
            try {
                HttpRequest request;
                if ("POST".equalsIgnoreCase(rule.getHttpMethod())) {
                    request = HttpRequest.post(rule.getWebhookUrl());
                } else {
                    request = HttpRequest.put(rule.getWebhookUrl());
                }
                request.body(formDataJson);
                if (rule.getHeadersJson() != null && !rule.getHeadersJson().isEmpty()) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        @SuppressWarnings("unchecked")
                        java.util.Map<String, String> headers = mapper.readValue(rule.getHeadersJson(), java.util.Map.class);
                        headers.forEach(request::header);
                    } catch (Exception e) {
                        log.warn("解析Webhook请求头失败, ruleId={}: {}", rule.getId(), e.getMessage());
                    }
                }
                request.header("Content-Type", "application/json");
                HttpResponse response = request.timeout(10000).execute();
                log.info("Webhook推送完成, ruleId={}, url={}, status={}", rule.getId(), rule.getWebhookUrl(), response.getStatus());
            } catch (Exception e) {
                log.error("Webhook推送失败, ruleId={}, url={}: {}", rule.getId(), rule.getWebhookUrl(), e.getMessage());
            }
        }
    }
}
