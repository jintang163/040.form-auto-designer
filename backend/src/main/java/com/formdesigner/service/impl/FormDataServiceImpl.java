package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.dto.FormSubmitDTO;
import com.formdesigner.entity.FormData;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.mapper.FormDataMapper;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.service.FormDataService;
import com.formdesigner.service.DataStatisticsService;
import com.formdesigner.service.WebhookRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormDataServiceImpl implements FormDataService {

    private final FormDataMapper formDataMapper;
    private final FormTemplateMapper formTemplateMapper;
    private final FormFieldMapper formFieldMapper;
    private final WebhookRuleService webhookRuleService;
    private final DataStatisticsService dataStatisticsService;
    private final ObjectMapper objectMapper;

    @Override
    public FormData submit(FormSubmitDTO dto) {
        FormTemplate template = formTemplateMapper.selectById(dto.getTemplateId());
        if (template == null) {
            throw new IllegalArgumentException("模板不存在");
        }

        FormData formData = new FormData();
        formData.setTemplateId(dto.getTemplateId());
        formData.setVersion(dto.getVersion() != null ? dto.getVersion() : template.getVersion());
        formData.setFieldValuesJson(dto.getFieldValuesJson());
        formData.setSubmitterId(dto.getSubmitterId());
        formData.setSubmittedAt(LocalDateTime.now());
        formDataMapper.insert(formData);

        dataStatisticsService.syncToClickHouse(formData);

        try {
            webhookRuleService.triggerWebhooks(dto.getTemplateId(), dto.getFieldValuesJson());
        } catch (Exception e) {
            log.warn("Webhook推送异常: {}", e.getMessage());
        }

        return formData;
    }

    @Override
    public FormData getById(Long id) {
        return formDataMapper.selectById(id);
    }

    @Override
    public List<FormData> listByTemplateId(Long templateId) {
        return formDataMapper.selectByTemplateId(templateId);
    }

    @Override
    public Map<String, Object> listByTemplateIdPaged(Long templateId, int page, int pageSize,
                                                      String fieldName, String fieldValue) {
        int offset = (page - 1) * pageSize;
        List<FormData> list = formDataMapper.selectByTemplateIdPaged(
                templateId, offset, pageSize, fieldName, fieldValue);
        Long total = formDataMapper.countByTemplateId(templateId, fieldName, fieldValue);

        Map<String, Object> result = new HashMap<>();
        result.put("list", list);
        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        return result;
    }

    @Override
    public void exportExcel(Long templateId, String fieldName, String fieldValue,
                            HttpServletResponse response) {
        List<FormData> dataList = formDataMapper.selectByTemplateId(templateId);
        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId);
        FormTemplate template = formTemplateMapper.selectById(templateId);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(template != null ? template.getTemplateName() : "数据");

            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            int colIdx = 0;
            Cell idCell = headerRow.createCell(colIdx++);
            idCell.setCellValue("ID");
            idCell.setCellStyle(headerStyle);

            Cell submitterCell = headerRow.createCell(colIdx++);
            submitterCell.setCellValue("提交人");
            submitterCell.setCellStyle(headerStyle);

            Cell timeCell = headerRow.createCell(colIdx++);
            timeCell.setCellValue("提交时间");
            timeCell.setCellStyle(headerStyle);

            Map<String, String> fieldLabelMap = new LinkedHashMap<>();
            for (FormField field : fields) {
                Cell cell = headerRow.createCell(colIdx++);
                cell.setCellValue(field.getFieldLabel());
                cell.setCellStyle(headerStyle);
                fieldLabelMap.put(field.getFieldName(), field.getFieldLabel());
            }

            int rowIdx = 1;
            for (FormData fd : dataList) {
                Row row = sheet.createRow(rowIdx++);
                int c = 0;
                row.createCell(c++).setCellValue(fd.getId());
                row.createCell(c++).setCellValue(fd.getSubmitterId() != null ? fd.getSubmitterId() : "");
                row.createCell(c++).setCellValue(fd.getSubmittedAt() != null ? fd.getSubmittedAt().toString() : "");

                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> values = objectMapper.readValue(fd.getFieldValuesJson(), Map.class);
                    for (String fn : fieldLabelMap.keySet()) {
                        Object val = values.get(fn);
                        row.createCell(c++).setCellValue(val != null ? String.valueOf(val) : "");
                    }
                } catch (Exception e) {
                    for (int i = 0; i < fieldLabelMap.size(); i++) {
                        row.createCell(c++).setCellValue("");
                    }
                }
            }

            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            String fileName = (template != null ? template.getTemplateName() : "export") + ".xlsx";
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=" +
                    java.net.URLEncoder.encode(fileName, "UTF-8"));
            workbook.write(response.getOutputStream());
            response.getOutputStream().flush();
        } catch (IOException e) {
            log.error("导出Excel失败", e);
            throw new RuntimeException("导出Excel失败: " + e.getMessage());
        }
    }

    @Override
    public boolean deleteById(Long id) {
        return formDataMapper.deleteById(id) > 0;
    }
}
