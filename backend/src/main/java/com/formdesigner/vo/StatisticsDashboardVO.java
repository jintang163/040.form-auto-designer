package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class StatisticsDashboardVO {
    private Long totalRecords;
    private List<TemplateRecordCount> templateCounts;
    private List<FieldDistributionVO> fieldDistributions;
    private List<NumericAggregationVO> numericAggregations;
    private List<SubmissionTrend> submissionTrend;

    @Data
    public static class TemplateRecordCount {
        private Long templateId;
        private String templateName;
        private Long count;
    }

    @Data
    public static class SubmissionTrend {
        private String date;
        private Long count;
    }
}
