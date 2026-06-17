package com.formdesigner.service;

import com.formdesigner.dto.FieldValidateDTO;
import com.formdesigner.dto.FormValidateDTO;
import com.formdesigner.vo.FieldValidationResultVO;
import com.formdesigner.vo.FormValidationResultVO;
import com.formdesigner.vo.ValidationRuleVO;

import java.util.List;

public interface ValidationService {

    FieldValidationResultVO validateField(FieldValidateDTO dto);

    FormValidationResultVO validateForm(FormValidateDTO dto);

    List<ValidationRuleVO> getBuiltinRules();

    List<ValidationRuleVO> getFieldRules(Long templateId, String fieldName);

    String autoCorrectValue(Long templateId, String fieldName, Object value);
}
