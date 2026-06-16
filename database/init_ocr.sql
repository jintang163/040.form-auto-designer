ALTER TABLE recognition_task ADD COLUMN ocr_type VARCHAR(64) DEFAULT NULL COMMENT 'OCR识别类型: ID_CARD_FRONT/ID_CARD_BACK/BUSINESS_LICENSE' AFTER file_type;
ALTER TABLE recognition_task ADD COLUMN ocr_raw_json TEXT DEFAULT NULL COMMENT 'OCR识别原始JSON' AFTER ocr_type;
CREATE INDEX idx_recognition_task_ocr_type ON recognition_task(ocr_type);
