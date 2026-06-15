package com.formdesigner.service;

import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import java.util.List;

public interface FormDataService {

    FormData submit(FormSubmitDTO dto);

    FormData getById(Long id);

    List<FormData> listByTemplateId(Long templateId);

    boolean deleteById(Long id);
}
