package com.formdesigner.service;

import com.formdesigner.vo.FieldRecommendationVO;
import com.formdesigner.vo.FormRecommendationVO;
import java.util.List;

public interface SmartRecommendService {

    FormRecommendationVO getRecommendations(Long templateId, String submitterId);

    List<FieldRecommendationVO> getFieldRecommendations(Long templateId, String fieldName, String submitterId);

    void recordSubmission(Long templateId, String submitterId, String fieldValuesJson);

    void rebuildStats(Long templateId);
}
