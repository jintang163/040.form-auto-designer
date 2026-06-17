package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class ContextRecommendationVO {
    private String targetField;
    private Object suggestedValue;
    private Double confidence;
    private String source;
    private String explanation;
    private List<String> relatedFields;

    @Data
    public static class AddressSuggestionVO {
        private String fullAddress;
        private String province;
        private String city;
        private String district;
        private Double confidence;
    }
}
