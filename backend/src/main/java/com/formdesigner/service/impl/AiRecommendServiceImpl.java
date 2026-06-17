package com.formdesigner.service.impl;

import com.formdesigner.config.GrpcClientConfig;
import com.formdesigner.service.AiRecommendService;
import com.formdesigner.vo.ContextRecommendationVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRecommendServiceImpl implements AiRecommendService {

    private final GrpcClientConfig grpcClientConfig;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, Object> healthStatusCache = new ConcurrentHashMap<>();
    private static final long HEALTH_CHECK_INTERVAL = 30000;
    private static final int AI_SERVICE_HTTP_PORT = 5000;

    private String getBaseUrl() {
        String host = grpcClientConfig.getHost();
        return "http://" + (host != null ? host : "localhost") + ":" + AI_SERVICE_HTTP_PORT;
    }

    @Override
    public boolean isAvailable() {
        try {
            Long lastCheck = (Long) healthStatusCache.get("lastCheck");
            Boolean lastAvailable = (Boolean) healthStatusCache.get("available");
            long now = System.currentTimeMillis();

            if (lastCheck != null && (now - lastCheck) < HEALTH_CHECK_INTERVAL) {
                return Boolean.TRUE.equals(lastAvailable);
            }

            String url = getBaseUrl() + "/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            boolean available = response.getStatusCode().is2xxSuccessful();

            healthStatusCache.put("lastCheck", now);
            healthStatusCache.put("available", available);
            return available;
        } catch (Exception e) {
            healthStatusCache.put("lastCheck", System.currentTimeMillis());
            healthStatusCache.put("available", false);
            log.debug("AI服务不可用: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public List<ContextRecommendationVO> getContextRecommendations(
            Long templateId,
            Map<String, Object> filledFields,
            List<Map<String, Object>> fieldDefinitions,
            List<String> targetFields,
            List<String> excludeFields) {

        if (!isAvailable()) {
            return Collections.emptyList();
        }

        try {
            String url = getBaseUrl() + "/api/recommend/context";

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("filledFields", filledFields != null ? filledFields : Collections.emptyMap());
            requestBody.put("fieldDefinitions", fieldDefinitions != null ? fieldDefinitions : Collections.emptyList());
            requestBody.put("targetFields", targetFields != null ? targetFields : Collections.emptyList());
            requestBody.put("excludeFields", excludeFields != null ? excludeFields : Collections.emptyList());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> recs = (List<Map<String, Object>>) response.getBody().get("recommendations");
                if (recs != null) {
                    List<ContextRecommendationVO> result = new ArrayList<>();
                    for (Map<String, Object> rec : recs) {
                        ContextRecommendationVO vo = new ContextRecommendationVO();
                        vo.setTargetField((String) rec.get("targetField"));
                        vo.setSuggestedValue(rec.get("suggestedValue"));
                        vo.setConfidence(((Number) rec.get("confidence")).doubleValue());
                        vo.setSource((String) rec.get("source"));
                        vo.setExplanation((String) rec.get("explanation"));
                        vo.setRelatedFields((List<String>) rec.get("relatedFields"));
                        result.add(vo);
                    }
                    log.debug("获取到 {} 条AI上下文推荐", result.size());
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("调用AI上下文推荐失败: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    @Override
    public List<ContextRecommendationVO.AddressSuggestionVO> completeAddress(
            String partialAddress,
            String province,
            String city,
            Integer limit) {

        if (!isAvailable()) {
            return Collections.emptyList();
        }

        try {
            String url = getBaseUrl() + "/api/recommend/address/complete";

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("partialAddress", partialAddress);
            requestBody.put("province", province);
            requestBody.put("city", city);
            requestBody.put("limit", limit != null ? limit : 5);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> suggestions =
                        (List<Map<String, Object>>) response.getBody().get("suggestions");
                if (suggestions != null) {
                    List<ContextRecommendationVO.AddressSuggestionVO> result = new ArrayList<>();
                    for (Map<String, Object> s : suggestions) {
                        ContextRecommendationVO.AddressSuggestionVO vo =
                                new ContextRecommendationVO.AddressSuggestionVO();
                        vo.setFullAddress((String) s.get("fullAddress"));
                        vo.setProvince((String) s.get("province"));
                        vo.setCity((String) s.get("city"));
                        vo.setDistrict((String) s.get("district"));
                        vo.setConfidence(((Number) s.get("confidence")).doubleValue());
                        result.add(vo);
                    }
                    log.debug("获取到 {} 条地址补全建议", result.size());
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("调用AI地址补全失败: {}", e.getMessage());
        }
        return Collections.emptyList();
    }
}
