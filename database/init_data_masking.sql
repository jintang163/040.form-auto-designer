-- ============================================================
-- 表单数据脱敏与权限控制 - 数据库初始化脚本
-- ============================================================

-- ============================================================
-- 1. 为 form_field 表增加敏感字段标记
-- ============================================================
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS is_sensitive SMALLINT DEFAULT 0;
COMMENT ON COLUMN form_field.is_sensitive IS '是否敏感字段: 0-否, 1-是';

-- ============================================================
-- 2. 字段权限表 form_field_permission
-- ============================================================
CREATE TABLE IF NOT EXISTS form_field_permission (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id           BIGINT          NOT NULL,
    template_id         BIGINT,
    field_name          VARCHAR(100),
    role_name           VARCHAR(50)     NOT NULL,
    user_id             VARCHAR(100),
    can_view_sensitive  SMALLINT        DEFAULT 0,
    can_edit            SMALLINT        DEFAULT 1,
    can_export          SMALLINT        DEFAULT 0,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_field_permission PRIMARY KEY (id),
    CONSTRAINT uk_template_field_role UNIQUE (tenant_id, template_id, field_name, role_name),
    CONSTRAINT uk_template_field_user UNIQUE (tenant_id, template_id, field_name, user_id)
);

COMMENT ON TABLE form_field_permission IS '字段权限配置表';
COMMENT ON COLUMN form_field_permission.template_id IS '模板ID，NULL表示全局';
COMMENT ON COLUMN form_field_permission.field_name IS '字段名，NULL表示所有字段';
COMMENT ON COLUMN form_field_permission.role_name IS '角色名：SUPER_ADMIN/TENANT_ADMIN/USER';
COMMENT ON COLUMN form_field_permission.user_id IS '用户ID，与角色二选一';
COMMENT ON COLUMN form_field_permission.can_view_sensitive IS '是否可查看敏感数据原文: 0-否, 1-是';
COMMENT ON COLUMN form_field_permission.can_edit IS '是否可编辑: 0-否, 1-是';
COMMENT ON COLUMN form_field_permission.can_export IS '是否可导出: 0-否, 1-是';

CREATE INDEX idx_field_perm_template ON form_field_permission (template_id);
CREATE INDEX idx_field_perm_role ON form_field_permission (role_name);
CREATE INDEX idx_field_perm_user ON form_field_permission (user_id);

-- ============================================================
-- 3. 初始化默认权限配置
-- ============================================================
-- 超级管理员：所有模板所有字段 - 可查看敏感、可编辑、可导出
INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'SUPER_ADMIN', 1, 1, 1)
ON CONFLICT DO NOTHING;

-- 租户管理员：所有模板所有字段 - 可查看敏感、可编辑、可导出
INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'TENANT_ADMIN', 1, 1, 1)
ON CONFLICT DO NOTHING;

-- 普通用户：所有模板所有字段 - 不可查看敏感、可编辑、不可导出
INSERT INTO form_field_permission (tenant_id, template_id, field_name, role_name, can_view_sensitive, can_edit, can_export)
VALUES (1, NULL, NULL, 'USER', 0, 1, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. 为现有常见敏感字段自动标记
-- ============================================================
UPDATE form_field SET is_sensitive = 1
WHERE is_sensitive = 0 AND (
    field_name LIKE '%phone%' OR field_name LIKE '%mobile%' OR
    field_name LIKE '%idcard%' OR field_name LIKE '%id_card%' OR
    field_name LIKE '%id_card%' OR field_name LIKE '%identity%' OR
    field_name LIKE '%email%' OR field_name LIKE '%mail%' OR
    field_name LIKE '%bank%' OR field_name LIKE '%card%' OR
    field_name LIKE '%address%' OR field_name LIKE '%name%'
) OR (
    field_label LIKE '%手机%' OR field_label LIKE '%电话%' OR
    field_label LIKE '%身份证%' OR field_label LIKE '%证件%' OR
    field_label LIKE '%邮箱%' OR field_label LIKE '%邮件%' OR
    field_label LIKE '%银行卡%' OR field_label LIKE '%账号%' OR
    field_label LIKE '%地址%' OR field_label LIKE '%姓名%'
);
