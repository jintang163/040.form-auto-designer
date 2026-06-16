-- ============================================================
-- 多租户支持 - 数据库迁移脚本
-- 兼容 MySQL 8.0 / 人大金仓(KingbaseES)
-- ============================================================

-- ============================================================
-- 1. 租户表 sys_tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_tenant (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_code     VARCHAR(50)     NOT NULL,
    tenant_name     VARCHAR(200)    NOT NULL,
    description     VARCHAR(500),
    table_prefix    VARCHAR(50)     DEFAULT '',
    admin_user      VARCHAR(100),
    admin_email     VARCHAR(200),
    admin_phone     VARCHAR(20),
    status          VARCHAR(20)     DEFAULT 'ACTIVE',
    is_system       SMALLINT        DEFAULT 0,
    expired_at      TIMESTAMP,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    is_deleted      SMALLINT        DEFAULT 0,
    CONSTRAINT pk_sys_tenant PRIMARY KEY (id),
    CONSTRAINT uk_tenant_code UNIQUE (tenant_code),
    CONSTRAINT ck_tenant_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

COMMENT ON TABLE sys_tenant IS '租户表';
COMMENT ON COLUMN sys_tenant.id IS '主键ID';
COMMENT ON COLUMN sys_tenant.tenant_code IS '租户编码(唯一)';
COMMENT ON COLUMN sys_tenant.tenant_name IS '租户名称';
COMMENT ON COLUMN sys_tenant.description IS '租户描述';
COMMENT ON COLUMN sys_tenant.table_prefix IS '表前缀(用于物理隔离, 空表示共享表+tenant_id)';
COMMENT ON COLUMN sys_tenant.admin_user IS '租户管理员账号';
COMMENT ON COLUMN sys_tenant.admin_email IS '管理员邮箱';
COMMENT ON COLUMN sys_tenant.admin_phone IS '管理员手机号';
COMMENT ON COLUMN sys_tenant.status IS '状态: ACTIVE-正常, SUSPENDED-暂停, DELETED-已删除';
COMMENT ON COLUMN sys_tenant.is_system IS '是否系统内置: 0-否, 1-是';
COMMENT ON COLUMN sys_tenant.expired_at IS '到期时间';
COMMENT ON COLUMN sys_tenant.created_at IS '创建时间';
COMMENT ON COLUMN sys_tenant.updated_at IS '更新时间';
COMMENT ON COLUMN sys_tenant.is_deleted IS '是否删除: 0-否, 1-是';

CREATE INDEX idx_sys_tenant_status ON sys_tenant (status);
CREATE INDEX idx_sys_tenant_admin ON sys_tenant (admin_user);

-- ============================================================
-- 2. 租户资源配额表 sys_tenant_quota
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_tenant_quota (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id       BIGINT          NOT NULL,
    max_templates   INT             DEFAULT 100,
    max_fields_per_template INT     DEFAULT 50,
    max_form_submissions INT        DEFAULT 10000,
    max_storage_mb  INT             DEFAULT 1024,
    max_api_calls_daily INT         DEFAULT 50000,
    max_webhook_rules INT           DEFAULT 20,
    current_templates INT           DEFAULT 0,
    current_form_submissions INT    DEFAULT 0,
    current_storage_mb DECIMAL(10,2) DEFAULT 0,
    current_api_calls_daily INT     DEFAULT 0,
    current_api_calls_date VARCHAR(10),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sys_tenant_quota PRIMARY KEY (id),
    CONSTRAINT uk_quota_tenant UNIQUE (tenant_id),
    CONSTRAINT fk_quota_tenant FOREIGN KEY (tenant_id) REFERENCES sys_tenant (id)
);

COMMENT ON TABLE sys_tenant_quota IS '租户资源配额表';
COMMENT ON COLUMN sys_tenant_quota.id IS '主键ID';
COMMENT ON COLUMN sys_tenant_quota.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_tenant_quota.max_templates IS '最大模板数';
COMMENT ON COLUMN sys_tenant_quota.max_fields_per_template IS '每模板最大字段数';
COMMENT ON COLUMN sys_tenant_quota.max_form_submissions IS '最大填报次数';
COMMENT ON COLUMN sys_tenant_quota.max_storage_mb IS '最大存储空间(MB)';
COMMENT ON COLUMN sys_tenant_quota.max_api_calls_daily IS '每日最大API调用次数';
COMMENT ON COLUMN sys_tenant_quota.max_webhook_rules IS '最大Webhook规则数';
COMMENT ON COLUMN sys_tenant_quota.current_templates IS '当前模板数';
COMMENT ON COLUMN sys_tenant_quota.current_form_submissions IS '当前填报次数';
COMMENT ON COLUMN sys_tenant_quota.current_storage_mb IS '当前存储使用量(MB)';
COMMENT ON COLUMN sys_tenant_quota.current_api_calls_daily IS '当日API调用次数';
COMMENT ON COLUMN sys_tenant_quota.current_api_calls_date IS '当日API调用统计日期(yyyy-MM-dd)';
COMMENT ON COLUMN sys_tenant_quota.created_at IS '创建时间';
COMMENT ON COLUMN sys_tenant_quota.updated_at IS '更新时间';

-- ============================================================
-- 3. 租户用户关联表 sys_tenant_user
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_tenant_user (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id       BIGINT          NOT NULL,
    user_id         VARCHAR(100)    NOT NULL,
    user_name       VARCHAR(200),
    role            VARCHAR(20)     DEFAULT 'USER',
    joined_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sys_tenant_user PRIMARY KEY (id),
    CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id),
    CONSTRAINT fk_tu_tenant FOREIGN KEY (tenant_id) REFERENCES sys_tenant (id),
    CONSTRAINT ck_tu_role CHECK (role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'USER'))
);

COMMENT ON TABLE sys_tenant_user IS '租户用户关联表';
COMMENT ON COLUMN sys_tenant_user.id IS '主键ID';
COMMENT ON COLUMN sys_tenant_user.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_tenant_user.user_id IS '用户ID';
COMMENT ON COLUMN sys_tenant_user.user_name IS '用户名称';
COMMENT ON COLUMN sys_tenant_user.role IS '角色: SUPER_ADMIN-超管, TENANT_ADMIN-租户管理员, USER-普通用户';
COMMENT ON COLUMN sys_tenant_user.joined_at IS '加入时间';

CREATE INDEX idx_tu_user_id ON sys_tenant_user (user_id);
CREATE INDEX idx_tu_tenant_id ON sys_tenant_user (tenant_id);
CREATE INDEX idx_tu_role ON sys_tenant_user (role);

-- ============================================================
-- 4. 为所有业务表添加 tenant_id 字段
-- ============================================================

ALTER TABLE form_template ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE form_field ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE form_version ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE form_data ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE form_draft ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE sys_file ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE recognition_task ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE webhook_rule ADD COLUMN tenant_id BIGINT DEFAULT 1;
ALTER TABLE form_field_value_stats ADD COLUMN tenant_id BIGINT DEFAULT 1;

CREATE INDEX idx_form_template_tenant_id ON form_template (tenant_id);
CREATE INDEX idx_form_field_tenant_id ON form_field (tenant_id);
CREATE INDEX idx_form_version_tenant_id ON form_version (tenant_id);
CREATE INDEX idx_form_data_tenant_id ON form_data (tenant_id);
CREATE INDEX idx_form_draft_tenant_id ON form_draft (tenant_id);
CREATE INDEX idx_sys_file_tenant_id ON sys_file (tenant_id);
CREATE INDEX idx_recognition_task_tenant_id ON recognition_task (tenant_id);
CREATE INDEX idx_webhook_rule_tenant_id ON webhook_rule (tenant_id);
CREATE INDEX idx_form_field_value_stats_tenant_id ON form_field_value_stats (tenant_id);

CREATE INDEX idx_form_template_tenant_status ON form_template (tenant_id, status);
CREATE INDEX idx_form_data_tenant_template ON form_data (tenant_id, template_id);

-- ============================================================
-- 5. 初始化默认租户数据
-- ============================================================
INSERT INTO sys_tenant (id, tenant_code, tenant_name, description, admin_user, status, is_system)
VALUES (1, 'DEFAULT', '默认租户', '系统默认租户，用于未分配租户的场景', 'admin', 'ACTIVE', 1);

INSERT INTO sys_tenant (id, tenant_code, tenant_name, description, admin_user, status, is_system)
VALUES (2, 'HR', '人事部', '人事部门独立租户', 'hr_admin', 'ACTIVE', 0);

INSERT INTO sys_tenant (id, tenant_code, tenant_name, description, admin_user, status, is_system)
VALUES (3, 'FINANCE', '财务部', '财务部门独立租户', 'finance_admin', 'ACTIVE', 0);

INSERT INTO sys_tenant (id, tenant_code, tenant_name, description, admin_user, status, is_system)
VALUES (4, 'PROCUREMENT', '采购部', '采购部门独立租户', 'procurement_admin', 'ACTIVE', 0);

INSERT INTO sys_tenant_quota (tenant_id, max_templates, max_fields_per_template, max_form_submissions, max_storage_mb, max_api_calls_daily, max_webhook_rules)
VALUES (1, 100, 50, 10000, 1024, 50000, 20);

INSERT INTO sys_tenant_quota (tenant_id, max_templates, max_fields_per_template, max_form_submissions, max_storage_mb, max_api_calls_daily, max_webhook_rules)
VALUES (2, 50, 30, 5000, 512, 20000, 10);

INSERT INTO sys_tenant_quota (tenant_id, max_templates, max_fields_per_template, max_form_submissions, max_storage_mb, max_api_calls_daily, max_webhook_rules)
VALUES (3, 50, 30, 5000, 512, 20000, 10);

INSERT INTO sys_tenant_quota (tenant_id, max_templates, max_fields_per_template, max_form_submissions, max_storage_mb, max_api_calls_daily, max_webhook_rules)
VALUES (4, 50, 30, 5000, 512, 20000, 10);

INSERT INTO sys_tenant_user (tenant_id, user_id, user_name, role) VALUES (1, 'admin', '系统管理员', 'SUPER_ADMIN');
INSERT INTO sys_tenant_user (tenant_id, user_id, user_name, role) VALUES (2, 'hr_admin', '人事管理员', 'TENANT_ADMIN');
INSERT INTO sys_tenant_user (tenant_id, user_id, user_name, role) VALUES (3, 'finance_admin', '财务管理员', 'TENANT_ADMIN');
INSERT INTO sys_tenant_user (tenant_id, user_id, user_name, role) VALUES (4, 'procurement_admin', '采购管理员', 'TENANT_ADMIN');
