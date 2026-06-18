-- 打印模板表
CREATE TABLE IF NOT EXISTS `print_template` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `template_id` BIGINT NOT NULL COMMENT '关联的表单模板ID',
    `template_name` VARCHAR(200) NOT NULL COMMENT '打印模板名称',
    `template_code` VARCHAR(100) NOT NULL COMMENT '打印模板编码',
    `template_type` VARCHAR(50) NOT NULL DEFAULT 'NORMAL' COMMENT '模板类型：NORMAL-普通模板，PREPRINT-套打模板',
    `template_content` TEXT COMMENT '模板HTML内容（Thymeleaf）',
    `paper_size` VARCHAR(50) NOT NULL DEFAULT 'A4' COMMENT '纸张大小：A4, A5, LETTER等',
    `orientation` VARCHAR(20) NOT NULL DEFAULT 'PORTRAIT' COMMENT '打印方向：PORTRAIT-纵向，LANDSCAPE-横向',
    `margin_top` DECIMAL(8,2) NOT NULL DEFAULT 2.54 COMMENT '上边距(cm)',
    `margin_bottom` DECIMAL(8,2) NOT NULL DEFAULT 2.54 COMMENT '下边距(cm)',
    `margin_left` DECIMAL(8,2) NOT NULL DEFAULT 2.54 COMMENT '左边距(cm)',
    `margin_right` DECIMAL(8,2) NOT NULL DEFAULT 2.54 COMMENT '右边距(cm)',
    `watermark_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用水印',
    `watermark_text` VARCHAR(200) COMMENT '水印文字',
    `watermark_opacity` DECIMAL(4,2) DEFAULT 0.3 COMMENT '水印透明度',
    `watermark_rotation` INT DEFAULT 30 COMMENT '水印旋转角度',
    `watermark_font_size` INT DEFAULT 50 COMMENT '水印字体大小',
    `watermark_color` VARCHAR(20) DEFAULT '#CCCCCC' COMMENT '水印颜色',
    `header_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用页眉',
    `header_content` TEXT COMMENT '页眉内容',
    `footer_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用页脚',
    `footer_content` TEXT COMMENT '页脚内容',
    `background_image_url` VARCHAR(500) COMMENT '背景图片URL（套打用）',
    `background_fixed` TINYINT(1) DEFAULT 1 COMMENT '背景是否固定',
    `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认模板',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-激活，INACTIVE-禁用',
    `tenant_id` BIGINT COMMENT '租户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` VARCHAR(100) COMMENT '创建人',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_template_code_tenant` (`template_code`, `tenant_id`),
    KEY `idx_template_id` (`template_id`),
    KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印模板表';

-- 打印记录表
CREATE TABLE IF NOT EXISTS `print_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `print_template_id` BIGINT NOT NULL COMMENT '打印模板ID',
    `form_data_id` BIGINT NOT NULL COMMENT '表单数据ID',
    `template_id` BIGINT NOT NULL COMMENT '表单模板ID',
    `file_name` VARCHAR(255) COMMENT '生成的PDF文件名',
    `file_url` VARCHAR(500) COMMENT 'PDF文件存储URL',
    `file_size` BIGINT COMMENT '文件大小(字节)',
    `print_type` VARCHAR(50) NOT NULL DEFAULT 'PDF' COMMENT '打印类型：PDF-导出PDF，PRINT-直接打印',
    `print_count` INT NOT NULL DEFAULT 0 COMMENT '打印次数',
    `status` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' COMMENT '状态：PENDING-处理中，SUCCESS-成功，FAILED-失败',
    `error_message` TEXT COMMENT '错误信息',
    `tenant_id` BIGINT COMMENT '租户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `created_by` VARCHAR(100) COMMENT '创建人',
    PRIMARY KEY (`id`),
    KEY `idx_form_data_id` (`form_data_id`),
    KEY `idx_template_id` (`template_id`),
    KEY `idx_print_template_id` (`print_template_id`),
    KEY `idx_tenant_id` (`tenant_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印记录表';

-- 插入默认打印模板
INSERT INTO `print_template` (`template_id`, `template_name`, `template_code`, `template_type`, 
    `paper_size`, `orientation`, `is_default`, `status`, `tenant_id`, `created_by`)
VALUES (0, '默认A4打印模板', 'DEFAULT_A4', 'NORMAL', 'A4', 'PORTRAIT', 1, 'ACTIVE', 0, 'system');
