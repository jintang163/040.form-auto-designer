package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.FieldValidateDTO;
import com.formdesigner.dto.FormValidateDTO;
import com.formdesigner.entity.FieldValueStats;
import com.formdesigner.entity.FormField;
import com.formdesigner.mapper.FieldValueStatsMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.service.SmartRecommendService;
import com.formdesigner.service.ValidationService;
import com.formdesigner.vo.FieldRecommendationVO;
import com.formdesigner.vo.FieldValidationResultVO;
import com.formdesigner.vo.FormValidationResultVO;
import com.formdesigner.vo.ValidationRuleVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ValidationServiceImpl implements ValidationService {

    private final FormFieldMapper formFieldMapper;
    private final FieldValueStatsMapper statsMapper;
    private final SmartRecommendService smartRecommendService;
    private final ObjectMapper objectMapper;

    private static final Map<String, ValidationRuleVO> BUILTIN_RULES = new LinkedHashMap<>();
    private static final Map<String, Pattern> COMPILED_PATTERNS = new HashMap<>();

    static {
        initBuiltinRules();
    }

    private static void initBuiltinRules() {
        addRule("phone", "手机号格式", "^1[3-9]\\d{9}$", "手机号格式应为11位，以1开头", 1);
        addRule("email", "邮箱格式", "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", "邮箱格式不正确，示例：name@example.com", 1);
        addRule("idCard", "身份证号", "^\\d{17}[\\dXx]$", "身份证号格式不正确，应为18位", 1);
        addRule("postalCode", "邮政编码", "^\\d{6}$", "邮政编码应为6位数字", 2);
        addRule("bankCard", "银行卡号", "^\\d{16,19}$", "银行卡号应为16-19位数字", 2);
        addRule("url", "URL格式", "^https?://.*", "URL格式不正确，应以http://或https://开头", 2);
        addRule("chinese", "中文姓名", "^[\\u4e00-\\u9fa5·]{2,20}$", "请输入正确的中文姓名", 2);
        addRule("passport", "护照号", "^[A-Za-z0-9]{5,17}$", "护照号格式不正确", 2);
        addRule("carPlate", "车牌号", "^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{5,6}$", "车牌号格式不正确", 3);
        addRule("qq", "QQ号", "^[1-9]\\d{4,10}$", "QQ号格式不正确", 3);
        addRule("wechat", "微信号", "^[a-zA-Z][a-zA-Z0-9_-]{5,19}$", "微信号格式不正确，6-20位字母、数字、下划线或减号", 3);
    }

    private static void addRule(String ruleType, String ruleName, String pattern, String message, int priority) {
        ValidationRuleVO rule = new ValidationRuleVO();
        rule.setRuleType(ruleType);
        rule.setRuleName(ruleName);
        rule.setPattern(pattern);
        rule.setMessage(message);
        rule.setPriority(priority);
        rule.setEnabled(true);
        BUILTIN_RULES.put(ruleType, rule);
        COMPILED_PATTERNS.put(ruleType, Pattern.compile(pattern));
    }

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    public List<ValidationRuleVO> getBuiltinRules() {
        return new ArrayList<>(BUILTIN_RULES.values());
    }

    @Override
    public List<ValidationRuleVO> getFieldRules(Long templateId, String fieldName) {
        List<ValidationRuleVO> rules = new ArrayList<>();
        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(templateId, fieldName, currentTenantId());
        if (field == null) {
            return rules;
        }

        if (field.getValidationRules() != null && !field.getValidationRules().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> ruleConfig = objectMapper.readValue(field.getValidationRules(), Map.class);
                String pattern = (String) ruleConfig.get("pattern");
                if (pattern != null && !pattern.isEmpty()) {
                    if (BUILTIN_RULES.containsKey(pattern)) {
                        rules.add(BUILTIN_RULES.get(pattern));
                    } else {
                        ValidationRuleVO customRule = new ValidationRuleVO();
                        customRule.setRuleType("custom");
                        customRule.setRuleName("自定义规则");
                        customRule.setPattern(pattern);
                        customRule.setMessage((String) ruleConfig.getOrDefault("message", "格式不正确"));
                        customRule.setPriority(5);
                        customRule.setEnabled(true);
                        rules.add(customRule);
                    }
                }

                Object minLen = ruleConfig.get("minLength");
                Object maxLen = ruleConfig.get("maxLength");
                Object min = ruleConfig.get("min");
                Object max = ruleConfig.get("max");
                Boolean required = (Boolean) ruleConfig.get("required");

                if (Boolean.TRUE.equals(required) || Boolean.TRUE.equals(field.getRequired())) {
                    ValidationRuleVO requiredRule = new ValidationRuleVO();
                    requiredRule.setRuleType("required");
                    requiredRule.setRuleName("必填校验");
                    requiredRule.setMessage(field.getFieldLabel() + "不能为空");
                    requiredRule.setPriority(0);
                    requiredRule.setEnabled(true);
                    rules.add(0, requiredRule);
                }

                if (minLen != null) {
                    ValidationRuleVO rule = new ValidationRuleVO();
                    rule.setRuleType("minLength");
                    rule.setRuleName("最小长度");
                    rule.setMinValue(minLen);
                    rule.setMessage("最少输入" + minLen + "个字符");
                    rule.setPriority(4);
                    rule.setEnabled(true);
                    rules.add(rule);
                }

                if (maxLen != null) {
                    ValidationRuleVO rule = new ValidationRuleVO();
                    rule.setRuleType("maxLength");
                    rule.setRuleName("最大长度");
                    rule.setMaxValue(maxLen);
                    rule.setMessage("最多输入" + maxLen + "个字符");
                    rule.setPriority(4);
                    rule.setEnabled(true);
                    rules.add(rule);
                }

                if ("number".equals(field.getInputType())) {
                    if (min != null) {
                        ValidationRuleVO rule = new ValidationRuleVO();
                        rule.setRuleType("min");
                        rule.setRuleName("最小值");
                        rule.setMinValue(min);
                        rule.setMessage("不能小于" + min);
                        rule.setPriority(4);
                        rule.setEnabled(true);
                        rules.add(rule);
                    }
                    if (max != null) {
                        ValidationRuleVO rule = new ValidationRuleVO();
                        rule.setRuleType("max");
                        rule.setRuleName("最大值");
                        rule.setMaxValue(max);
                        rule.setMessage("不能大于" + max);
                        rule.setPriority(4);
                        rule.setEnabled(true);
                        rules.add(rule);
                    }
                }
            } catch (Exception e) {
                log.warn("解析字段校验规则失败: {}", e.getMessage());
            }
        }

        if (field.getRequired() != null && field.getRequired() && rules.stream().noneMatch(r -> "required".equals(r.getRuleType()))) {
            ValidationRuleVO requiredRule = new ValidationRuleVO();
            requiredRule.setRuleType("required");
            requiredRule.setRuleName("必填校验");
            requiredRule.setMessage(field.getFieldLabel() + "不能为空");
            requiredRule.setPriority(0);
            requiredRule.setEnabled(true);
            rules.add(0, requiredRule);
        }

        return rules;
    }

    @Override
    public FieldValidationResultVO validateField(FieldValidateDTO dto) {
        FieldValidationResultVO result = new FieldValidationResultVO();
        result.setFieldName(dto.getFieldName());
        result.setErrors(new ArrayList<>());
        result.setSuggestions(new ArrayList<>());
        result.setValid(true);

        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(
                dto.getTemplateId(), dto.getFieldName(), currentTenantId());

        if (field != null) {
            result.setFieldLabel(field.getFieldLabel());
        }

        List<ValidationRuleVO> rules = getFieldRules(dto.getTemplateId(), dto.getFieldName());
        Object value = dto.getFieldValue();

        for (ValidationRuleVO rule : rules) {
            FieldValidationResultVO.ValidationErrorVO error = applyRule(rule, value, field);
            if (error != null) {
                result.getErrors().add(error);
                result.setValid(false);
            }
        }

        if (dto.isEnableSuggestions() && result.isValid()) {
            generateSuggestions(result, dto, field);
        }

        if (dto.isEnableAutoCorrect() && !result.isValid()) {
            result.setAutoCorrectedValue(autoCorrectValue(
                    dto.getTemplateId(), dto.getFieldName(), value));
        }

        return result;
    }

    @Override
    public FormValidationResultVO validateForm(FormValidateDTO dto) {
        FormValidationResultVO result = new FormValidationResultVO();
        result.setTemplateId(dto.getTemplateId());
        result.setOverallValid(true);
        result.setFieldResults(new ArrayList<>());
        result.setTotalErrors(0);
        result.setTotalWarnings(0);
        result.setTotalSuggestions(0);

        List<FormField> fields = formFieldMapper.selectByTemplateId(
                dto.getTemplateId(), currentTenantId());

        Map<String, Object> fieldValues = dto.getFieldValues() != null
                ? dto.getFieldValues()
                : Collections.emptyMap();

        for (FormField field : fields) {
            if (dto.isPartialValidation() && !fieldValues.containsKey(field.getFieldName())) {
                continue;
            }

            FieldValidateDTO fieldDto = new FieldValidateDTO();
            fieldDto.setTemplateId(dto.getTemplateId());
            fieldDto.setFieldName(field.getFieldName());
            fieldDto.setFieldValue(fieldValues.get(field.getFieldName()));
            fieldDto.setSubmitterId(dto.getSubmitterId());
            fieldDto.setEnableSuggestions(dto.isEnableSuggestions());
            fieldDto.setEnableAutoCorrect(dto.isEnableAutoCorrect());
            fieldDto.setContextData(fieldValues);

            FieldValidationResultVO fieldResult = validateField(fieldDto);
            result.getFieldResults().add(fieldResult);

            if (!fieldResult.isValid()) {
                result.setOverallValid(false);
            }
            result.setTotalErrors(result.getTotalErrors() +
                    (int) fieldResult.getErrors().stream()
                            .filter(e -> e.getSeverity() != null && e.getSeverity() >= 2).count());
            result.setTotalWarnings(result.getTotalWarnings() +
                    (int) fieldResult.getErrors().stream()
                            .filter(e -> e.getSeverity() != null && e.getSeverity() == 1).count());
            result.setTotalSuggestions(result.getTotalSuggestions() +
                    fieldResult.getSuggestions().size());
        }

        return result;
    }

    @Override
    public String autoCorrectValue(Long templateId, String fieldName, Object value) {
        if (value == null) return null;
        String strValue = String.valueOf(value).trim();

        if (strValue.isEmpty()) return null;

        strValue = strValue.replaceAll("\\s+", "");

        if (fieldName.contains("phone") || fieldName.contains("mobile") || fieldName.contains("电话")) {
            String digits = strValue.replaceAll("\\D", "");
            if (digits.length() == 11 && digits.startsWith("86")) {
                return digits.substring(2);
            }
            if (digits.length() == 13 && digits.startsWith("0086")) {
                return digits.substring(4);
            }
            return digits;
        }

        if (fieldName.contains("idCard") || fieldName.contains("身份证")) {
            return strValue.toUpperCase();
        }

        if (fieldName.contains("email") || fieldName.contains("邮箱")) {
            return strValue.toLowerCase();
        }

        List<FieldValueStats> topValues = statsMapper.selectTopNGlobal(templateId, fieldName, 5, currentTenantId());
        if (topValues != null && !topValues.isEmpty()) {
            for (FieldValueStats stat : topValues) {
                String validValue = stat.getFieldValue();
                if (calculateSimilarity(strValue, validValue) > 0.85) {
                    return validValue;
                }
            }
        }

        return null;
    }

    private FieldValidationResultVO.ValidationErrorVO applyRule(
            ValidationRuleVO rule, Object value, FormField field) {
        String ruleType = rule.getRuleType();

        if ("required".equals(ruleType)) {
            if (!isValuePresent(value)) {
                return buildError("REQUIRED", rule.getMessage(), ruleType, 2);
            }
            return null;
        }

        if (!isValuePresent(value)) {
            return null;
        }

        String strValue = String.valueOf(value);

        switch (ruleType) {
            case "minLength": {
                int min = ((Number) rule.getMinValue()).intValue();
                if (strValue.length() < min) {
                    return buildError("MIN_LENGTH", rule.getMessage(), ruleType, 1);
                }
                break;
            }
            case "maxLength": {
                int max = ((Number) rule.getMaxValue()).intValue();
                if (strValue.length() > max) {
                    return buildError("MAX_LENGTH", rule.getMessage(), ruleType, 1);
                }
                break;
            }
            case "min": {
                try {
                    double numVal = Double.parseDouble(strValue);
                    double min = ((Number) rule.getMinValue()).doubleValue();
                    if (numVal < min) {
                        return buildError("MIN_VALUE", rule.getMessage(), ruleType, 2);
                    }
                } catch (NumberFormatException e) {
                    return buildError("NOT_NUMBER", "请输入有效数字", ruleType, 2);
                }
                break;
            }
            case "max": {
                try {
                    double numVal = Double.parseDouble(strValue);
                    double max = ((Number) rule.getMaxValue()).doubleValue();
                    if (numVal > max) {
                        return buildError("MAX_VALUE", rule.getMessage(), ruleType, 2);
                    }
                } catch (NumberFormatException e) {
                    return buildError("NOT_NUMBER", "请输入有效数字", ruleType, 2);
                }
                break;
            }
            default: {
                Pattern pattern = COMPILED_PATTERNS.get(ruleType);
                if (pattern == null && rule.getPattern() != null) {
                    try {
                        pattern = Pattern.compile(rule.getPattern());
                    } catch (Exception ignored) {}
                }
                if (pattern != null && !pattern.matcher(strValue).matches()) {
                    return buildError("PATTERN_MISMATCH", rule.getMessage(), ruleType, 2);
                }
            }
        }

        return null;
    }

    private void generateSuggestions(
            FieldValidationResultVO result,
            FieldValidateDTO dto,
            FormField field) {
        if (field == null) return;
        Object value = dto.getFieldValue();
        if (!isValuePresent(value)) return;

        String inputType = field.getInputType();
        String fieldName = field.getFieldName();
        String strValue = String.valueOf(value);

        if (isAddressField(fieldName, field.getFieldLabel())) {
            generateAddressSuggestions(result, strValue);
        }

        if ("select".equals(inputType) || "text".equals(inputType)) {
            generateHistoricalSuggestions(result, dto);
        }

        if (isTypoLikely(strValue, fieldName)) {
            generateTypoSuggestions(result, dto, strValue);
        }
    }

    private boolean isAddressField(String fieldName, String fieldLabel) {
        String lower = (fieldName + " " + (fieldLabel != null ? fieldLabel : "")).toLowerCase();
        return lower.contains("address") || lower.contains("地址") || lower.contains("addr");
    }

    private void generateAddressSuggestions(FieldValidationResultVO result, String value) {
        if (value.length() < 3) return;

        List<String[]> commonAddresses = Arrays.asList(
                new String[]{"北京市", "北京市", "东城区"},
                new String[]{"上海市", "上海市", "浦东新区"},
                new String[]{"广东省", "广州市", "天河区"},
                new String[]{"广东省", "深圳市", "南山区"},
                new String[]{"浙江省", "杭州市", "西湖区"},
                new String[]{"江苏省", "南京市", "鼓楼区"},
                new String[]{"四川省", "成都市", "锦江区"},
                new String[]{"湖北省", "武汉市", "武昌区"}
        );

        for (String[] addr : commonAddresses) {
            String full = String.join("", addr);
            if (full.contains(value) || value.contains(addr[0]) || value.contains(addr[1])) {
                FieldValidationResultVO.ValidationSuggestionVO suggestion =
                        new FieldValidationResultVO.ValidationSuggestionVO();
                suggestion.setSuggestionType("ADDRESS_AUTOCOMPLETE");
                suggestion.setSuggestionMessage("建议补全地址");
                suggestion.setSuggestedValue(full);
                suggestion.setConfidence(0.75);
                suggestion.setSource("RULE_BASED");
                result.getSuggestions().add(suggestion);
                break;
            }
        }
    }

    private void generateHistoricalSuggestions(
            FieldValidationResultVO result, FieldValidateDTO dto) {
        try {
            FieldRecommendationVO recommendation = smartRecommendService.getFieldRecommendations(
                    dto.getTemplateId(), dto.getFieldName(), dto.getSubmitterId());

            if (recommendation != null && recommendation.getItems() != null) {
                for (FieldRecommendationVO.RecommendedItem item : recommendation.getItems()) {
                    if (item.getValue().equals(String.valueOf(dto.getFieldValue()))) {
                        continue;
                    }
                    FieldValidationResultVO.ValidationSuggestionVO suggestion =
                            new FieldValidationResultVO.ValidationSuggestionVO();
                    suggestion.setSuggestionType("HISTORICAL");
                    suggestion.setSuggestionMessage(
                            String.format("您之前填写过 \"%s\" (使用%d次)", item.getValue(),
                                    item.getFrequency() != null ? item.getFrequency() : 1));
                    suggestion.setSuggestedValue(item.getValue());
                    suggestion.setConfidence(item.getScore() != null ? item.getScore() : 0.5);
                    suggestion.setSource("HISTORY_" + (item.getSource() != null ? item.getSource() : "UNKNOWN");
                    result.getSuggestions().add(suggestion);
                }
            }
        } catch (Exception e) {
            log.debug("生成历史建议失败: {}", e.getMessage());
        }
    }

    private void generateTypoSuggestions(
            FieldValidationResultVO result, FieldValidateDTO dto, String strValue) {
        try {
            List<FieldValueStats> topValues = statsMapper.selectTopNGlobal(
                    dto.getTemplateId(), dto.getFieldName(), 10, currentTenantId());

            if (topValues == null) return;

            for (FieldValueStats stat : topValues) {
                String validValue = stat.getFieldValue();
                double similarity = calculateSimilarity(strValue, validValue);
                if (similarity > 0.7 && similarity < 0.98) {
                    FieldValidationResultVO.ValidationSuggestionVO suggestion =
                            new FieldValidationResultVO.ValidationSuggestionVO();
                    suggestion.setSuggestionType("TYPO_CORRECTION");
                    suggestion.setSuggestionMessage(
                            String.format("您是否想输入 \"%s\"？", validValue));
                    suggestion.setSuggestedValue(validValue);
                    suggestion.setConfidence(similarity);
                    suggestion.setSource("SIMILARITY_MATCH");
                    result.getSuggestions().add(suggestion);
                    break;
                }
            }
        } catch (Exception e) {
            log.debug("生成拼写建议失败: {}", e.getMessage());
        }
    }

    private boolean isTypoLikely(String value, String fieldName) {
        if (value.length() < 4) return false;
        String lower = fieldName.toLowerCase();
        return lower.contains("name") || lower.contains("姓名")
                || lower.contains("address") || lower.contains("地址")
                || lower.contains("company") || lower.contains("公司");
    }

    private double calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0;
        if (s1.equals(s2)) return 1.0;
        if (s1.length() == 0 || s2.length() == 0) return 0;

        int dist = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
        int maxLen = Math.max(s1.length(), s2.length());
        return 1.0 - ((double) dist / maxLen);
    }

    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= s2.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[s1.length()][s2.length()];
    }

    private boolean isValuePresent(Object value) {
        if (value == null) return false;
        if (value instanceof String) return !((String) value).trim().isEmpty();
        if (value instanceof Collection) return !((Collection<?>) value).isEmpty();
        if (value.getClass().isArray()) return ((Object[]) value).length > 0;
        return true;
    }

    private FieldValidationResultVO.ValidationErrorVO buildError(
            String code, String message, String ruleType, int severity) {
        FieldValidationResultVO.ValidationErrorVO error =
                new FieldValidationResultVO.ValidationErrorVO();
        error.setErrorCode(code);
        error.setErrorMessage(message);
        error.setRuleType(ruleType);
        error.setSeverity(severity);
        return error;
    }
}
