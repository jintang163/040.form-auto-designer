package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.LinkageEvaluateResultDTO;
import com.formdesigner.entity.LinkageRule;
import com.formdesigner.mapper.LinkageRuleMapper;
import com.formdesigner.service.ExpressionEngineService;
import com.formdesigner.service.LinkageRuleService;
import com.formdesigner.service.DynamicDataSourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LinkageRuleServiceImpl implements LinkageRuleService {

    private final LinkageRuleMapper linkageRuleMapper;
    private final ExpressionEngineService expressionEngineService;
    private final DynamicDataSourceService dynamicDataSourceService;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    public LinkageRule create(LinkageRule rule) {
        rule.setTenantId(currentTenantId());
        rule.setCreatedAt(LocalDateTime.now());
        rule.setUpdatedAt(LocalDateTime.now());
        if (rule.getEnabled() == null) rule.setEnabled(true);
        if (rule.getSortOrder() == null) rule.setSortOrder(0);
        linkageRuleMapper.insert(rule);
        return rule;
    }

    @Override
    public LinkageRule update(LinkageRule rule) {
        rule.setTenantId(currentTenantId());
        rule.setUpdatedAt(LocalDateTime.now());
        linkageRuleMapper.updateById(rule);
        return linkageRuleMapper.selectById(rule.getId(), currentTenantId());
    }

    @Override
    public void deleteById(Long id) {
        linkageRuleMapper.deleteById(id);
    }

    @Override
    public LinkageRule getById(Long id) {
        return linkageRuleMapper.selectById(id, currentTenantId());
    }

    @Override
    public List<LinkageRule> listByTemplateId(Long templateId) {
        return linkageRuleMapper.selectByTemplateId(templateId, currentTenantId());
    }

    @Override
    public List<LinkageRule> listBySourceField(Long templateId, String sourceField) {
        return linkageRuleMapper.selectBySourceField(templateId, sourceField, currentTenantId());
    }

    @Override
    public List<LinkageRule> listAll() {
        return linkageRuleMapper.selectAll(currentTenantId());
    }

    @Override
    public List<LinkageEvaluateResultDTO> evaluate(Long templateId, String sourceField, Map<String, Object> fieldValues) {
        List<LinkageRule> rules = linkageRuleMapper.selectBySourceField(templateId, sourceField, currentTenantId());
        return doEvaluate(rules, fieldValues);
    }

    @Override
    public List<LinkageEvaluateResultDTO> evaluateAll(Long templateId, Map<String, Object> fieldValues) {
        List<LinkageRule> rules = linkageRuleMapper.selectByTemplateId(templateId, currentTenantId());
        return doEvaluate(rules.stream().filter(r -> Boolean.TRUE.equals(r.getEnabled())).collect(Collectors.toList()), fieldValues);
    }

    private List<LinkageEvaluateResultDTO> doEvaluate(List<LinkageRule> rules, Map<String, Object> fieldValues) {
        List<LinkageEvaluateResultDTO> results = new ArrayList<>();
        for (LinkageRule rule : rules) {
            if (!Boolean.TRUE.equals(rule.getEnabled())) continue;
            try {
                LinkageEvaluateResultDTO result = evaluateSingleRule(rule, fieldValues);
                if (result != null) results.add(result);
            } catch (Exception e) {
                log.error("联动规则求值失败 ruleId={}", rule.getId(), e);
            }
        }
        Map<String, LinkageEvaluateResultDTO> merged = new LinkedHashMap<>();
        for (LinkageEvaluateResultDTO r : results) {
            merged.merge(r.getTargetField(), r, (existing, incoming) -> {
                if (incoming.getComputedValue() != null) existing.setComputedValue(incoming.getComputedValue());
                if (!incoming.isVisible()) existing.setVisible(false);
                if (incoming.getDynamicOptions() != null) existing.setDynamicOptions(incoming.getDynamicOptions());
                if (incoming.isRequired()) existing.setRequired(true);
                if (incoming.isDisabled()) existing.setDisabled(true);
                return existing;
            });
        }
        return new ArrayList<>(merged.values());
    }

    private LinkageEvaluateResultDTO evaluateSingleRule(LinkageRule rule, Map<String, Object> fieldValues) {
        String ruleType = rule.getRuleType();
        boolean conditionMet = true;
        if (rule.getConditionExpr() != null && !rule.getConditionExpr().isEmpty()) {
            conditionMet = expressionEngineService.evaluateCondition(rule.getConditionExpr(), fieldValues);
        }

        switch (ruleType == null ? "" : ruleType.toUpperCase()) {
            case "SHOW":
                return conditionMet
                        ? LinkageEvaluateResultDTO.visible(rule.getTargetField())
                        : LinkageEvaluateResultDTO.hidden(rule.getTargetField());
            case "HIDE":
                return conditionMet
                        ? LinkageEvaluateResultDTO.hidden(rule.getTargetField())
                        : LinkageEvaluateResultDTO.visible(rule.getTargetField());
            case "COMPUTE": {
                if (rule.getExpression() != null && !rule.getExpression().isEmpty()) {
                    Object computed = expressionEngineService.evaluate(rule.getExpression(), fieldValues);
                    LinkageEvaluateResultDTO r = LinkageEvaluateResultDTO.computed(rule.getTargetField(), computed);
                    if (!conditionMet) r.setComputedValue(null);
                    return r;
                }
                return null;
            }
            case "DYNAMIC_OPTIONS": {
                if (rule.getDynamicOptionsUrl() != null && !rule.getDynamicOptionsUrl().isEmpty()) {
                    String url = expressionEngineService.evaluateTemplate(rule.getDynamicOptionsUrl(), fieldValues);
                    List<Map<String, String>> options = dynamicDataSourceService.fetchOptions(url);
                    LinkageEvaluateResultDTO r = LinkageEvaluateResultDTO.withOptions(rule.getTargetField(), options);
                    if (!conditionMet) r.setDynamicOptions(null);
                    return r;
                }
                return null;
            }
            case "REQUIRED":
                if (conditionMet) {
                    LinkageEvaluateResultDTO r = LinkageEvaluateResultDTO.visible(rule.getTargetField());
                    r.setRequired(true);
                    return r;
                }
                return LinkageEvaluateResultDTO.visible(rule.getTargetField());
            case "DISABLED":
                if (conditionMet) {
                    LinkageEvaluateResultDTO r = LinkageEvaluateResultDTO.visible(rule.getTargetField());
                    r.setDisabled(true);
                    return r;
                }
                return LinkageEvaluateResultDTO.visible(rule.getTargetField());
            default:
                log.warn("未知联动规则类型: {}", ruleType);
                return null;
        }
    }
}
