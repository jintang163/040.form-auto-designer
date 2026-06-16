-- ============================================================
-- ClickHouse 初始化脚本
-- 用于表单数据聚合分析的列式存储引擎
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS form_analytics;

USE form_analytics;

-- ============================================================
-- 填报数据聚合分析表 form_data_analytics
-- 使用 MergeTree 引擎，按日期分区、按模板ID排序
-- 字段设计与 MySQL form_data 保持一致，便于同步
-- ============================================================
CREATE TABLE IF NOT EXISTS form_data_analytics
(
    `id`                UInt64          COMMENT '主键ID',
    `template_id`       UInt64          COMMENT '所属模板ID',
    `version`           Int32           COMMENT '填报时模板版本号',
    `field_values_json` String          COMMENT '字段值JSON: {fieldName: value}',
    `submitter_id`      String          COMMENT '提交人ID',
    `submitted_at`      DateTime64(3)   COMMENT '提交时间'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(submitted_at)
ORDER BY (template_id, submitted_at)
SETTINGS index_granularity = 8192;

COMMENT ON TABLE form_data_analytics IS '填报数据聚合分析表(ClickHouse)';

-- ============================================================
-- 可选：数据同步视图（从MySQL同步时可使用）
-- ============================================================

-- 查询统计示例：
-- 总记录数: SELECT count() FROM form_data_analytics;
-- 按模板统计: SELECT template_id, count() FROM form_data_analytics GROUP BY template_id;
-- 字段分布统计(select/switch):
--   SELECT JSONExtractString(field_values_json, 'status') AS val, count() AS cnt
--   FROM form_data_analytics WHERE template_id = 1 GROUP BY val ORDER BY cnt DESC;
-- 数值字段聚合:
--   SELECT
--     sum(toFloat64OrZero(JSONExtractString(field_values_json, 'amount'))) AS sum_amount,
--     avg(toFloat64OrZero(JSONExtractString(field_values_json, 'amount'))) AS avg_amount,
--     min(toFloat64OrZero(JSONExtractString(field_values_json, 'amount'))) AS min_amount,
--     max(toFloat64OrZero(JSONExtractString(field_values_json, 'amount'))) AS max_amount,
--     count() AS cnt
--   FROM form_data_analytics WHERE template_id = 1;
