package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class FormRecommendationVO {
    private Long templateId;
    private String submitterId;
    private List<FieldRecommendationVO> fields;
}
