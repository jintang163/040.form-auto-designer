package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.BatchPdfExportRequestDTO;
import com.formdesigner.dto.PdfExportRequestDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.PrintRecord;
import com.formdesigner.entity.PrintTemplate;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.service.PdfGenerationService;
import com.formdesigner.service.PrintService;
import com.formdesigner.service.PrintTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/print")
@RequiredArgsConstructor
public class PrintController {

    private final PdfGenerationService pdfGenerationService;
    private final PrintService printService;
    private final PrintTemplateService printTemplateService;
    private final FormDataMapper formDataMapper;

    @PostMapping("/export-pdf")
    public void exportPdf(@Valid @RequestBody PdfExportRequestDTO request,
                          HttpServletResponse response) {
        pdfGenerationService.exportPdf(request, response);
    }

    @PostMapping("/batch-export-pdf")
    public void batchExportPdf(@Valid @RequestBody BatchPdfExportRequestDTO request,
                               HttpServletResponse response) {
        pdfGenerationService.batchExportPdf(request, response);
    }

    @PostMapping("/generate-preview")
    public R<Map<String, String>> generatePreview(
            @RequestParam Long formDataId,
            @RequestParam(required = false) Long printTemplateId) {
        String previewUrl = pdfGenerationService.generatePdfPreviewUrl(formDataId, printTemplateId);
        return R.ok(Map.of("previewUrl", previewUrl));
    }

    @PostMapping("/{formDataId}/save-pdf")
    public R<PrintRecord> savePdf(
            @PathVariable Long formDataId,
            @RequestParam(required = false) Long printTemplateId,
            @RequestParam(required = false) String fileName) {
        FormData formData = formDataMapper.selectById(formDataId);
        if (formData == null) {
            throw new RuntimeException("表单数据不存在");
        }

        PrintTemplate printTemplate;
        if (printTemplateId != null) {
            printTemplate = printTemplateService.getById(printTemplateId);
        } else {
            printTemplate = printTemplateService.getDefault(formData.getTemplateId());
        }

        byte[] pdfBytes = pdfGenerationService.generatePdfBytes(formDataId, printTemplate, null, null);

        String finalFileName = fileName;
        if (finalFileName == null) {
            finalFileName = "表单_" + formDataId + ".pdf";
        } else if (!finalFileName.endsWith(".pdf")) {
            finalFileName += ".pdf";
        }

        PrintRecord record = pdfGenerationService.savePdfToServer(
                formDataId, printTemplate, pdfBytes, finalFileName);
        return R.ok(record);
    }

    @GetMapping("/records/form-data/{formDataId}")
    public R<List<PrintRecord>> getRecordsByFormDataId(@PathVariable Long formDataId) {
        return R.ok(printService.getPrintRecordsByFormDataId(formDataId));
    }

    @GetMapping("/records/template/{templateId}")
    public R<List<PrintRecord>> getRecordsByTemplateId(@PathVariable Long templateId) {
        return R.ok(printService.getPrintRecordsByTemplateId(templateId));
    }

    @GetMapping("/records/{id}")
    public R<PrintRecord> getRecordById(@PathVariable Long id) {
        return R.ok(printService.getPrintRecordById(id));
    }

    @PutMapping("/records/{id}/increment-count")
    public R<Void> incrementPrintCount(@PathVariable Long id) {
        printService.incrementPrintCount(id);
        return R.ok();
    }
}
