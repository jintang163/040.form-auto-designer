package com.formdesigner.service.impl;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.io.IoUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.config.MinioConfig;
import com.formdesigner.dto.BatchPdfExportRequestDTO;
import com.formdesigner.dto.PdfExportRequestDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.PrintRecord;
import com.formdesigner.entity.PrintTemplate;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.mapper.PrintRecordMapper;
import com.formdesigner.service.PdfGenerationService;
import com.formdesigner.service.PrintTemplateService;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.kernel.utils.PdfMerger;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.property.TextAlignment;
import com.itextpdf.layout.property.VerticalAlignment;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.helper.W3CDom;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfGenerationServiceImpl implements PdfGenerationService {

    private final TemplateEngine templateEngine;
    private final PrintTemplateService printTemplateService;
    private final FormDataMapper formDataMapper;
    private final FormTemplateMapper formTemplateMapper;
    private final PrintRecordMapper printRecordMapper;
    private final MinioClient minioClient;
    private final MinioConfig minioConfig;
    private final ObjectMapper objectMapper;

    @Override
    public void exportPdf(PdfExportRequestDTO request, HttpServletResponse response) {
        try {
            PrintTemplate printTemplate = resolvePrintTemplate(request);
            if (printTemplate == null) {
                throw new RuntimeException("未找到可用的打印模板");
            }

            FormData formData = formDataMapper.selectById(request.getFormDataId());
            if (formData == null) {
                throw new RuntimeException("表单数据不存在");
            }

            byte[] pdfBytes = generatePdfBytes(
                    request.getFormDataId(),
                    printTemplate,
                    request.getExcludeFields(),
                    request.getWatermarkText()
            );

            String fileName = request.getCustomFileName();
            if (StrUtil.isBlank(fileName)) {
                FormTemplate formTemplate = formTemplateMapper.selectById(formData.getTemplateId());
                String templateName = formTemplate != null ? formTemplate.getTemplateName() : "表单";
                fileName = templateName + "_" + DateUtil.format(new Date(), "yyyyMMddHHmmss") + ".pdf";
            } else if (!fileName.endsWith(".pdf")) {
                fileName += ".pdf";
            }

            if (Boolean.TRUE.equals(request.getSaveToServer())) {
                savePdfToServer(request.getFormDataId(), printTemplate, pdfBytes, fileName);
            }

            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" +
                    URLEncoder.encode(fileName, StandardCharsets.UTF_8.name()));
            response.setContentLength(pdfBytes.length);

            IoUtil.copy(new ByteArrayInputStream(pdfBytes), response.getOutputStream());
            response.flushBuffer();

            log.info("PDF导出成功: formDataId={}, fileName={}", request.getFormDataId(), fileName);
        } catch (Exception e) {
            log.error("PDF导出失败", e);
            throw new RuntimeException("PDF导出失败: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] generatePdfBytes(Long formDataId, PrintTemplate printTemplate,
                                   List<String> excludeFields, String watermarkText) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try {
            FormData formData = formDataMapper.selectById(formDataId);
            if (formData == null) {
                throw new RuntimeException("表单数据不存在");
            }

            FormTemplate formTemplate = formTemplateMapper.selectById(formData.getTemplateId());
            Map<String, Object> fieldValues = objectMapper.readValue(
                    formData.getFieldValuesJson(),
                    Map.class
            );

            if (excludeFields != null && !excludeFields.isEmpty()) {
                for (String field : excludeFields) {
                    fieldValues.remove(field);
                }
            }

            Context context = new Context();
            context.setVariable("fields", fieldValues);
            context.setVariable("formData", formData);
            context.setVariable("formTitle", formTemplate != null ? formTemplate.getTemplateName() : "表单打印");
            context.setVariable("submittedAt", formData.getSubmittedAt());
            context.setVariable("submitterId", formData.getSubmitterId());
            context.setVariable("formId", formData.getId());

            String templateContent = printTemplate.getTemplateContent();
            if (StrUtil.isBlank(templateContent)) {
                templateContent = printTemplateService.generateDefaultTemplateContent(formData.getTemplateId());
            }

            String renderedHtml = templateEngine.process(templateContent, context);

            org.jsoup.nodes.Document jsoupDoc = Jsoup.parse(renderedHtml);
            jsoupDoc.outputSettings().syntax(org.jsoup.nodes.Document.OutputSettings.Syntax.xml);
            org.w3c.dom.Document w3cDoc = new W3CDom().fromJsoup(jsoupDoc);

            ITextRenderer renderer = new ITextRenderer();

            String pageSize = printTemplate.getPaperSize();
            String orientation = printTemplate.getOrientation();

            com.lowagie.text.Rectangle rect = getPageSize(pageSize, orientation);
            renderer.getSharedContext().setPrint(true);

            BigDecimal marginTop = printTemplate.getMarginTop();
            BigDecimal marginBottom = printTemplate.getMarginBottom();
            BigDecimal marginLeft = printTemplate.getMarginLeft();
            BigDecimal marginRight = printTemplate.getMarginRight();

            renderer.setDocument(w3cDoc, null);
            renderer.layout();
            renderer.createPDF(outputStream, false);

            byte[] pdfWithoutWatermark = outputStream.toByteArray();
            outputStream.reset();

            boolean addWatermark = Boolean.TRUE.equals(printTemplate.getWatermarkEnabled());
            String watermark = StrUtil.isNotBlank(watermarkText) ? watermarkText : printTemplate.getWatermarkText();

            if (addWatermark && StrUtil.isNotBlank(watermark)) {
                float opacity = printTemplate.getWatermarkOpacity() != null
                        ? printTemplate.getWatermarkOpacity().floatValue() : 0.3f;
                int rotation = printTemplate.getWatermarkRotation() != null
                        ? printTemplate.getWatermarkRotation() : 30;
                int fontSize = printTemplate.getWatermarkFontSize() != null
                        ? printTemplate.getWatermarkFontSize() : 50;
                String color = printTemplate.getWatermarkColor() != null
                        ? printTemplate.getWatermarkColor() : "#CCCCCC";

                addWatermark(pdfWithoutWatermark, outputStream, watermark, opacity, rotation, fontSize, color);
            } else {
                outputStream.write(pdfWithoutWatermark);
            }

            renderer.finishPDF();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("生成PDF失败", e);
            throw new RuntimeException("生成PDF失败: " + e.getMessage(), e);
        }
    }

    @Override
    public ByteArrayOutputStream generatePdfStream(Long formDataId, PrintTemplate printTemplate,
                                                   List<String> excludeFields, String watermarkText) {
        byte[] bytes = generatePdfBytes(formDataId, printTemplate, excludeFields, watermarkText);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try {
            outputStream.write(bytes);
        } catch (Exception e) {
            throw new RuntimeException("创建输出流失败", e);
        }
        return outputStream;
    }

    @Override
    public String renderTemplate(PrintTemplate printTemplate, Map<String, Object> formData,
                                 Map<String, Object> fields) {
        Context context = new Context();
        context.setVariable("fields", fields);
        context.setVariable("formData", formData);
        context.setVariables(formData);
        return templateEngine.process(printTemplate.getTemplateContent(), context);
    }

    @Override
    public void batchExportPdf(BatchPdfExportRequestDTO request, HttpServletResponse response) {
        try {
            PrintTemplate printTemplate = resolvePrintTemplate(request);
            if (printTemplate == null) {
                throw new RuntimeException("未找到可用的打印模板");
            }

            List<byte[]> pdfFiles = new ArrayList<>();
            for (Long formDataId : request.getFormDataIds()) {
                byte[] pdfBytes = generatePdfBytes(formDataId, printTemplate, null, null);
                pdfFiles.add(pdfBytes);
            }

            byte[] resultPdf;
            String fileName;

            if (Boolean.TRUE.equals(request.getMergeIntoSingleFile())) {
                resultPdf = mergePdfFiles(pdfFiles);
                fileName = request.getCustomFileName();
                if (StrUtil.isBlank(fileName)) {
                    fileName = "批量导出_" + DateUtil.format(new Date(), "yyyyMMddHHmmss") + ".pdf";
                } else if (!fileName.endsWith(".pdf")) {
                    fileName += ".pdf";
                }
            } else {
                if (pdfFiles.size() == 1) {
                    resultPdf = pdfFiles.get(0);
                    fileName = "表单数据_" + request.getFormDataIds().get(0) + ".pdf";
                } else {
                    throw new RuntimeException("非合并模式仅支持单条数据导出");
                }
            }

            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" +
                    URLEncoder.encode(fileName, StandardCharsets.UTF_8.name()));
            response.setContentLength(resultPdf.length);

            IoUtil.copy(new ByteArrayInputStream(resultPdf), response.getOutputStream());
            response.flushBuffer();

            log.info("批量PDF导出成功: count={}, merged={}", request.getFormDataIds().size(),
                    request.getMergeIntoSingleFile());
        } catch (Exception e) {
            log.error("批量PDF导出失败", e);
            throw new RuntimeException("批量PDF导出失败: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] mergePdfFiles(List<byte[]> pdfFiles) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument mergedDoc = new PdfDocument(writer);
            PdfMerger merger = new PdfMerger(mergedDoc);

            for (byte[] pdfFile : pdfFiles) {
                try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfFile))) {
                    PdfDocument sourceDoc = new PdfDocument(reader);
                    merger.merge(sourceDoc, 1, sourceDoc.getNumberOfPages());
                    sourceDoc.close();
                }
            }

            mergedDoc.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("合并PDF失败", e);
            throw new RuntimeException("合并PDF失败: " + e.getMessage(), e);
        }
    }

    @Override
    public PrintRecord savePdfToServer(Long formDataId, PrintTemplate printTemplate,
                                       byte[] pdfBytes, String fileName) {
        try {
            FormData formData = formDataMapper.selectById(formDataId);
            String objectName = "pdf/" + TenantContext.getCurrentTenantId() + "/" +
                    formData.getTemplateId() + "/" + IdUtil.fastSimpleUUID() + ".pdf";

            InputStream inputStream = new ByteArrayInputStream(pdfBytes);
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioConfig.getBucketName())
                    .object(objectName)
                    .stream(inputStream, pdfBytes.length, -1)
                    .contentType("application/pdf")
                    .build());

            String fileUrl = minioConfig.getEndpoint() + "/" + minioConfig.getBucketName() + "/" + objectName;

            PrintRecord record = new PrintRecord();
            record.setPrintTemplateId(printTemplate.getId());
            record.setFormDataId(formDataId);
            record.setTemplateId(formData.getTemplateId());
            record.setFileName(fileName);
            record.setFileUrl(fileUrl);
            record.setFileSize((long) pdfBytes.length);
            record.setPrintType("PDF");
            record.setPrintCount(1);
            record.setStatus("SUCCESS");
            record.setTenantId(TenantContext.getCurrentTenantId());
            record.setCreatedBy(TenantContext.getCurrentUserId());

            printRecordMapper.insert(record);
            log.info("PDF保存到服务器成功: recordId={}, fileUrl={}", record.getId(), fileUrl);
            return record;
        } catch (Exception e) {
            log.error("保存PDF到服务器失败", e);
            throw new RuntimeException("保存PDF到服务器失败: " + e.getMessage(), e);
        }
    }

    @Override
    public String generatePdfPreviewUrl(Long formDataId, Long printTemplateId) {
        try {
            PrintTemplate printTemplate;
            if (printTemplateId != null) {
                printTemplate = printTemplateService.getById(printTemplateId);
            } else {
                FormData formData = formDataMapper.selectById(formDataId);
                printTemplate = printTemplateService.getDefault(formData.getTemplateId());
            }

            byte[] pdfBytes = generatePdfBytes(formDataId, printTemplate, null, null);
            FormData formData = formDataMapper.selectById(formDataId);
            String objectName = "pdf-preview/" + TenantContext.getCurrentTenantId() + "/" +
                    formDataId + "/" + IdUtil.fastSimpleUUID() + ".pdf";

            InputStream inputStream = new ByteArrayInputStream(pdfBytes);
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioConfig.getBucketName())
                    .object(objectName)
                    .stream(inputStream, pdfBytes.length, -1)
                    .contentType("application/pdf")
                    .build());

            return minioConfig.getEndpoint() + "/" + minioConfig.getBucketName() + "/" + objectName;
        } catch (Exception e) {
            log.error("生成PDF预览URL失败", e);
            throw new RuntimeException("生成PDF预览URL失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void addWatermark(byte[] pdfBytes, ByteArrayOutputStream outputStream,
                             String watermarkText, float opacity, int rotation,
                             int fontSize, String color) {
        try {
            PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(reader, writer);

            DeviceRgb rgbColor = parseColor(color);
            PdfFont font = PdfFontFactory.createFont("STSong-Light", "UniGB-UCS2-H",
                    PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);

            int numberOfPages = pdfDoc.getNumberOfPages();

            for (int i = 1; i <= numberOfPages; i++) {
                PdfPage page = pdfDoc.getPage(i);
                PageSize pageSize = new PageSize(page.getPageSize());

                try (Document doc = new Document(pdfDoc, pageSize)) {
                    Paragraph paragraph = new Paragraph(watermarkText)
                            .setFont(font)
                            .setFontSize(fontSize)
                            .setFontColor(rgbColor, opacity)
                            .setTextAlignment(TextAlignment.CENTER);

                    float width = pageSize.getWidth();
                    float height = pageSize.getHeight();

                    int xCount = 3;
                    int yCount = 4;
                    float xStep = width / xCount;
                    float yStep = height / yCount;

                    for (int x = 0; x < xCount; x++) {
                        for (int y = 0; y < yCount; y++) {
                            float xPos = x * xStep + xStep / 2;
                            float yPos = y * yStep + yStep / 2;

                            doc.showTextAligned(paragraph, xPos, yPos, i,
                                    TextAlignment.CENTER, VerticalAlignment.MIDDLE,
                                    (float) Math.toRadians(rotation));
                        }
                    }
                }
            }

            pdfDoc.close();
        } catch (Exception e) {
            log.error("添加水印失败", e);
            throw new RuntimeException("添加水印失败: " + e.getMessage(), e);
        }
    }

    private PrintTemplate resolvePrintTemplate(PdfExportRequestDTO request) {
        PrintTemplate printTemplate = null;
        if (request.getPrintTemplateId() != null) {
            printTemplate = printTemplateService.getById(request.getPrintTemplateId());
        }
        if (printTemplate == null && StrUtil.isNotBlank(request.getPrintTemplateCode())) {
            printTemplate = printTemplateService.getByCode(request.getPrintTemplateCode());
        }
        if (printTemplate == null) {
            FormData formData = formDataMapper.selectById(request.getFormDataId());
            if (formData != null) {
                printTemplate = printTemplateService.getDefault(formData.getTemplateId());
            }
        }
        return printTemplate;
    }

    private PrintTemplate resolvePrintTemplate(BatchPdfExportRequestDTO request) {
        PrintTemplate printTemplate = null;
        if (request.getPrintTemplateId() != null) {
            printTemplate = printTemplateService.getById(request.getPrintTemplateId());
        }
        if (printTemplate == null && StrUtil.isNotBlank(request.getPrintTemplateCode())) {
            printTemplate = printTemplateService.getByCode(request.getPrintTemplateCode());
        }
        if (printTemplate == null && !request.getFormDataIds().isEmpty()) {
            FormData formData = formDataMapper.selectById(request.getFormDataIds().get(0));
            if (formData != null) {
                printTemplate = printTemplateService.getDefault(formData.getTemplateId());
            }
        }
        return printTemplate;
    }

    private com.lowagie.text.Rectangle getPageSize(String paperSize, String orientation) {
        com.lowagie.text.Rectangle rect;
        switch (paperSize.toUpperCase()) {
            case "A5":
                rect = com.lowagie.text.PageSize.A5;
                break;
            case "A3":
                rect = com.lowagie.text.PageSize.A3;
                break;
            case "LETTER":
                rect = com.lowagie.text.PageSize.LETTER;
                break;
            case "LEGAL":
                rect = com.lowagie.text.PageSize.LEGAL;
                break;
            case "A4":
            default:
                rect = com.lowagie.text.PageSize.A4;
                break;
        }
        if ("LANDSCAPE".equalsIgnoreCase(orientation)) {
            rect = rect.rotate();
        }
        return rect;
    }

    private DeviceRgb parseColor(String colorHex) {
        if (StrUtil.isBlank(colorHex)) {
            return new DeviceRgb(204, 204, 204);
        }
        try {
            if (colorHex.startsWith("#")) {
                colorHex = colorHex.substring(1);
            }
            int r = Integer.parseInt(colorHex.substring(0, 2), 16);
            int g = Integer.parseInt(colorHex.substring(2, 4), 16);
            int b = Integer.parseInt(colorHex.substring(4, 6), 16);
            return new DeviceRgb(r, g, b);
        } catch (Exception e) {
            return new DeviceRgb(204, 204, 204);
        }
    }
}
