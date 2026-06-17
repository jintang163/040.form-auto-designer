package com.formdesigner.service;

import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;

public interface FormDataService {

    FormData submit(FormSubmitDTO dto);

    FormData getById(Long id);

    List<FormData> listByTemplateId(Long templateId);

    Map<String, Object> listByTemplateIdPaged(Long templateId, int page, int pageSize,
                                               String fieldName, String fieldValue);

    void exportExcel(Long templateId, String fieldName, String fieldValue,
                     HttpServletResponse response);

    boolean deleteById(Long id);

    boolean updateStatus(Long id, String status);

    boolean updateFieldValues(Long id, String fieldValuesJson);
}
