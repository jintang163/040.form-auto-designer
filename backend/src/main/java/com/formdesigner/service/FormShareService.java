package com.formdesigner.service;

import com.formdesigner.dto.FormShareDTO;
import com.formdesigner.vo.FormShareVO;
import java.util.List;

public interface FormShareService {

    FormShareVO createShare(FormShareDTO dto);

    FormShareVO getShareByCode(String shareCode);

    boolean validateShare(String shareCode, String password);

    boolean revokeShare(String shareCode);

    List<FormShareVO> listSharesByTemplateId(Long templateId);

    FormShareVO refreshShareCode(String shareCode);
}
