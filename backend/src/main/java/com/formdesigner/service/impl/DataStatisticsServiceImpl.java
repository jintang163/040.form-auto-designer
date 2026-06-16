package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.common.TenantContext;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.service.DataStatisticsService;
import com.formdesigner.vo.FieldDistributionVO;
import com.formdesigner.vo.NumericAggregationVO;
import com.formdesigner.vo.StatisticsDashboardVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired(required = false)
    @Qualifier("clickhouseJdbcTemplate")
    private JdbcTemplate clickhouseJdbcTemplate;

    public DataStatisticsServiceImpl(FormDataMapper formDataMapper,
                                     FormFieldMapper formFieldMapper,
                                     FormTemplateMapper formTemplateMapper,
                                     ObjectMapper objectMapper) {
        this.formDataMapper = formDataMapper;
        this.formFieldMapper = formFieldMapper;
        this.formTemplateMapper = formTemplateMapper;
        this.objectMapper = objectMapper;
    }

    private Long currentTenantId() { Long tid = TenantContext.getTenantId(); return tid != null ? tid : 1L; }

    private boolean isClickHouseAvailable() {
        if (clickhouseJdbcTemplate == null) {
            return false;
        }
        try {
            clickhouseJdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            log.warn("ClickHouse不可用，将降级使用MySQL统计: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public StatisticsDashboardVO getDashboard(Long templateId) {
        if (isClickHouseAvailable()) {
            try {
                return getDashboardFromClickHouse(templateId);
            } catch (Exception e) {
                log.error("ClickHouse统计查询失败，降级使用MySQL: {}", e.getMessage());
            }
        }
        return getDashboardFromMySQL(templateId);
    }

    @Override
    public FieldDistributionVO getFieldDistribution(Long templateId, String fieldName) {
        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(templateId, fieldName, currentTenantId());
        if (field == null) return null;

        if (isClickHouseAvailable()) {
            try {
                return getFieldDistributionFromClickHouse(templateId, field);
            } catch (Exception e) {
                log.error("ClickHouse字段分布查询失败，降级使用MySQL: {}", e.getMessage());
            }
        }
        List<FormData> dataList = formDataMapper.selectByTemplateId(templateId);
        return computeFieldDistributionInMemory(dataList, field);
    }

    @Override
    public NumericAggregationVO getNumericAggregation(Long templateId, String fieldName) {
        FormField field = formFieldMapper.selectByTemplateIdAndFieldName(templateId, fieldName, currentTenantId());
        if (field == null) return null;

        if (isClickHouseAvailable()) {
            try {
                return getNumericAggregationFromClickHouse(templateId, field);
            } catch (Exception e) {
                log.error("ClickHouse数值聚合查询失败，降级使用MySQL: {}", e.getMessage());
            }
        }
        List<FormData> dataList = formDataMapper.selectByTemplateId(templateId);
        return computeNumericAggregationInMemory(dataList, field);
    }

    // ============================================================
    // ClickHouse 聚合查询实现
    // ============================================================

    private StatisticsDashboardVO getDashboardFromClickHouse(Long templateId) {
        StatisticsDashboardVO dashboard = new StatisticsDashboardVO();

        String templateFilter = templateId != null ? " WHERE template_id = " + templateId : "";

        Long total = clickhouseJdbcTemplate.queryForObject(
                "SELECT count() FROM form_data_analytics" + templateFilter, Long.class);
        dashboard.setTotalRecords(total != null ? total : 0L);

        List<StatisticsDashboardVO.TemplateRecordCount> templateCounts = clickhouseJdbcTemplate.query(
                "SELECT template_id, count() AS cnt FROM form_data_analytics" + templateFilter +
                        " GROUP BY template_id ORDER BY cnt DESC",
                (rs, rowNum) -> {
                    StatisticsDashboardVO.TemplateRecordCount tc = new StatisticsDashboardVO.TemplateRecordCount();
                    Long tid = rs.getLong("template_id");
                    tc.setTemplateId(tid);
                    FormTemplate t = formTemplateMapper.selectById(tid);
                    tc.setTemplateName(t != null ? t.getTemplateName() : "未知模板");
                    tc.setCount(rs.getLong("cnt"));
                    return tc;
                });
        dashboard.setTemplateCounts(templateCounts);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate earliest = LocalDate.now().minusDays(29);
        Map<String, Long> trendMap = new LinkedHashMap<>();
        for (int i = 0; i < 30; i++) {
            trendMap.put(earliest.plusDays(i).format(fmt), 0L);
        }

        List<Map<String, Object>> trendRows = clickhouseJdbcTemplate.queryForList(
                "SELECT toString(toDate(submitted_at)) AS dt, count() AS cnt FROM form_data_analytics" +
                        templateFilter + " AND submitted_at >= ? GROUP BY toDate(submitted_at) ORDER BY dt",
                java.sql.Date.valueOf(earliest));
        for (Map<String, Object> row : trendRows) {
            String dt = String.valueOf(row.get("dt"));
            Long cnt = ((Number) row.get("cnt")).longValue();
            trendMap.merge(dt, cnt, Long::sum);
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
            List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
            List<FieldDistributionVO> distributions = new ArrayList<>();
            List<NumericAggregationVO> aggregations = new ArrayList<>();

            for (FormField field : fields) {
                try {
                    if ("select".equals(field.getInputType()) || "multi_select".equals(field.getInputType())
                            || "switch".equals(field.getInputType())) {
                        FieldDistributionVO dist = getFieldDistributionFromClickHouse(templateId, field);
                        if (dist != null) distributions.add(dist);
                    } else if ("number".equals(field.getInputType())) {
                        NumericAggregationVO agg = getNumericAggregationFromClickHouse(templateId, field);
                        if (agg != null) aggregations.add(agg);
                    }
                } catch (Exception ex) {
                    log.warn("ClickHouse字段统计失败, field={}: {}", field.getFieldName(), ex.getMessage());
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

    private FieldDistributionVO getFieldDistributionFromClickHouse(Long templateId, FormField field) {
        FieldDistributionVO vo = new FieldDistributionVO();
        vo.setFieldName(field.getFieldName());
        vo.setFieldLabel(field.getFieldLabel());

        String sql = "SELECT ifNull(JSONExtractString(field_values_json, ?), '(空)') AS val, count() AS cnt " +
                "FROM form_data_analytics WHERE template_id = ? GROUP BY val ORDER BY cnt DESC";
        List<FieldDistributionVO.DistributionItem> items = clickhouseJdbcTemplate.query(
                sql, new Object[]{field.getFieldName(), templateId},
                (rs, rowNum) -> {
                    FieldDistributionVO.DistributionItem item = new FieldDistributionVO.DistributionItem();
                    String val = rs.getString("val");
                    item.setValue(val);
                    item.setLabel(val);
                    item.setCount(rs.getLong("cnt"));
                    return item;
                });
        vo.setItems(items);
        return vo;
    }

    private NumericAggregationVO getNumericAggregationFromClickHouse(Long templateId, FormField field) {
        NumericAggregationVO vo = new NumericAggregationVO();
        vo.setFieldName(field.getFieldName());
        vo.setFieldLabel(field.getFieldLabel());

        String sql = "SELECT " +
                "sum(toFloat64OrNull(JSONExtractString(field_values_json, ?))) AS sum_val, " +
                "avg(toFloat64OrNull(JSONExtractString(field_values_json, ?))) AS avg_val, " +
                "min(toFloat64OrNull(JSONExtractString(field_values_json, ?))) AS min_val, " +
                "max(toFloat64OrNull(JSONExtractString(field_values_json, ?))) AS max_val, " +
                "count() AS cnt " +
                "FROM form_data_analytics WHERE template_id = ?";
        return clickhouseJdbcTemplate.queryForObject(
                sql,
                new Object[]{field.getFieldName(), field.getFieldName(), field.getFieldName(), field.getFieldName(), templateId},
                (rs, rowNum) -> {
                    NumericAggregationVO agg = new NumericAggregationVO();
                    agg.setFieldName(field.getFieldName());
                    agg.setFieldLabel(field.getFieldLabel());
                    agg.setSum(rs.getDouble("sum_val"));
                    agg.setAvg(rs.getDouble("avg_val"));
                    agg.setMin(rs.getDouble("min_val"));
                    agg.setMax(rs.getDouble("max_val"));
                    agg.setCount(rs.getLong("cnt"));
                    return agg;
                });
    }

    // ============================================================
    // MySQL 内存计算（降级方案）
    // ============================================================

    private StatisticsDashboardVO getDashboardFromMySQL(Long templateId) {
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
            List<FormField> fields = formFieldMapper.selectByTemplateId(templateId, currentTenantId());
            List<FieldDistributionVO> distributions = new ArrayList<>();
            List<NumericAggregationVO> aggregations = new ArrayList<>();

            for (FormField field : fields) {
                if ("select".equals(field.getInputType()) || "multi_select".equals(field.getInputType())
                        || "switch".equals(field.getInputType())) {
                    FieldDistributionVO dist = computeFieldDistributionInMemory(allData, field);
                    if (dist != null) distributions.add(dist);
                } else if ("number".equals(field.getInputType())) {
                    NumericAggregationVO agg = computeNumericAggregationInMemory(allData, field);
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

    private FieldDistributionVO computeFieldDistributionInMemory(List<FormData> dataList, FormField field) {
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

    private NumericAggregationVO computeNumericAggregationInMemory(List<FormData> dataList, FormField field) {
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

    @Override
    public void syncToClickHouse(FormData formData) {
        if (!isClickHouseAvailable()) {
            log.debug("ClickHouse不可用，跳过数据同步, id={}", formData.getId());
            return;
        }
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
