package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.FieldValueStats;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormField;
import com.formdesigner.mapper.FieldValueStatsMapper;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.service.AiRecommendService;
import com.formdesigner.service.SmartRecommendService;
import com.formdesigner.vo.ContextRecommendationVO;
import com.formdesigner.vo.FieldRecommendationVO;
import com.formdesigner.vo.FormRecommendationVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmartRecommendServiceImpl implements SmartRecommendService {

    private static final String GLOBAL_USER = "__GLOBAL__";
    private static final int MAX_RECOMMENDATIONS = 5;
    private static final double USER_WEIGHT = 0.6;
    private static final double COLLAB_WEIGHT = 0.25;
    private static final double GLOBAL_WEIGHT = 0.15;

    private final FieldValueStatsMapper statsMapper;
    private final FormDataMapper formDataMapper;
    private final FormFieldMapper formFieldMapper;
    private final ObjectMapper objectMapper;
    private final AiRecommendService aiRecommendService;

    private Long currentTenantId() { Long tid = TenantContext.getTenantId(); return tid != null ? tid : 1L; }

    @Override
    public FormRecommendationVO getRecommendations(Long templateId, String submitterId) {
        FormRecommendationVO vo = new FormRecommendationVO();
        vo.setTemplateId(templateId);
        vo.setSubmitterId(submitterId);

        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
        Map<String, FieldRecommendationVO> recommendationMap = new LinkedHashMap<>();

        List<Map<String, Object>> fieldDefinitions = buildFieldDefinitions(fields);
        Map<String, Object> latestFilledValues = getLatestFilledValues(templateId, submitterId);

        List<FieldRecommendationVO> typeRecs = aiRecommendService.getFieldTypeRecommendations(
                templateId, latestFilledValues, fieldDefinitions, null, null);
        boolean aiAvailable = typeRecs != null && !typeRecs.isEmpty();
        for (FieldRecommendationVO rec : typeRecs) {
            enrichRecommendation(rec, fields);
            if (rec.getConfidence() > 0
                    || (rec.getFillHint() != null && !rec.getFillHint().isEmpty())
                    || (rec.getExampleValues() != null && rec.getExampleValues().length > 0)) {
                recommendationMap.put(rec.getFieldName(), rec);
            }
        }

        if (!aiAvailable) {
            for (FormField field : fields) {
                if (!isRecommendableField(field)) continue;
                FieldRecommendationVO fallback = generateFallbackRecommendation(field);
                if (fallback != null) {
                    recommendationMap.put(fallback.getFieldName(), fallback);
                }
            }
        }

        List<ContextRecommendationVO> contextRecs = aiRecommendService.getContextRecommendations(
                templateId, latestFilledValues, fieldDefinitions, null, null);
        for (ContextRecommendationVO ctxRec : contextRecs) {
            FieldRecommendationVO existing = recommendationMap.get(ctxRec.getTargetField());
            if (existing == null || ctxRec.getConfidence() > existing.getConfidence()) {
                FieldRecommendationVO rec = new FieldRecommendationVO();
                rec.setFieldName(ctxRec.getTargetField());
                rec.setRecommendedValue(ctxRec.getSuggestedValue() != null ? String.valueOf(ctxRec.getSuggestedValue()) : null);
                rec.setConfidence(ctxRec.getConfidence());
                rec.setSource(ctxRec.getSource());
                rec.setExplanation(ctxRec.getExplanation());
                if (ctxRec.getRelatedFields() != null) {
                    rec.setRelatedFields(ctxRec.getRelatedFields().toArray(new String[0]));
                }
                enrichRecommendation(rec, fields);
                recommendationMap.put(rec.getFieldName(), rec);
            }
        }

        for (FormField field : fields) {
            if (!isRecommendableField(field)) continue;
            if (recommendationMap.containsKey(field.getFieldName())) {
                FieldRecommendationVO existing = recommendationMap.get(field.getFieldName());
                FieldRecommendationVO historyRec = getFieldRecommendations(templateId, field.getFieldName(), submitterId);
                if (historyRec != null && historyRec.getItems() != null && historyRec.getItems().length > 0) {
                    existing.setItems(historyRec.getItems());
                    if (existing.getConfidence() < 0.5 && historyRec.getConfidence() > existing.getConfidence()) {
                        existing.setRecommendedValue(historyRec.getRecommendedValue());
                        existing.setConfidence(historyRec.getConfidence());
                        existing.setSource(historyRec.getSource() != null ? historyRec.getSource() : "HISTORY");
                    }
                }
            } else {
                FieldRecommendationVO rec = getFieldRecommendations(templateId, field.getFieldName(), submitterId);
                if (rec != null && rec.getItems() != null && rec.getItems().length > 0) {
                    enrichRecommendation(rec, fields);
                    rec.setSource("HISTORY");
                    recommendationMap.put(rec.getFieldName(), rec);
                }
            }
        }

        List<FieldRecommendationVO> fieldRecs = new ArrayList<>(recommendationMap.values());
        fieldRecs.sort((a, b) -> Double.compare(b.getConfidence(), a.getConfidence()));

        vo.setFields(fieldRecs);
        return vo;
    }

    private List<Map<String, Object>> buildFieldDefinitions(List<FormField> fields) {
        List<Map<String, Object>> definitions = new ArrayList<>();
        for (FormField field : fields) {
            Map<String, Object> def = new LinkedHashMap<>();
            def.put("fieldName", field.getFieldName());
            def.put("fieldLabel", field.getFieldLabel());
            def.put("inputType", field.getInputType());
            def.put("fieldType", field.getFieldType());
            definitions.add(def);
        }
        return definitions;
    }

    private Map<String, Object> getLatestFilledValues(Long templateId, String submitterId) {
        Map<String, Object> values = new LinkedHashMap<>();
        if (submitterId == null || submitterId.isEmpty()) {
            return values;
        }
        try {
            List<FormData> userHistory = formDataMapper.selectBySubmitterId(templateId, submitterId);
            if (!userHistory.isEmpty()) {
                FormData latest = userHistory.get(0);
                if (latest.getFieldValuesJson() != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = objectMapper.readValue(latest.getFieldValuesJson(), Map.class);
                    values.putAll(parsed);
                }
            }
        } catch (Exception e) {
            log.warn("获取历史填写值失败: {}", e.getMessage());
        }
        return values;
    }

    private void enrichRecommendation(FieldRecommendationVO rec, List<FormField> fields) {
        for (FormField field : fields) {
            if (field.getFieldName().equals(rec.getFieldName())) {
                rec.setFieldLabel(field.getFieldLabel());
                rec.setInputType(field.getInputType());
                break;
            }
        }
    }

    @Override
    public FieldRecommendationVO getFieldRecommendations(Long templateId, String fieldName, String submitterId) {
        FieldRecommendationVO vo = new FieldRecommendationVO();
        vo.setFieldName(fieldName);

        Map<String, Double> scoreMap = new LinkedHashMap<>();
        Map<String, FieldRecommendationVO.RecommendedItem> itemMap = new LinkedHashMap<>();

        if (submitterId != null && !submitterId.isEmpty()) {
            List<FieldValueStats> userStats = statsMapper.selectTopNBySubmitter(
                    templateId, fieldName, submitterId, 10, currentTenantId());
            for (FieldValueStats s : userStats) {
                double score = s.getFrequency() * USER_WEIGHT;
                scoreMap.merge(s.getFieldValue(), score, Double::sum);
                FieldRecommendationVO.RecommendedItem item = buildItem(s, score, "USER_HISTORY");
                itemMap.put(s.getFieldValue(), item);
            }

            Map<String, Double> collabScores = computeCollaborativeFiltering(templateId, fieldName, submitterId);
            for (Map.Entry<String, Double> entry : collabScores.entrySet()) {
                double score = entry.getValue() * COLLAB_WEIGHT;
                scoreMap.merge(entry.getKey(), score, Double::sum);
                FieldRecommendationVO.RecommendedItem item = itemMap.get(entry.getKey());
                if (item == null) {
                    item = new FieldRecommendationVO.RecommendedItem();
                    item.setValue(entry.getKey());
                    item.setFrequency(0);
                    itemMap.put(entry.getKey(), item);
                }
                item.setScore(scoreMap.get(entry.getKey()));
                if (!"USER_HISTORY".equals(item.getSource())) {
                    item.setSource("COLLABORATIVE");
                }
            }
        }

        List<FieldValueStats> globalStats = statsMapper.selectTopNGlobal(templateId, fieldName, 10);
        for (FieldValueStats s : globalStats) {
            double score = s.getFrequency() * GLOBAL_WEIGHT;
            scoreMap.merge(s.getFieldValue(), score, Double::sum);
            FieldRecommendationVO.RecommendedItem item = itemMap.get(s.getFieldValue());
            if (item == null) {
                item = new FieldRecommendationVO.RecommendedItem();
                item.setValue(s.getFieldValue());
                item.setSource("GLOBAL");
                itemMap.put(s.getFieldValue(), item);
            }
            item.setFrequency(s.getFrequency());
            item.setScore(scoreMap.get(s.getFieldValue()));
        }

        List<FieldRecommendationVO.RecommendedItem> sorted = scoreMap.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(MAX_RECOMMENDATIONS)
                .map(e -> {
                    FieldRecommendationVO.RecommendedItem item = itemMap.get(e.getKey());
                    item.setScore(Math.round(e.getValue() * 100.0) / 100.0);
                    return item;
                })
                .collect(Collectors.toList());

        vo.setItems(sorted.toArray(new FieldRecommendationVO.RecommendedItem[0]));

        if (!sorted.isEmpty()) {
            vo.setRecommendedValue(sorted.get(0).getValue());
            double totalScore = scoreMap.values().stream().mapToDouble(Double::doubleValue).sum();
            vo.setConfidence(totalScore > 0 ? Math.round(sorted.get(0).getScore() / totalScore * 100.0) / 100.0 : 0);
        }

        return vo;
    }

    @Override
    @Transactional
    public void recordSubmission(Long templateId, String submitterId, String fieldValuesJson) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> values = objectMapper.readValue(fieldValuesJson, Map.class);
            LocalDateTime now = LocalDateTime.now();

            for (Map.Entry<String, Object> entry : values.entrySet()) {
                String fieldName = entry.getKey();
                String fieldValue = entry.getValue() != null ? String.valueOf(entry.getValue()) : null;
                if (fieldValue == null || fieldValue.trim().isEmpty()) continue;

                FieldValueStats userStat = new FieldValueStats();
                userStat.setTemplateId(templateId);
                userStat.setFieldName(fieldName);
                userStat.setFieldValue(fieldValue);
                userStat.setSubmitterId(submitterId != null ? submitterId : GLOBAL_USER);
                userStat.setLastUsedAt(now);
                userStat.setUpdatedAt(now);
                userStat.setTenantId(currentTenantId());
                statsMapper.upsertIncrement(userStat);

                FieldValueStats globalStat = new FieldValueStats();
                globalStat.setTemplateId(templateId);
                globalStat.setFieldName(fieldName);
                globalStat.setFieldValue(fieldValue);
                globalStat.setSubmitterId(GLOBAL_USER);
                globalStat.setLastUsedAt(now);
                globalStat.setUpdatedAt(now);
                globalStat.setTenantId(currentTenantId());
                statsMapper.upsertIncrement(globalStat);
            }

            log.debug("记录字段值统计成功, templateId={}, submitterId={}", templateId, submitterId);
        } catch (Exception e) {
            log.warn("记录字段值统计失败: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void rebuildStats(Long templateId) {
        statsMapper.deleteByTemplateId(templateId, currentTenantId());

        List<FormData> allData = formDataMapper.selectByTemplateId(templateId);
        for (FormData fd : allData) {
            recordSubmission(templateId, fd.getSubmitterId(), fd.getFieldValuesJson());
        }
        log.info("重建统计完成, templateId={}, 共{}条记录", templateId, allData.size());
    }

    private Map<String, Double> computeCollaborativeFiltering(Long templateId, String fieldName, String submitterId) {
        List<FormData> userHistory = formDataMapper.selectBySubmitterId(templateId, submitterId);

        Map<String, Integer> userProfile = buildFieldProfileFromStats(templateId, fieldName, submitterId);
        if (userProfile.isEmpty() && !userHistory.isEmpty()) {
            userProfile = buildFieldProfile(userHistory, fieldName);
        }
        if (userProfile.isEmpty()) return Collections.emptyMap();

        List<FieldValueStats> allPerUserStats = statsMapper.selectAllPerUserByTemplateIdAndFieldName(templateId, fieldName);
        Map<String, Map<String, Integer>> otherUserProfiles = new HashMap<>();
        for (FieldValueStats stat : allPerUserStats) {
            otherUserProfiles
                    .computeIfAbsent(stat.getSubmitterId(), k -> new HashMap<>())
                    .put(stat.getFieldValue(), stat.getFrequency());
        }

        Map<String, Double> similarityScores = new HashMap<>();
        for (Map.Entry<String, Map<String, Integer>> entry : otherUserProfiles.entrySet()) {
            String otherUserId = entry.getKey();
            if (otherUserId.equals(submitterId) || GLOBAL_USER.equals(otherUserId)) continue;
            double similarity = cosineSimilarity(userProfile, entry.getValue());
            if (similarity > 0.1) {
                similarityScores.put(otherUserId, similarity);
            }
        }

        Map<String, Double> collabRecommendations = new HashMap<>();
        for (Map.Entry<String, Double> simEntry : similarityScores.entrySet()) {
            String otherUserId = simEntry.getKey();
            double similarity = simEntry.getValue();

            Map<String, Integer> otherProfile = otherUserProfiles.get(otherUserId);
            for (Map.Entry<String, Integer> valEntry : otherProfile.entrySet()) {
                if (!userProfile.containsKey(valEntry.getKey())) {
                    collabRecommendations.merge(valEntry.getKey(),
                            valEntry.getValue() * similarity, Double::sum);
                }
            }
        }

        return collabRecommendations.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(MAX_RECOMMENDATIONS)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    private Map<String, Integer> buildFieldProfile(List<FormData> userHistory, String targetFieldName) {
        Map<String, Integer> profile = new HashMap<>();
        for (FormData fd : userHistory) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> values = objectMapper.readValue(fd.getFieldValuesJson(), Map.class);
                Object val = values.get(targetFieldName);
                if (val != null) {
                    String strVal = String.valueOf(val);
                    if (!strVal.trim().isEmpty()) {
                        profile.merge(strVal, 1, Integer::sum);
                    }
                }
            } catch (Exception ignored) {}
        }
        return profile;
    }

    private Map<String, Integer> buildFieldProfileFromStats(Long templateId, String fieldName, String submitterId) {
        Map<String, Integer> profile = new HashMap<>();
        List<FieldValueStats> userStats = statsMapper.selectByTemplateIdAndFieldName(
                templateId, fieldName, submitterId);
        for (FieldValueStats s : userStats) {
            if (s.getFieldValue() != null && !s.getFieldValue().trim().isEmpty()) {
                profile.put(s.getFieldValue(), s.getFrequency() != null ? s.getFrequency() : 1);
            }
        }
        return profile;
    }

    private double cosineSimilarity(Map<String, Integer> profileA, Map<String, Integer> profileB) {
        Set<String> allKeys = new HashSet<>();
        allKeys.addAll(profileA.keySet());
        allKeys.addAll(profileB.keySet());

        if (allKeys.isEmpty()) return 0.0;

        double dotProduct = 0;
        double normA = 0;
        double normB = 0;

        for (String key : allKeys) {
            int a = profileA.getOrDefault(key, 0);
            int b = profileB.getOrDefault(key, 0);
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA == 0 || normB == 0) return 0.0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private boolean isRecommendableField(FormField field) {
        String inputType = field.getInputType();
        return "text".equals(inputType) || "select".equals(inputType)
                || "textarea".equals(inputType) || "number".equals(inputType)
                || "date".equals(inputType) || "multiSelect".equals(inputType)
                || "radio".equals(inputType);
    }

    private FieldRecommendationVO.RecommendedItem buildItem(FieldValueStats stats, double score, String source) {
        FieldRecommendationVO.RecommendedItem item = new FieldRecommendationVO.RecommendedItem();
        item.setValue(stats.getFieldValue());
        item.setFrequency(stats.getFrequency());
        item.setScore(score);
        item.setSource(source);
        return item;
    }

    private FieldRecommendationVO generateFallbackRecommendation(FormField field) {
        String inputType = field.getInputType();
        String fieldLabel = field.getFieldLabel() != null ? field.getFieldLabel() : "";
        String fieldName = field.getFieldName();
        FieldRecommendationVO rec = new FieldRecommendationVO();
        rec.setFieldName(fieldName);
        rec.setFieldLabel(fieldLabel);
        rec.setInputType(inputType);
        rec.setSource("TYPE_BASED");

        LocalDate today = LocalDate.now();
        String lowerLabel = fieldLabel.toLowerCase();
        String lowerName = fieldName.toLowerCase();

        switch (inputType) {
            case "date":
                rec.setRecommendedValue(today.format(DateTimeFormatter.ISO_LOCAL_DATE));
                rec.setConfidence(0.9);
                rec.setExplanation("日期默认为今天");
                rec.setFillHint("请选择日期，格式：YYYY-MM-DD");
                rec.setExampleValues(new String[]{
                        today.format(DateTimeFormatter.ISO_LOCAL_DATE),
                        today.minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE),
                        today.plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE)
                });
                break;
            case "number":
                if (lowerLabel.contains("年龄") || lowerName.contains("age")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请输入周岁年龄");
                    rec.setFillHint("请输入年龄，如：25");
                    rec.setExampleValues(new String[]{"25", "30", "45"});
                } else if (lowerLabel.contains("数量") || lowerName.contains("quantity") || lowerName.contains("count")) {
                    rec.setRecommendedValue("1");
                    rec.setConfidence(0.7);
                    rec.setExplanation("数量默认为1");
                    rec.setFillHint("请输入数量");
                    rec.setExampleValues(new String[]{"1", "5", "10"});
                } else {
                    rec.setRecommendedValue("0");
                    rec.setConfidence(0.5);
                    rec.setExplanation("数字字段默认值为0");
                    rec.setFillHint("请输入数字");
                    rec.setExampleValues(new String[]{"0", "100", "999"});
                }
                break;
            case "select":
            case "radio":
                if (lowerLabel.contains("性别") || lowerName.contains("gender") || lowerName.contains("sex")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请选择性别");
                    rec.setFillHint("请选择性别");
                    rec.setExampleValues(new String[]{"男", "女"});
                } else if (lowerLabel.contains("优先级") || lowerName.contains("priority")) {
                    rec.setRecommendedValue("中");
                    rec.setConfidence(0.75);
                    rec.setExplanation("优先级默认为中");
                    rec.setFillHint("请选择优先级");
                    rec.setExampleValues(new String[]{"低", "中", "高"});
                } else if (lowerLabel.contains("状态") || lowerName.contains("status")) {
                    rec.setRecommendedValue("待审批");
                    rec.setConfidence(0.8);
                    rec.setExplanation("状态默认为待审批");
                    rec.setFillHint("请选择状态");
                    rec.setExampleValues(new String[]{"待审批", "审批中", "已通过"});
                } else {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setFillHint("请选择" + fieldLabel);
                    return rec;
                }
                break;
            case "text":
                if (lowerLabel.contains("年份") || lowerName.contains("year")) {
                    rec.setRecommendedValue(String.valueOf(today.getYear()));
                    rec.setConfidence(0.95);
                    rec.setExplanation("年份默认为今年");
                    rec.setFillHint("请输入4位年份");
                    rec.setExampleValues(new String[]{String.valueOf(today.getYear()), String.valueOf(today.getYear() - 1)});
                } else if (lowerLabel.contains("月份") || lowerName.contains("month")) {
                    rec.setRecommendedValue(String.format("%02d", today.getMonthValue()));
                    rec.setConfidence(0.9);
                    rec.setExplanation("月份默认为本月");
                    rec.setFillHint("请输入月份，1-12");
                    rec.setExampleValues(new String[]{String.format("%02d", today.getMonthValue()), "01", "12"});
                } else if (lowerLabel.contains("手机") || lowerName.contains("phone") || lowerName.contains("mobile")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请输入11位手机号码");
                    rec.setFillHint("请输入11位手机号码");
                    rec.setExampleValues(new String[]{"13800138000", "13912345678"});
                } else if (lowerLabel.contains("邮箱") || lowerName.contains("email")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请输入有效邮箱地址");
                    rec.setFillHint("请输入有效邮箱地址");
                    rec.setExampleValues(new String[]{"user@example.com", "zhangsan@company.com"});
                } else if (lowerLabel.contains("身份证") || lowerName.contains("idcard") || lowerName.contains("id_card")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请输入18位身份证号码");
                    rec.setFillHint("请输入18位身份证号码");
                    rec.setExampleValues(new String[]{"110101199001011234"});
                } else if (lowerLabel.contains("国家") || lowerName.contains("country")) {
                    rec.setRecommendedValue("中国");
                    rec.setConfidence(0.8);
                    rec.setExplanation("国家默认为中国");
                    rec.setFillHint("请选择或输入国家名称");
                    rec.setExampleValues(new String[]{"中国", "美国", "日本"});
                } else if (lowerLabel.contains("民族") || lowerName.contains("nationality")) {
                    rec.setRecommendedValue("汉族");
                    rec.setConfidence(0.75);
                    rec.setExplanation("民族默认为汉族");
                    rec.setFillHint("请选择或输入民族");
                    rec.setExampleValues(new String[]{"汉族", "满族", "回族"});
                } else {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setFillHint("请输入" + fieldLabel);
                    return rec;
                }
                break;
            case "textarea":
                if (lowerLabel.contains("备注") || lowerName.contains("remark") || lowerName.contains("note")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("如有需要说明的事项请在此填写");
                    rec.setFillHint("请填写需要说明的内容");
                    rec.setExampleValues(new String[]{"无特殊说明"});
                } else if (lowerLabel.contains("原因") || lowerName.contains("reason")) {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setExplanation("请简要说明原因");
                    rec.setFillHint("请简要说明原因");
                    rec.setExampleValues(new String[]{"个人发展需要", "业务拓展需求"});
                } else {
                    rec.setRecommendedValue(null);
                    rec.setConfidence(0.0);
                    rec.setFillHint("请输入" + fieldLabel);
                    return rec;
                }
                break;
            case "multiSelect":
                rec.setRecommendedValue(null);
                rec.setConfidence(0.0);
                rec.setFillHint("请选择" + fieldLabel);
                return rec;
            default:
                return null;
        }

        return rec;
    }
}
