package com.formdesigner.service;

import com.formdesigner.vo.ContextRecommendationVO;
import java.util.List;
import java.util.Map;

public interface AiRecommendService {

    List<ContextRecommendationVO> getContextRecommendations(
            Long templateId,
            Map<String, Object> filledFields,
            List<Map<String, Object>> fieldDefinitions,
            List<String> targetFields,
            List<String> excludeFields);

    List<ContextRecommendationVO.AddressSuggestionVO> completeAddress(
            String partialAddress,
            String province,
            String city,
            Integer limit);

    boolean isAvailable();
}
