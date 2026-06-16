package com.formdesigner.service;

import com.formdesigner.dto.TemplateCreateDTO;
import com.formdesigner.dto.TemplateUpdateDTO;
import com.formdesigner.entity.FormTemplate;
import java.util.List;

public interface FormTemplateService {

    FormTemplate createTemplate(TemplateCreateDTO dto);

    FormTemplate updateTemplate(Long id, TemplateUpdateDTO dto);

    FormTemplate getById(Long id);

    List<FormTemplate> listAll();

    boolean deleteById(Long id);

    FormTemplate publishTemplate(Long id);

    FormTemplate copyTemplate(Long id);
}
