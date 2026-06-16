package com.formdesigner.service;

import com.formdesigner.vo.FieldDistributionVO;
import com.formdesigner.vo.NumericAggregationVO;
import com.formdesigner.vo.StatisticsDashboardVO;

public interface DataStatisticsService {

    StatisticsDashboardVO getDashboard(Long templateId);

    FieldDistributionVO getFieldDistribution(Long templateId, String fieldName);

    NumericAggregationVO getNumericAggregation(Long templateId, String fieldName);

    void syncToClickHouse(com.formdesigner.entity.FormData formData);
}
