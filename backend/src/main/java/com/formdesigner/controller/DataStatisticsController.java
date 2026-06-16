package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.service.DataStatisticsService;
import com.formdesigner.vo.FieldDistributionVO;
import com.formdesigner.vo.NumericAggregationVO;
import com.formdesigner.vo.StatisticsDashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class DataStatisticsController {

    private final DataStatisticsService dataStatisticsService;

    @GetMapping("/dashboard")
    public R<StatisticsDashboardVO> getDashboard(
            @RequestParam(required = false) Long templateId) {
        return R.ok(dataStatisticsService.getDashboard(templateId));
    }

    @GetMapping("/field-distribution")
    public R<FieldDistributionVO> getFieldDistribution(
            @RequestParam Long templateId,
            @RequestParam String fieldName) {
        return R.ok(dataStatisticsService.getFieldDistribution(templateId, fieldName));
    }

    @GetMapping("/numeric-aggregation")
    public R<NumericAggregationVO> getNumericAggregation(
            @RequestParam Long templateId,
            @RequestParam String fieldName) {
        return R.ok(dataStatisticsService.getNumericAggregation(templateId, fieldName));
    }
}
