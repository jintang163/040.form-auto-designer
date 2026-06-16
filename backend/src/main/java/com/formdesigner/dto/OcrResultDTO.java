package com.formdesigner.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class OcrResultDTO {

    private boolean success;
    private String message;
    private String docType;
    private Map<String, String> fields;
    private String rawJson;
    private List<OcrFieldItem> fieldItems;

    @Data
    public static class OcrFieldItem {
        private String fieldName;
        private String fieldLabel;
        private String fieldType;
        private String inputType;
        private String defaultValue;
        private Boolean required;
        private Integer sortOrder;
    }

    public static OcrResultDTO fail(String msg) {
        OcrResultDTO r = new OcrResultDTO();
        r.setSuccess(false);
        r.setMessage(msg);
        return r;
    }
}
