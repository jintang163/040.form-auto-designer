package com.formdesigner.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.vo.FieldDiffVO;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class SchemaDiffUtil {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static List<FieldDiffVO> compareSchemas(String sourceSchema, String targetSchema) {
        List<FieldDiffVO> diffs = new ArrayList<>();
        try {
            JsonNode sourceRoot = objectMapper.readTree(sourceSchema);
            JsonNode targetRoot = objectMapper.readTree(targetSchema);

            JsonNode sourceProps = sourceRoot.path("properties");
            JsonNode targetProps = targetRoot.path("properties");

            Iterator<Map.Entry<String, JsonNode>> sourceFields = sourceProps.fields();
            while (sourceFields.hasNext()) {
                Map.Entry<String, JsonNode> entry = sourceFields.next();
                String fieldName = entry.getKey();
                JsonNode sourceField = entry.getValue();
                JsonNode targetField = targetProps.get(fieldName);

                if (targetField == null) {
                    FieldDiffVO diff = new FieldDiffVO();
                    diff.setFieldName(fieldName);
                    diff.setFieldLabel(sourceField.path("title").asText(fieldName));
                    diff.setChangeType("REMOVED");
                    diff.setOldValue(sourceField.toString());
                    diffs.add(diff);
                } else {
                    List<FieldDiffVO> fieldDiffs = compareField(fieldName, sourceField, targetField);
                    diffs.addAll(fieldDiffs);
                }
            }

            Iterator<Map.Entry<String, JsonNode>> targetFields = targetProps.fields();
            while (targetFields.hasNext()) {
                Map.Entry<String, JsonNode> entry = targetFields.next();
                String fieldName = entry.getKey();
                if (!sourceProps.has(fieldName)) {
                    JsonNode targetField = entry.getValue();
                    FieldDiffVO diff = new FieldDiffVO();
                    diff.setFieldName(fieldName);
                    diff.setFieldLabel(targetField.path("title").asText(fieldName));
                    diff.setChangeType("ADDED");
                    diff.setNewValue(targetField.toString());
                    diffs.add(diff);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("版本对比失败: " + e.getMessage(), e);
        }
        return diffs;
    }

    private static List<FieldDiffVO> compareField(String fieldName, JsonNode sourceField, JsonNode targetField) {
        List<FieldDiffVO> diffs = new ArrayList<>();
        String fieldLabel = targetField.path("title").asText(fieldName);

        compareFieldProperty(diffs, fieldName, fieldLabel, "title", sourceField, targetField);
        compareFieldProperty(diffs, fieldName, fieldLabel, "type", sourceField, targetField);
        compareFieldProperty(diffs, fieldName, fieldLabel, "required", sourceField, targetField);
        compareFieldProperty(diffs, fieldName, fieldLabel, "default", sourceField, targetField);
        compareFieldProperty(diffs, fieldName, fieldLabel, "x-component", sourceField, targetField);
        compareFieldProperty(diffs, fieldName, fieldLabel, "x-component-props", sourceField, targetField);

        return diffs;
    }

    private static void compareFieldProperty(List<FieldDiffVO> diffs, String fieldName, String fieldLabel,
                                             String property, JsonNode sourceField, JsonNode targetField) {
        JsonNode sourceValue = sourceField.get(property);
        JsonNode targetValue = targetField.get(property);

        boolean sourceNull = sourceValue == null || sourceValue.isNull();
        boolean targetNull = targetValue == null || targetValue.isNull();

        if (sourceNull && targetNull) {
            return;
        }

        if (sourceNull || targetNull || !sourceValue.equals(targetValue)) {
            FieldDiffVO diff = new FieldDiffVO();
            diff.setFieldName(fieldName);
            diff.setFieldLabel(fieldLabel);
            diff.setChangeType("MODIFIED");
            diff.setOldValue(sourceNull ? "" : sourceValue.toString());
            diff.setNewValue(targetNull ? "" : targetValue.toString());
            diffs.add(diff);
        }
    }
}
