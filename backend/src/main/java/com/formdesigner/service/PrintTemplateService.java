package com.formdesigner.service;

import com.formdesigner.dto.PrintTemplateDTO;
import com.formdesigner.entity.PrintTemplate;
import com.formdesigner.vo.PrintTemplateVO;

import java.util.List;

public interface PrintTemplateService {

    PrintTemplate create(PrintTemplateDTO dto);

    PrintTemplate update(Long id, PrintTemplateDTO dto);

    boolean delete(Long id);

    PrintTemplate getById(Long id);

    PrintTemplate getByCode(String templateCode);

    List<PrintTemplateVO> listByTemplateId(Long templateId);

    List<PrintTemplateVO> listAll();

    PrintTemplate getDefault(Long templateId);

    PrintTemplate setDefault(Long id);

    String generateDefaultTemplateContent(Long templateId);
}
