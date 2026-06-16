-- ============================================================
-- 10. 用户表 sys_user
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_user (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         VARCHAR(100)    NOT NULL,
    user_name       VARCHAR(200)    NOT NULL,
    password_hash   VARCHAR(200)    NOT NULL,
    email           VARCHAR(200),
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    status          VARCHAR(20)     DEFAULT 'ACTIVE',
    is_super_admin  SMALLINT        DEFAULT 0,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    is_deleted      SMALLINT        DEFAULT 0,
    CONSTRAINT pk_sys_user PRIMARY KEY (id),
    CONSTRAINT uk_user_id UNIQUE (user_id),
    CONSTRAINT ck_user_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

COMMENT ON TABLE sys_user IS '用户表';
COMMENT ON COLUMN sys_user.id IS '主键ID';
COMMENT ON COLUMN sys_user.user_id IS '用户ID(登录账号)';
COMMENT ON COLUMN sys_user.user_name IS '用户姓名';
COMMENT ON COLUMN sys_user.password_hash IS '密码哈希(BCrypt)';
COMMENT ON COLUMN sys_user.email IS '邮箱';
COMMENT ON COLUMN sys_user.phone IS '手机号';
COMMENT ON COLUMN sys_user.avatar_url IS '头像URL';
COMMENT ON COLUMN sys_user.status IS '状态: ACTIVE-正常, SUSPENDED-暂停, DELETED-已删除';
COMMENT ON COLUMN sys_user.is_super_admin IS '是否超级管理员: 0-否, 1-是';
COMMENT ON COLUMN sys_user.created_at IS '创建时间';
COMMENT ON COLUMN sys_user.updated_at IS '更新时间';
COMMENT ON COLUMN sys_user.is_deleted IS '是否删除: 0-否, 1-是';

CREATE INDEX idx_sys_user_status ON sys_user (status);
CREATE INDEX idx_sys_user_email ON sys_user (email);

-- ============================================================
-- 11. 用户登录会话表 sys_user_session
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_user_session (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    session_id      VARCHAR(100)    NOT NULL,
    user_id         VARCHAR(100)    NOT NULL,
    login_ip        VARCHAR(50),
    user_agent      VARCHAR(500),
    expires_at      TIMESTAMP       NOT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sys_user_session PRIMARY KEY (id),
    CONSTRAINT uk_session_id UNIQUE (session_id),
    INDEX idx_session_user_id (user_id),
    INDEX idx_session_expires (expires_at)
);

COMMENT ON TABLE sys_user_session IS '用户登录会话表';
COMMENT ON COLUMN sys_user_session.id IS '主键ID';
COMMENT ON COLUMN sys_user_session.session_id IS '会话ID(Token)';
COMMENT ON COLUMN sys_user_session.user_id IS '用户ID';
COMMENT ON COLUMN sys_user_session.login_ip IS '登录IP';
COMMENT ON COLUMN sys_user_session.user_agent IS '用户代理';
COMMENT ON COLUMN sys_user_session.expires_at IS '过期时间';
COMMENT ON COLUMN sys_user_session.created_at IS '创建时间';

-- ============================================================
-- 初始化默认用户
-- ============================================================
INSERT INTO sys_user (user_id, user_name, password_hash, email, phone, is_super_admin, status)
VALUES ('admin', '系统管理员', '$2a$10$7EqJtq98hPqEX7fNZaFWoO1hZ5.2aH6tP8b0l6t5Q0eJ6c5bJ9y2e', 'admin@example.com', '13800000000', 1, 'ACTIVE');

INSERT INTO sys_user (user_id, user_name, password_hash, email, phone, is_super_admin, status)
VALUES ('hr_admin', '人事管理员', '$2a$10$7EqJtq98hPqEX7fNZaFWoO1hZ5.2aH6tP8b0l6t5Q0eJ6c5bJ9y2e', 'hr@example.com', '13800000001', 0, 'ACTIVE');

INSERT INTO sys_user (user_id, user_name, password_hash, email, phone, is_super_admin, status)
VALUES ('finance_admin', '财务管理员', '$2a$10$7EqJtq98hPqEX7fNZaFWoO1hZ5.2aH6tP8b0l6t5Q0eJ6c5bJ9y2e', 'finance@example.com', '13800000002', 0, 'ACTIVE');

INSERT INTO sys_user (user_id, user_name, password_hash, email, phone, is_super_admin, status)
VALUES ('procurement_admin', '采购管理员', '$2a$10$7EqJtq98hPqEX7fNZaFWoO1hZ5.2aH6tP8b0l6t5Q0eJ6c5bJ9y2e', 'procurement@example.com', '13800000003', 0, 'ACTIVE');
