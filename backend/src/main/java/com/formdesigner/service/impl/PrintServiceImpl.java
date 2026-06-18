package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.PrintRecord;
import com.formdesigner.mapper.PrintRecordMapper;
import com.formdesigner.service.PrintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrintServiceImpl implements PrintService {

    private final PrintRecordMapper printRecordMapper;

    @Override
    public List<PrintRecord> getPrintRecordsByFormDataId(Long formDataId) {
        return printRecordMapper.selectByFormDataId(formDataId);
    }

    @Override
    public List<PrintRecord> getPrintRecordsByTemplateId(Long templateId) {
        Long tenantId = TenantContext.getCurrentTenantId();
        return printRecordMapper.selectByTemplateId(templateId, tenantId);
    }

    @Override
    public PrintRecord getPrintRecordById(Long id) {
        return printRecordMapper.selectById(id);
    }

    @Override
    public boolean incrementPrintCount(Long id) {
        int result = printRecordMapper.updatePrintCount(id);
        log.info("增加打印次数: id={}, result={}", id, result);
        return result > 0;
    }
}
