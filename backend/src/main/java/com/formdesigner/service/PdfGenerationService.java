package com.formdesigner.service;

import com.formdesigner.dto.BatchPdfExportRequestDTO;
import com.formdesigner.dto.PdfExportRequestDTO;
import com.formdesigner.entity.PrintRecord;
import com.formdesigner.entity.PrintTemplate;

import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

public interface PdfGenerationService {

    void exportPdf(PdfExportRequestDTO request, HttpServletResponse response);

    byte[] generatePdfBytes(Long formDataId, PrintTemplate printTemplate, List<String> excludeFields, String watermarkText);

    ByteArrayOutputStream generatePdfStream(Long formDataId, PrintTemplate printTemplate, List<String> excludeFields, String watermarkText);

    String renderTemplate(PrintTemplate printTemplate, Map<String, Object> formData, Map<String, Object> fields);

    void batchExportPdf(BatchPdfExportRequestDTO request, HttpServletResponse response);

    byte[] mergePdfFiles(List<byte[]> pdfFiles);

    PrintRecord savePdfToServer(Long formDataId, PrintTemplate printTemplate, byte[] pdfBytes, String fileName);

    String generatePdfPreviewUrl(Long formDataId, Long printTemplateId);

    void addWatermark(byte[] pdfBytes, ByteArrayOutputStream outputStream,
                      String watermarkText, float opacity, int rotation, int fontSize, String color);
}
