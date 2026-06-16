package com.formdesigner.service.impl;

import com.googlecode.aviator.AviatorEvaluator;
import com.formdesigner.service.ExpressionEngineService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class ExpressionEngineServiceImpl implements ExpressionEngineService {

    @Override
    public Object evaluate(String expression, Map<String, Object> context) {
        try {
            return AviatorEvaluator.execute(expression, context, true);
        } catch (Exception e) {
            log.error("表达式求值失败: expr={}, error={}", expression, e.getMessage());
            return null;
        }
    }

    @Override
    public boolean evaluateCondition(String conditionExpr, Map<String, Object> context) {
        try {
            Object result = AviatorEvaluator.execute(conditionExpr, context, true);
            if (result instanceof Boolean) {
                return (Boolean) result;
            }
            if (result instanceof Number) {
                return ((Number) result).doubleValue() != 0;
            }
            return result != null;
        } catch (Exception e) {
            log.error("条件表达式求值失败: expr={}, error={}", conditionExpr, e.getMessage());
            return false;
        }
    }

    @Override
    public String evaluateTemplate(String template, Map<String, Object> context) {
        if (template == null || !template.contains("#{")) {
            return template;
        }
        String result = template;
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            String placeholder = "#{" + entry.getKey() + "}";
            if (result.contains(placeholder)) {
                result = result.replace(placeholder, String.valueOf(entry.getValue()));
            }
        }
        return result;
    }
}
