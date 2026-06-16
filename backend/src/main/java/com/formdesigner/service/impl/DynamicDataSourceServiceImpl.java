package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.service.DynamicDataSourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicDataSourceServiceImpl implements DynamicDataSourceService {

    private final ObjectMapper objectMapper;

    @Override
    public List<Map<String, String>> fetchOptions(String url) {
        if (url == null || url.isEmpty()) return Collections.emptyList();
        try {
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            String body = response.getBody();
            if (body == null || body.isEmpty()) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(body);
            List<Map<String, String>> options = new ArrayList<>();

            if (root.isArray()) {
                for (JsonNode item : root) {
                    String label = item.has("label") ? item.get("label").asText()
                            : item.has("name") ? item.get("name").asText()
                            : item.has("text") ? item.get("text").asText() : "";
                    String value = item.has("value") ? item.get("value").asText()
                            : item.has("id") ? item.get("id").asText()
                            : item.has("code") ? item.get("code").asText() : label;
                    if (!label.isEmpty()) {
                        Map<String, String> opt = new LinkedHashMap<>();
                        opt.put("label", label);
                        opt.put("value", value);
                        options.add(opt);
                    }
                }
            } else if (root.isObject() && root.has("data")) {
                JsonNode data = root.get("data");
                if (data.isArray()) {
                    for (JsonNode item : data) {
                        String label = item.has("label") ? item.get("label").asText()
                                : item.has("name") ? item.get("name").asText() : "";
                        String value = item.has("value") ? item.get("value").asText()
                                : item.has("id") ? item.get("id").asText() : label;
                        if (!label.isEmpty()) {
                            Map<String, String> opt = new LinkedHashMap<>();
                            opt.put("label", label);
                            opt.put("value", value);
                            options.add(opt);
                        }
                    }
                }
            }
            return options;
        } catch (Exception e) {
            log.error("获取动态数据源失败: url={}", url, e);
            return Collections.emptyList();
        }
    }
}
