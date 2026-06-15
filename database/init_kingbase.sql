-- ============================================================
-- 表单自动设计器 - 人大金仓(KingbaseES)专用初始化脚本
-- 使用 SEQUENCE 序列生成主键
-- ============================================================

-- 创建序列
CREATE SEQUENCE IF NOT EXISTS seq_form_template START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_form_field START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_form_version START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_form_data START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_form_draft START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_sys_file START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_recognition_task START WITH 1 INCREMENT BY 1 NO CYCLE;

-- ============================================================
-- 1. 表单模板表 form_template
-- ============================================================
CREATE TABLE IF NOT EXISTS form_template (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_form_template'),
    template_name   VARCHAR(200)    NOT NULL,
    template_code   VARCHAR(100)    NOT NULL,
    schema_json     TEXT,
    version         INT             DEFAULT 1,
    status          VARCHAR(20)     DEFAULT 'DRAFT',
    description     VARCHAR(500),
    created_by      VARCHAR(100),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    is_deleted      SMALLINT        DEFAULT 0,
    CONSTRAINT pk_form_template PRIMARY KEY (id),
    CONSTRAINT uk_template_code UNIQUE (template_code),
    CONSTRAINT ck_template_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

COMMENT ON TABLE form_template IS '表单模板表';
COMMENT ON COLUMN form_template.id IS '主键ID';
COMMENT ON COLUMN form_template.template_name IS '模板名称';
COMMENT ON COLUMN form_template.template_code IS '模板编码(唯一)';
COMMENT ON COLUMN form_template.schema_json IS 'Formily JSON Schema定义';
COMMENT ON COLUMN form_template.version IS '当前版本号';
COMMENT ON COLUMN form_template.status IS '状态: DRAFT-草稿, PUBLISHED-已发布, ARCHIVED-已归档';
COMMENT ON COLUMN form_template.description IS '模板描述';
COMMENT ON COLUMN form_template.created_by IS '创建人';
COMMENT ON COLUMN form_template.created_at IS '创建时间';
COMMENT ON COLUMN form_template.updated_at IS '更新时间';
COMMENT ON COLUMN form_template.is_deleted IS '是否删除: 0-否, 1-是';

CREATE INDEX idx_form_template_status ON form_template (status);
CREATE INDEX idx_form_template_created_by ON form_template (created_by);
CREATE INDEX idx_form_template_created_at ON form_template (created_at);

-- ============================================================
-- 2. 表单字段表 form_field
-- ============================================================
CREATE TABLE IF NOT EXISTS form_field (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_form_field'),
    template_id     BIGINT          NOT NULL,
    field_name      VARCHAR(100)    NOT NULL,
    field_label     VARCHAR(200)    NOT NULL,
    field_type      VARCHAR(50)     NOT NULL,
    input_type      VARCHAR(50)     NOT NULL,
    required        SMALLINT        DEFAULT 0,
    default_value   VARCHAR(500),
    validation_rules TEXT,
    options         TEXT,
    sort_order      INT             DEFAULT 0,
    layout_config   TEXT,
    linkage_config  TEXT,
    group_name      VARCHAR(100),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_form_field PRIMARY KEY (id),
    CONSTRAINT fk_field_template FOREIGN KEY (template_id) REFERENCES form_template (id),
    CONSTRAINT ck_input_type CHECK (input_type IN ('text', 'number', 'date', 'select', 'multi_select', 'switch', 'textarea', 'file'))
);

COMMENT ON TABLE form_field IS '表单字段表';
COMMENT ON COLUMN form_field.id IS '主键ID';
COMMENT ON COLUMN form_field.template_id IS '所属模板ID';
COMMENT ON COLUMN form_field.field_name IS '字段名称(标识)';
COMMENT ON COLUMN form_field.field_label IS '字段标签(显示名)';
COMMENT ON COLUMN form_field.field_type IS '字段类型(Formily类型)';
COMMENT ON COLUMN form_field.input_type IS '输入类型: text/number/date/select/multi_select/switch/textarea/file';
COMMENT ON COLUMN form_field.required IS '是否必填: 0-否, 1-是';
COMMENT ON COLUMN form_field.default_value IS '默认值';
COMMENT ON COLUMN form_field.validation_rules IS '校验规则(JSON格式)';
COMMENT ON COLUMN form_field.options IS '选项列表(JSON格式, 用于select/multi_select)';
COMMENT ON COLUMN form_field.sort_order IS '排序序号';
COMMENT ON COLUMN form_field.layout_config IS '布局配置(JSON: {row, col, rowSpan, colSpan})';
COMMENT ON COLUMN form_field.linkage_config IS '联动条件配置(JSON格式)';
COMMENT ON COLUMN form_field.group_name IS '字段分组名称';
COMMENT ON COLUMN form_field.created_at IS '创建时间';
COMMENT ON COLUMN form_field.updated_at IS '更新时间';

CREATE INDEX idx_form_field_template_id ON form_field (template_id);
CREATE INDEX idx_form_field_group_name ON form_field (group_name);
CREATE INDEX idx_form_field_input_type ON form_field (input_type);
CREATE INDEX idx_form_field_sort_order ON form_field (template_id, sort_order);

-- ============================================================
-- 3. 表单版本表 form_version
-- ============================================================
CREATE TABLE IF NOT EXISTS form_version (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_form_version'),
    template_id     BIGINT          NOT NULL,
    version         INT             NOT NULL,
    schema_json     TEXT,
    change_log      VARCHAR(500),
    created_by      VARCHAR(100),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_form_version PRIMARY KEY (id),
    CONSTRAINT fk_version_template FOREIGN KEY (template_id) REFERENCES form_template (id)
);

COMMENT ON TABLE form_version IS '表单版本表';
COMMENT ON COLUMN form_version.id IS '主键ID';
COMMENT ON COLUMN form_version.template_id IS '所属模板ID';
COMMENT ON COLUMN form_version.version IS '版本号';
COMMENT ON COLUMN form_version.schema_json IS '版本JSON Schema快照';
COMMENT ON COLUMN form_version.change_log IS '变更日志';
COMMENT ON COLUMN form_version.created_by IS '版本创建人';
COMMENT ON COLUMN form_version.created_at IS '创建时间';

CREATE INDEX idx_form_version_template_id ON form_version (template_id);
CREATE INDEX idx_form_version_template_version ON form_version (template_id, version);
CREATE INDEX idx_form_version_created_at ON form_version (created_at);

-- ============================================================
-- 4. 填报数据表 form_data
-- ============================================================
CREATE TABLE IF NOT EXISTS form_data (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_form_data'),
    template_id     BIGINT          NOT NULL,
    version         INT,
    field_values    TEXT            NOT NULL,
    submitter_id    VARCHAR(100),
    submitter_name  VARCHAR(200),
    source          VARCHAR(20)     DEFAULT 'PC',
    status          VARCHAR(20)     DEFAULT 'SUBMITTED',
    submitted_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_form_data PRIMARY KEY (id),
    CONSTRAINT fk_data_template FOREIGN KEY (template_id) REFERENCES form_template (id),
    CONSTRAINT ck_data_source CHECK (source IN ('PC', 'MINI_PROGRAM')),
    CONSTRAINT ck_data_status CHECK (status IN ('DRAFT', 'SUBMITTED'))
);

COMMENT ON TABLE form_data IS '填报数据表';
COMMENT ON COLUMN form_data.id IS '主键ID';
COMMENT ON COLUMN form_data.template_id IS '所属模板ID';
COMMENT ON COLUMN form_data.version IS '填报时模板版本号';
COMMENT ON COLUMN form_data.field_values IS '字段值(JSON: {fieldName: value})';
COMMENT ON COLUMN form_data.submitter_id IS '提交人ID';
COMMENT ON COLUMN form_data.submitter_name IS '提交人姓名';
COMMENT ON COLUMN form_data.source IS '来源: PC-电脑端, MINI_PROGRAM-小程序端';
COMMENT ON COLUMN form_data.status IS '状态: DRAFT-草稿, SUBMITTED-已提交';
COMMENT ON COLUMN form_data.submitted_at IS '提交时间';

CREATE INDEX idx_form_data_template_id ON form_data (template_id);
CREATE INDEX idx_form_data_submitter_id ON form_data (submitter_id);
CREATE INDEX idx_form_data_source ON form_data (source);
CREATE INDEX idx_form_data_status ON form_data (status);
CREATE INDEX idx_form_data_submitted_at ON form_data (submitted_at);
CREATE INDEX idx_form_data_template_version ON form_data (template_id, version);

-- ============================================================
-- 5. 草稿表(小程序端) form_draft
-- ============================================================
CREATE TABLE IF NOT EXISTS form_draft (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_form_draft'),
    template_id     BIGINT          NOT NULL,
    field_values    TEXT            NOT NULL,
    user_id         VARCHAR(100)    NOT NULL,
    device_id       VARCHAR(200),
    saved_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_form_draft PRIMARY KEY (id),
    CONSTRAINT fk_draft_template FOREIGN KEY (template_id) REFERENCES form_template (id)
);

COMMENT ON TABLE form_draft IS '草稿表(小程序端)';
COMMENT ON COLUMN form_draft.id IS '主键ID';
COMMENT ON COLUMN form_draft.template_id IS '所属模板ID';
COMMENT ON COLUMN form_draft.field_values IS '草稿字段值(JSON格式)';
COMMENT ON COLUMN form_draft.user_id IS '用户ID';
COMMENT ON COLUMN form_draft.device_id IS '设备标识';
COMMENT ON COLUMN form_draft.saved_at IS '保存时间';

CREATE INDEX idx_form_draft_template_id ON form_draft (template_id);
CREATE INDEX idx_form_draft_user_id ON form_draft (user_id);
CREATE INDEX idx_form_draft_user_template ON form_draft (user_id, template_id);
CREATE INDEX idx_form_draft_saved_at ON form_draft (saved_at);

-- ============================================================
-- 6. 文件上传记录表 sys_file
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_file (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_sys_file'),
    file_name       VARCHAR(500)    NOT NULL,
    file_path       VARCHAR(1000)   NOT NULL,
    file_type       VARCHAR(50),
    file_size       BIGINT,
    bucket_name     VARCHAR(200),
    business_type   VARCHAR(50),
    business_id     VARCHAR(100),
    uploaded_by     VARCHAR(100),
    uploaded_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sys_file PRIMARY KEY (id)
);

COMMENT ON TABLE sys_file IS '文件上传记录表';
COMMENT ON COLUMN sys_file.id IS '主键ID';
COMMENT ON COLUMN sys_file.file_name IS '原始文件名';
COMMENT ON COLUMN sys_file.file_path IS '文件存储路径';
COMMENT ON COLUMN sys_file.file_type IS '文件MIME类型';
COMMENT ON COLUMN sys_file.file_size IS '文件大小(字节)';
COMMENT ON COLUMN sys_file.bucket_name IS '存储桶名称';
COMMENT ON COLUMN sys_file.business_type IS '业务类型';
COMMENT ON COLUMN sys_file.business_id IS '业务ID';
COMMENT ON COLUMN sys_file.uploaded_by IS '上传人';
COMMENT ON COLUMN sys_file.uploaded_at IS '上传时间';

CREATE INDEX idx_sys_file_business ON sys_file (business_type, business_id);
CREATE INDEX idx_sys_file_bucket ON sys_file (bucket_name);
CREATE INDEX idx_sys_file_uploaded_by ON sys_file (uploaded_by);
CREATE INDEX idx_sys_file_uploaded_at ON sys_file (uploaded_at);

-- ============================================================
-- 7. AI识别任务表 recognition_task
-- ============================================================
CREATE TABLE IF NOT EXISTS recognition_task (
    id              BIGINT          NOT NULL DEFAULT NEXTVAL('seq_recognition_task'),
    task_id         VARCHAR(100)    NOT NULL,
    file_id         BIGINT,
    file_type       VARCHAR(20),
    status          VARCHAR(20)     DEFAULT 'PENDING',
    progress        INT             DEFAULT 0,
    result          TEXT,
    error_message   VARCHAR(500),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    CONSTRAINT pk_recognition_task PRIMARY KEY (id),
    CONSTRAINT uk_task_id UNIQUE (task_id),
    CONSTRAINT ck_recog_file_type CHECK (file_type IN ('WORD', 'IMAGE')),
    CONSTRAINT ck_recog_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

COMMENT ON TABLE recognition_task IS 'AI识别任务表';
COMMENT ON COLUMN recognition_task.id IS '主键ID';
COMMENT ON COLUMN recognition_task.task_id IS '任务唯一标识';
COMMENT ON COLUMN recognition_task.file_id IS '关联文件ID';
COMMENT ON COLUMN recognition_task.file_type IS '文件类型: WORD-Word文档, IMAGE-图片';
COMMENT ON COLUMN recognition_task.status IS '状态: PENDING-待处理, PROCESSING-处理中, COMPLETED-已完成, FAILED-失败';
COMMENT ON COLUMN recognition_task.progress IS '处理进度(0-100)';
COMMENT ON COLUMN recognition_task.result IS '识别结果(JSON格式)';
COMMENT ON COLUMN recognition_task.error_message IS '错误信息';
COMMENT ON COLUMN recognition_task.created_at IS '创建时间';
COMMENT ON COLUMN recognition_task.completed_at IS '完成时间';

CREATE INDEX idx_recognition_task_status ON recognition_task (status);
CREATE INDEX idx_recognition_task_file_id ON recognition_task (file_id);
CREATE INDEX idx_recognition_task_created_at ON recognition_task (created_at);

-- 重置序列属主
ALTER SEQUENCE seq_form_template OWNED BY form_template.id;
ALTER SEQUENCE seq_form_field OWNED BY form_field.id;
ALTER SEQUENCE seq_form_version OWNED BY form_version.id;
ALTER SEQUENCE seq_form_data OWNED BY form_data.id;
ALTER SEQUENCE seq_form_draft OWNED BY form_draft.id;
ALTER SEQUENCE seq_sys_file OWNED BY sys_file.id;
ALTER SEQUENCE seq_recognition_task OWNED BY recognition_task.id;
