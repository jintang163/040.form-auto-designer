package com.formdesigner.service;

import com.formdesigner.dto.LinkageEvaluateResultDTO;
import com.formdesigner.entity.LinkageRule;
import java.util.List;
import java.util.Map;

public interface LinkageRuleService {

    LinkageRule create(LinkageRule rule);

    LinkageRule update(LinkageRule rule);

    void deleteById(Long id);

    LinkageRule getById(Long id);

    List<LinkageRule> listByTemplateId(Long templateId);

    List<LinkageRule> listBySourceField(Long templateId, String sourceField);

    List<LinkageRule> listAll();

    List<LinkageEvaluateResultDTO> evaluate(Long templateId, String sourceField, Map<String, Object> fieldValues);

    List<LinkageEvaluateResultDTO> evaluateAll(Long templateId, Map<String, Object> fieldValues);
}
