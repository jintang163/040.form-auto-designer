package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.service.DataStatisticsService;
import com.formdesigner.vo.FieldDistributionVO;
import com.formdesigner.vo.NumericAggregationVO;
import com.formdesigner.vo.StatisticsDashboardVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DataStatisticsServiceImpl implements DataStatisticsService {

    private final FormDataMapper formDataMapper;
    private final FormFieldMapper formFieldMapper;
    private final FormTemplateMapper formTemplateMapper;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate clickhouseJdbcTemplate;

    public DataStatisticsServiceImpl(FormDataMapper formDataMapper,
                                     FormFieldMapper formFieldMapper,
                                     FormTemplateMapper formTemplateMapper,
                                     ObjectMapper objectMapper,
                                     @Qualifier("clickhouseJdbcTemplate") JdbcTemplate clickhouseJdbcTemplate) {
        this.formDataMapper = formDataMapper;
        this.formFieldMapper = formFieldMapper;
        this.formTemplateMapper = formTemplateMapper;
        this.objectMapper = objectMapper;
        this.clickhouseJdbcTemplate = clickhouseJdbcTemplate;
    }

    @Override
    public StatisticsDashboardVO getDashboard(Long templateId) {
        StatisticsDashboardVO dashboard = new StatisticsDashboardVO();

        List<FormData> allData;
        if (templateId != null) {
            allData = formDataMapper.selectByTemplateId(templateId);
        } else {
            allData = formDataMapper.selectAll();
        }
        dashboard.setTotalRecords((long) allData.size());

        Map<Long, List<FormData>> grouped = allData.stream()
                .collect(Collectors.groupingBy(FormData::getTemplateId));
        List<StatisticsDashboardVO.TemplateRecordCount> templateCounts = new ArrayList<>();
        for (Map.Entry<Long, List<FormData>> entry : grouped.entrySet()) {
            FormTemplate t = formTemplateMapper.selectById(entry.getKey());
            StatisticsDashboardVO.TemplateRecordCount tc = new StatisticsDashboardVO.TemplateRecordCount();
            tc.setTemplateId(entry.getKey());
            tc.setTemplateName(t != null ? t.getTemplateName() : "未知模板");
            tc.setCount((long) entry.getValue().size());
            templateCounts.add(tc);
        }
        dashboard.setTemplateCounts(templateCounts);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Long> trendMap = new LinkedHashMap<>();
        LocalDate earliest = LocalDate.now().minusDays(29);
        for (int i = 0; i < 30; i++) {
            trendMap.put(earliest.plusDays(i).format(fmt), 0L);
        }
        for (FormData fd : allData) {
            if (fd.getSubmittedAt() != null) {
                String date = fd.getSubmittedAt().toLocalDate().format(fmt);
                trendMap.merge(date, 1L, Long::sum);
            }
        }
        List<StatisticsDashboardVO.SubmissionTrend> trend = new ArrayList<>();
        for (Map.Entry<String, Long> e : trendMap.entrySet()) {
            StatisticsDashboardVO.SubmissionTrend st = new StatisticsDashboardVO.SubmissionTrend();
            st.setDate(e.getKey());
            st.setCount(e.getValue());
            trend.add(st);
        }
        dashboard.setSubmissionTrend(trend);

        if (templateId != null) {
            List<FormField> fields = formFieldMapper.selectByTemplateId(templateId);
            List<FieldDistributionVO> distributions = new ArrayList<>();
            List<NumericAggregationVO> aggregations = new ArrayList<>();

            for (FormField field : fields) {
                if ("select".equals(field.getInputType()) || "multi_select".equals(field.getInputType())
                        || "switch".equals(field.getInputType())) {
                    FieldDistributionVO dist = computeFieldDistribution(allData, field);
                    if (dist != null) distributions.add(dist);
                } else if ("number".equals(field.getInputType())) {
                    NumericAggregationVO agg = computeNumericAggregation(allData, field);
                    if (agg != null) aggregations.add(agg);
                }
            }
            dashboard.setFieldDistributions(distributions);
            dashboard.setNumericAggregations(aggregations);
        } else {
            dashboard.setFieldDistributions(Collections.emptyList());
            dashboard.setNumericAggregations(Collections.emptyList());
        }

        return dashboard;
    }

    @Override
    public FieldDistributionVO getFieldDistribution(Long templateId, String fieldName) {
        List<FormData> dataList = formDataMapper.selectByTemplateId(templateId);
        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(templateId, fieldName);
        return computeFieldDistribution(dataList, field);
    }

    @Override
    public NumericAggregationVO getNumericAggregation(Long templateId, String fieldName) {
        List<FormData> dataList = formDataMapper.selectByTemplateId(templateId);
        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(templateId, fieldName);
        return computeNumericAggregation(dataList, field);
    }

    private FieldDistributionVO computeFieldDistribution(List<FormData> dataList, FormField field) {
        if (field == null || dataList.isEmpty()) return null;
        FieldDistributionVO vo = new FieldDistributionVO();
        vo.setFieldName(field.getFieldName());
        vo.setFieldLabel(field.getFieldLabel());

        Map<String, Long> countMap = new LinkedHashMap<>();
        for (FormData fd : dataList) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> values = objectMapper.readValue(fd.getFieldValuesJson(), Map.class);
                Object val = values.get(field.getFieldName());
                String key = val != null ? String.valueOf(val) : "(空)";
                countMap.merge(key, 1L, Long::sum);
            } catch (Exception ignored) {}
        }

        List<FieldDistributionVO.DistributionItem> items = new ArrayList<>();
        for (Map.Entry<String, Long> e : countMap.entrySet()) {
            FieldDistributionVO.DistributionItem item = new FieldDistributionVO.DistributionItem();
            item.setValue(e.getKey());
            item.setLabel(e.getKey());
            item.setCount(e.getValue());
            items.add(item);
        }
        vo.setItems(items);
        return vo;
    }

    private NumericAggregationVO computeNumericAggregation(List<FormData> dataList, FormField field) {
        if (field == null || dataList.isEmpty()) return null;
        NumericAggregationVO vo = new NumericAggregationVO();
        vo.setFieldName(field.getFieldName());
        vo.setFieldLabel(field.getFieldLabel());

        List<Double> numbers = new ArrayList<>();
        for (FormData fd : dataList) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> values = objectMapper.readValue(fd.getFieldValuesJson(), Map.class);
                Object val = values.get(field.getFieldName());
                if (val != null) {
                    numbers.add(new BigDecimal(String.valueOf(val)).doubleValue());
                }
            } catch (Exception ignored) {}
        }

        if (numbers.isEmpty()) {
            vo.setCount(0L);
            return vo;
        }

        vo.setCount((long) numbers.size());
        vo.setSum(numbers.stream().mapToDouble(Double::doubleValue).sum());
        vo.setAvg(numbers.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        vo.setMin(numbers.stream().mapToDouble(Double::doubleValue).min().orElse(0));
        vo.setMax(numbers.stream().mapToDouble(Double::doubleValue).max().orElse(0));
        return vo;
    }

    public void syncToClickHouse(FormData formData) {
        try {
            clickhouseJdbcTemplate.update(
                    "INSERT INTO form_data_analytics (id, template_id, version, field_values_json, submitter_id, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
                    formData.getId(), formData.getTemplateId(), formData.getVersion(),
                    formData.getFieldValuesJson(), formData.getSubmitterId(), formData.getSubmittedAt()
            );
            log.info("同步数据到ClickHouse成功, id={}", formData.getId());
        } catch (Exception e) {
            log.warn("同步数据到ClickHouse失败, id={}: {}", formData.getId(), e.getMessage());
        }
    }
}
