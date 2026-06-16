package com.formdesigner.vo;

import lombok.Data;

@Data
public class NumericAggregationVO {
    private String fieldName;
    private String fieldLabel;
    private Double sum;
    private Double avg;
    private Double min;
    private Double max;
    private Long count;
}
