-- ============================================================
-- 表单数据脱敏与权限控制 - 数据库初始化脚本 (MySQL)
-- ============================================================

-- ============================================================
-- 1. 为 form_field 表增加敏感字段标记
-- ============================================================
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS is_sensitive TINYINT DEFAULT 0;

-- ============================================================
-- 2. 字段权限表 form_field_permission
-- ============================================================
CREATE TABLE IF NOT EXISTS form_field_permission (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id           BIGINT          NOT NULL,
    template_id         BIGINT          DEFAULT NULL,
    field_name          VARCHAR(100)    DEFAULT NULL,
    role_name           VARCHAR(50)     NOT NULL,
    user_id             VARCHAR(100)    DEFAULT NULL,
    can_view_sensitive  TINYINT         DEFAULT 0,
    can_edit            TINYINT         DEFAULT 1,
    can_export          TINYINT         DEFAULT 0,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_template_field_role (tenant_id, template_id, field_name, role_name),
    UNIQUE KEY uk_template_field_user (tenant_id, template_id, field_name, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. 初始化默认权限配置 (MySQL INSERT ... ON DUPLICATE KEY UPDATE)
-- ============================================================
INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'SUPER_ADMIN', 1, 1, 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'TENANT_ADMIN', 1, 1, 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'USER', 0, 1, 0)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- 4. 为现有常见敏感字段自动标记
-- ============================================================
UPDATE form_field SET is_sensitive = 1
WHERE is_sensitive = 0 AND (
    field_name LIKE '%phone%' OR field_name LIKE '%mobile%' OR
    field_name LIKE '%idcard%' OR field_name LIKE '%id_card%' OR
    field_name LIKE '%identity%' OR
    field_name LIKE '%email%' OR field_name LIKE '%mail%' OR
    field_name LIKE '%bank%' OR field_name LIKE '%card%' OR field_name LIKE '%account%' OR
    field_name LIKE '%address%' OR field_name LIKE '%name%'
) OR (
    field_label LIKE '%手机%' OR field_label LIKE '%电话%' OR
    field_label LIKE '%身份证%' OR field_label LIKE '%证件%' OR
    field_label LIKE '%邮箱%' OR field_label LIKE '%邮件%' OR
    field_label LIKE '%银行卡%' OR field_label LIKE '%账号%' OR field_label LIKE '%卡号%' OR
    field_label LIKE '%地址%' OR field_label LIKE '%姓名%'
);
