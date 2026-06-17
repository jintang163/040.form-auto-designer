package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FieldValidateDTO;
import com.formdesigner.dto.FormValidateDTO;
import com.formdesigner.service.ValidationService;
import com.formdesigner.vo.FieldValidationResultVO;
import com.formdesigner.vo.FormValidationResultVO;
import com.formdesigner.vo.ValidationRuleVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/validation")
@RequiredArgsConstructor
public class ValidationController {

    private final ValidationService validationService;

    @PostMapping("/field")
    public R<FieldValidationResultVO> validateField(@RequestBody FieldValidateDTO dto) {
        return R.ok(validationService.validateField(dto));
    }

    @PostMapping("/form")
    public R<FormValidationResultVO> validateForm(@RequestBody FormValidateDTO dto) {
        return R.ok(validationService.validateForm(dto));
    }

    @GetMapping("/rules/builtin")
    public R<List<ValidationRuleVO>> getBuiltinRules() {
        return R.ok(validationService.getBuiltinRules());
    }

    @GetMapping("/rules/field")
    public R<List<ValidationRuleVO>> getFieldRules(
            @RequestParam Long templateId,
            @RequestParam String fieldName) {
        return R.ok(validationService.getFieldRules(templateId, fieldName));
    }

    @PostMapping("/auto-correct")
    public R<Map<String, String>> autoCorrectValue(
            @RequestParam Long templateId,
            @RequestParam String fieldName,
            @RequestBody(required = false) Map<String, Object> body) {
        Object value = body != null ? body.get("value") : null;
        String corrected = validationService.autoCorrectValue(templateId, fieldName, value);
        return R.ok(corrected != null ? Map.of("correctedValue", corrected) : Map.of());
    }
}
