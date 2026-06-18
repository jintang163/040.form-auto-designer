package com.formdesigner.service;

import com.formdesigner.entity.PrintRecord;

import java.util.List;

public interface PrintService {

    List<PrintRecord> getPrintRecordsByFormDataId(Long formDataId);

    List<PrintRecord> getPrintRecordsByTemplateId(Long templateId);

    PrintRecord getPrintRecordById(Long id);

    boolean incrementPrintCount(Long id);
}
