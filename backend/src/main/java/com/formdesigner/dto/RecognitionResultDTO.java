package com.formdesigner.dto;

import lombok.Data;
import java.util.List;

@Data
public class RecognitionResultDTO {

    private boolean success;
    private String message;
    private List<FieldItem> fields;

    @Data
    public static class FieldItem {
        private String fieldName;
        private String fieldLabel;
        private String fieldType;
        private String inputType;
        private Boolean required;
        private String defaultValue;
        private Integer sortOrder;
    }
}
