package com.formdesigner.vo;

import lombok.Data;

@Data
public class FieldRecommendationVO {
    private String fieldName;
    private String fieldLabel;
    private String inputType;
    private String recommendedValue;
    private Double confidence;
    private RecommendedItem[] items;

    @Data
    public static class RecommendedItem {
        private String value;
        private Integer frequency;
        private Double score;
        private String source;
    }
}
