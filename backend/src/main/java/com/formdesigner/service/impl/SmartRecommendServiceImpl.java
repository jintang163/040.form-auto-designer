package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.entity.FieldValueStats;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormField;
import com.formdesigner.mapper.FieldValueStatsMapper;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.service.SmartRecommendService;
import com.formdesigner.vo.FieldRecommendationVO;
import com.formdesigner.vo.FormRecommendationVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    private Long currentTenantId() { Long tid = TenantContext.getTenantId(); return tid != null ? tid : 1L; }

    @Override
    public FormRecommendationVO getRecommendations(Long templateId, String submitterId) {
        FormRecommendationVO vo = new FormRecommendationVO();
        vo.setTemplateId(templateId);
        vo.setSubmitterId(submitterId);

        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
        List<FieldRecommendationVO> fieldRecs = new ArrayList<>();

        for (FormField field : fields) {
            if (!isRecommendableField(field)) continue;
            FieldRecommendationVO rec = getFieldRecommendations(templateId, field.getFieldName(), submitterId);
            if (rec != null && rec.getItems() != null && rec.getItems().length > 0) {
                rec.setFieldLabel(field.getFieldLabel());
                rec.setInputType(field.getInputType());
                fieldRecs.add(rec);
            }
        }

        vo.setFields(fieldRecs);
        return vo;
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
                || "textarea".equals(inputType) || "number".equals(inputType);
    }

    private FieldRecommendationVO.RecommendedItem buildItem(FieldValueStats stats, double score, String source) {
        FieldRecommendationVO.RecommendedItem item = new FieldRecommendationVO.RecommendedItem();
        item.setValue(stats.getFieldValue());
        item.setFrequency(stats.getFrequency());
        item.setScore(score);
        item.setSource(source);
        return item;
    }
}
