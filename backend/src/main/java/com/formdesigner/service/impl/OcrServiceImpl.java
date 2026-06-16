package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.dto.OcrResultDTO;
import com.formdesigner.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrServiceImpl implements OcrService {

    @Value("${ocr.mock:true}")
    private boolean mock;

    @Value("${ocr.provider:mock}")
    private String provider;

    private final ObjectMapper objectMapper;

    @Override
    public OcrResultDTO recognize(MultipartFile file, String docType) {
        if (file == null || file.isEmpty()) {
            return OcrResultDTO.fail("图片文件为空");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!(name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".bmp"))) {
            return OcrResultDTO.fail("仅支持 jpg/png/bmp 图片格式");
        }
        try {
            if (mock || "mock".equalsIgnoreCase(provider)) {
                return mockRecognize(file, docType);
            }
            return callOcrProvider(file, docType);
        } catch (Exception e) {
            log.error("OCR 识别失败 docType={}", docType, e);
            return OcrResultDTO.fail("OCR 识别失败: " + e.getMessage());
        }
    }

    private OcrResultDTO callOcrProvider(MultipartFile file, String docType) throws Exception {
        log.info("调用 OCR provider={} docType={} file={}", provider, docType, file.getOriginalFilename());
        switch (provider.toLowerCase()) {
            case "aliyun":
                return recognizeByAliyun(file, docType);
            case "baidu":
                return recognizeByBaidu(file, docType);
            default:
                return mockRecognize(file, docType);
        }
    }

    private OcrResultDTO recognizeByAliyun(MultipartFile file, String docType) throws Exception {
        log.warn("阿里云 OCR 暂未接入，使用 mock 数据: docType={}", docType);
        return mockRecognize(file, docType);
    }

    private OcrResultDTO recognizeByBaidu(MultipartFile file, String docType) throws Exception {
        log.warn("百度 OCR 暂未接入，使用 mock 数据: docType={}", docType);
        return mockRecognize(file, docType);
    }

    private OcrResultDTO mockRecognize(MultipartFile file, String docType) throws Exception {
        OcrResultDTO result = new OcrResultDTO();
        result.setSuccess(true);
        result.setDocType(docType);

        Map<String, String> fields = new LinkedHashMap<>();
        List<OcrResultDTO.OcrFieldItem> items = new ArrayList<>();

        switch (docType == null ? "" : docType.toUpperCase()) {
            case "ID_CARD_FRONT":
                fields.put("name", "张三");
                fields.put("gender", "男");
                fields.put("ethnicity", "汉族");
                fields.put("birthDate", "1990-01-15");
                fields.put("address", "北京市朝阳区建国路88号");
                fields.put("idNumber", "110101199001151234");
                break;
            case "ID_CARD_BACK":
                fields.put("issuedBy", "北京市公安局朝阳分局");
                fields.put("validPeriod", "2015.01.15-2035.01.15");
                break;
            case "BUSINESS_LICENSE":
                fields.put("companyName", "北京示例科技有限公司");
                fields.put("creditCode", "91110000MA00XXXXXX");
                fields.put("legalPerson", "李四");
                fields.put("registeredCapital", "500万元人民币");
                fields.put("establishedDate", "2018-05-20");
                fields.put("businessScope", "技术开发、技术咨询、技术服务；计算机系统服务；软件开发。");
                fields.put("address", "北京市海淀区中关村大街1号");
                break;
            default:
                fields.put("content", "文档内容自动识别结果占位。请上传身份证或营业执照图片。");
        }

        int idx = 0;
        for (Map.Entry<String, String> e : fields.entrySet()) {
            OcrResultDTO.OcrFieldItem it = new OcrResultDTO.OcrFieldItem();
            it.setFieldName(e.getKey());
            it.setFieldLabel(guessLabel(e.getKey()));
            it.setFieldType("string");
            it.setInputType(guessInputType(e.getKey()));
            it.setDefaultValue(e.getValue());
            it.setRequired(guessRequired(e.getKey()));
            it.setSortOrder(idx++);
            items.add(it);
        }

        result.setFields(fields);
        result.setFieldItems(items);
        result.setRawJson(objectMapper.writeValueAsString(fields));
        result.setMessage(mock ? "（模拟识别）请在 application.yml 中配置 ocr.provider=aliyun/baidu 接入真实 OCR" : "识别成功");
        return result;
    }

    private String guessLabel(String key) {
        switch (key) {
            case "name": return "姓名";
            case "gender": return "性别";
            case "ethnicity": return "民族";
            case "birthDate": return "出生日期";
            case "address": return "住址";
            case "idNumber": return "身份证号";
            case "issuedBy": return "签发机关";
            case "validPeriod": return "有效期限";
            case "companyName": return "企业名称";
            case "creditCode": return "统一社会信用代码";
            case "legalPerson": return "法定代表人";
            case "registeredCapital": return "注册资本";
            case "establishedDate": return "成立日期";
            case "businessScope": return "经营范围";
            case "content": return "识别内容";
            default: return key;
        }
    }

    private String guessInputType(String key) {
        if (key.endsWith("Date") || "validPeriod".equals(key)) return "date";
        if ("idNumber".equals(key) || "creditCode".equals(key)) return "text";
        if ("businessScope".equals(key) || "address".equals(key) || "content".equals(key)) return "textarea";
        return "text";
    }

    private boolean guessRequired(String key) {
        return "name".equals(key) || "idNumber".equals(key)
                || "companyName".equals(key) || "creditCode".equals(key);
    }
}
