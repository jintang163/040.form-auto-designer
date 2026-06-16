package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class FieldDistributionVO {
    private String fieldName;
    private String fieldLabel;
    private List<DistributionItem> items;

    @Data
    public static class DistributionItem {
        private String value;
        private String label;
        private Long count;
    }
}
