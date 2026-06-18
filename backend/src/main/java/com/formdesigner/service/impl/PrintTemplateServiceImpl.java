package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.PrintTemplateDTO;
import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.entity.PrintTemplate;
import com.formdesigner.mapper.FormFieldMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.mapper.PrintTemplateMapper;
import com.formdesigner.service.PrintTemplateService;
import com.formdesigner.vo.PrintTemplateVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrintTemplateServiceImpl implements PrintTemplateService {

    private final PrintTemplateMapper printTemplateMapper;
    private final FormTemplateMapper formTemplateMapper;
    private final FormFieldMapper formFieldMapper;

    @Override
    @Transactional
    public PrintTemplate create(PrintTemplateDTO dto) {
        Long tenantId = TenantContext.getCurrentTenantId();

        PrintTemplate printTemplate = new PrintTemplate();
        BeanUtils.copyProperties(dto, printTemplate);
        printTemplate.setTenantId(tenantId);
        printTemplate.setCreatedBy(TenantContext.getCurrentUserId());

        if (printTemplate.getTemplateContent() == null || printTemplate.getTemplateContent().isEmpty()) {
            printTemplate.setTemplateContent(generateDefaultTemplateContent(dto.getTemplateId()));
        }

        if (Boolean.TRUE.equals(dto.getIsDefault())) {
            printTemplateMapper.updateDefaultStatus(dto.getTemplateId(), tenantId, false);
        }

        printTemplateMapper.insert(printTemplate);
        log.info("创建打印模板成功: id={}, name={}", printTemplate.getId(), printTemplate.getTemplateName());
        return printTemplate;
    }

    @Override
    @Transactional
    public PrintTemplate update(Long id, PrintTemplateDTO dto) {
        Long tenantId = TenantContext.getCurrentTenantId();
        PrintTemplate existing = printTemplateMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("打印模板不存在");
        }

        if (Boolean.TRUE.equals(dto.getIsDefault()) && !Boolean.TRUE.equals(existing.getIsDefault())) {
            printTemplateMapper.updateDefaultStatus(dto.getTemplateId(), tenantId, false);
        }

        PrintTemplate printTemplate = new PrintTemplate();
        BeanUtils.copyProperties(dto, printTemplate);
        printTemplate.setId(id);

        printTemplateMapper.update(printTemplate);
        log.info("更新打印模板成功: id={}", id);
        return printTemplateMapper.selectById(id);
    }

    @Override
    public boolean delete(Long id) {
        PrintTemplate existing = printTemplateMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("打印模板不存在");
        }
        int result = printTemplateMapper.deleteById(id);
        log.info("删除打印模板: id={}, result={}", id, result);
        return result > 0;
    }

    @Override
    public PrintTemplate getById(Long id) {
        return printTemplateMapper.selectById(id);
    }

    @Override
    public PrintTemplate getByCode(String templateCode) {
        Long tenantId = TenantContext.getCurrentTenantId();
        return printTemplateMapper.selectByCode(templateCode, tenantId);
    }

    @Override
    public List<PrintTemplateVO> listByTemplateId(Long templateId) {
        Long tenantId = TenantContext.getCurrentTenantId();
        List<PrintTemplate> templates = printTemplateMapper.selectByTemplateId(templateId, tenantId);
        return templates.stream()
                .map(this::convertToVO)
                .collect(Collectors.toList());
    }

    @Override
    public List<PrintTemplateVO> listAll() {
        Long tenantId = TenantContext.getCurrentTenantId();
        List<PrintTemplate> templates = printTemplateMapper.selectAll(tenantId);
        return templates.stream()
                .map(this::convertToVO)
                .collect(Collectors.toList());
    }

    @Override
    public PrintTemplate getDefault(Long templateId) {
        Long tenantId = TenantContext.getCurrentTenantId();
        PrintTemplate template = printTemplateMapper.selectDefault(templateId, tenantId);
        if (template == null) {
            template = printTemplateMapper.selectDefault(0L, 0L);
        }
        return template;
    }

    @Override
    @Transactional
    public PrintTemplate setDefault(Long id) {
        PrintTemplate template = printTemplateMapper.selectById(id);
        if (template == null) {
            throw new RuntimeException("打印模板不存在");
        }
        Long tenantId = TenantContext.getCurrentTenantId();
        printTemplateMapper.updateDefaultStatus(template.getTemplateId(), tenantId, false);

        template.setIsDefault(true);
        printTemplateMapper.update(template);
        log.info("设置默认打印模板: id={}", id);
        return template;
    }

    @Override
    public String generateDefaultTemplateContent(Long templateId) {
        FormTemplate formTemplate = formTemplateMapper.selectById(templateId);
        List<FormField> fields = formFieldMapper.selectByTemplateId(templateId);

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n");
        sb.append("<html xmlns:th=\"http://www.thymeleaf.org\">\n");
        sb.append("<head>\n");
        sb.append("    <meta charset=\"UTF-8\"/>\n");
        sb.append("    <title>").append(formTemplate != null ? formTemplate.getTemplateName() : "表单打印").append("</title>\n");
        sb.append("    <style>\n");
        sb.append("        @page { size: A4; margin: 2.54cm; }\n");
        sb.append("        body { font-family: 'SimSun', 'Microsoft YaHei', sans-serif; font-size: 12px; color: #333; }\n");
        sb.append("        .form-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }\n");
        sb.append("        .form-info { text-align: right; margin-bottom: 20px; color: #666; }\n");
        sb.append("        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }\n");
        sb.append("        th, td { border: 1px solid #333; padding: 8px; text-align: left; vertical-align: top; }\n");
        sb.append("        th { background-color: #f5f5f5; width: 120px; font-weight: normal; }\n");
        sb.append("        .section-title { font-size: 16px; font-weight: bold; margin: 15px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #333; }\n");
        sb.append("        .signature-area { margin-top: 50px; }\n");
        sb.append("        .signature-row { display: flex; justify-content: space-between; margin-top: 60px; }\n");
        sb.append("        .signature-item { text-align: center; width: 200px; }\n");
        sb.append("        .signature-line { border-top: 1px solid #333; margin-top: 50px; margin-bottom: 5px; }\n");
        sb.append("    </style>\n");
        sb.append("</head>\n");
        sb.append("<body>\n");
        sb.append("    <div class=\"form-title\" th:text=\"${formTitle}\">表单标题</div>\n");
        sb.append("    <div class=\"form-info\">\n");
        sb.append("        <span>提交时间：<span th:text=\"${#dates.format(submittedAt, 'yyyy-MM-dd HH:mm:ss')}\"></span></span>\n");
        sb.append("    </div>\n");

        if (fields != null && !fields.isEmpty()) {
            sb.append("    <table>\n");
            int count = 0;
            for (FormField field : fields) {
                if (count % 2 == 0) {
                    sb.append("        <tr>\n");
                }
                sb.append("            <th>").append(field.getFieldLabel() != null ? field.getFieldLabel() : field.getFieldName()).append("</th>\n");
                sb.append("            <td th:text=\"${fields['").append(field.getFieldName()).append("']}\">-</td>\n");
                if (count % 2 == 1) {
                    sb.append("        </tr>\n");
                }
                count++;
            }
            if (count % 2 == 1) {
                sb.append("            <th></th><td></td>\n        </tr>\n");
            }
            sb.append("    </table>\n");
        }

        sb.append("    <div class=\"signature-area\">\n");
        sb.append("        <div class=\"signature-row\">\n");
        sb.append("            <div class=\"signature-item\">\n");
        sb.append("                <div class=\"signature-line\"></div>\n");
        sb.append("                <div>申请人签字</div>\n");
        sb.append("            </div>\n");
        sb.append("            <div class=\"signature-item\">\n");
        sb.append("                <div class=\"signature-line\"></div>\n");
        sb.append("                <div>审核人签字</div>\n");
        sb.append("            </div>\n");
        sb.append("            <div class=\"signature-item\">\n");
        sb.append("                <div class=\"signature-line\"></div>\n");
        sb.append("                <div>批准人签字</div>\n");
        sb.append("            </div>\n");
        sb.append("        </div>\n");
        sb.append("    </div>\n");
        sb.append("</body>\n");
        sb.append("</html>");

        return sb.toString();
    }

    private PrintTemplateVO convertToVO(PrintTemplate entity) {
        PrintTemplateVO vo = new PrintTemplateVO();
        BeanUtils.copyProperties(entity, vo);
        return vo;
    }
}
