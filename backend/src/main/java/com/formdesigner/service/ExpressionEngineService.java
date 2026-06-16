package com.formdesigner.service;

import java.util.Map;

public interface ExpressionEngineService {

    Object evaluate(String expression, Map<String, Object> context);

    boolean evaluateCondition(String conditionExpr, Map<String, Object> context);

    String evaluateTemplate(String template, Map<String, Object> context);
}
