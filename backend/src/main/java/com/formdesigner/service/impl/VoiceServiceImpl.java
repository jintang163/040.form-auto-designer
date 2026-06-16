package com.formdesigner.service.impl;

import com.formdesigner.service.VoiceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Service
public class VoiceServiceImpl implements VoiceService {

    @Value("${voice.asr.mock:true}")
    private boolean mockMode;

    @Value("${voice.asr.provider:mock}")
    private String provider;

    @Value("${voice.asr.api-key:}")
    private String apiKey;

    @Value("${voice.asr.secret-key:}")
    private String secretKey;

    private static final List<String> MOCK_PHRASES = Arrays.asList(
        "姓名张三，电话13812345678",
        "姓名李四，年龄25岁，性别男",
        "电话13987654321，邮箱zhangsan@example.com",
        "地址北京市朝阳区建国路88号",
        "身份证号110101199001011234，生日1990年1月1日",
        "公司科技有限公司，职位高级工程师",
        "备注请尽快处理，谢谢",
        "描述这是一个测试表单，用于验证语音识别功能"
    );

    private final Random random = new Random();
    private String lastResult = "";
    private double lastConfidence = 0.9;

    @Override
    public String speechToText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("语音文件不能为空");
        }

        String fileName = file.getOriginalFilename();
        long fileSize = file.getSize();
        if (fileName == null || !isSupportedFormat(fileName)) {
            throw new IllegalArgumentException("不支持的音频格式，支持 mp3、wav、m4a、aac");
        }
        if (fileSize > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("音频文件大小不能超过 10MB");
        }

        if (mockMode || "mock".equals(provider)) {
            return mockRecognize(file);
        }

        return realRecognize(file);
    }

    @Override
    public Double getConfidence() {
        return lastConfidence;
    }

    @Override
    public String getProviderName() {
        return mockMode ? "mock" : provider;
    }

    private String mockRecognize(MultipartFile file) {
        try {
            Thread.sleep(300 + random.nextInt(500));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String result = MOCK_PHRASES.get(random.nextInt(MOCK_PHRASES.size()));
        lastResult = result;
        lastConfidence = 0.85 + random.nextDouble() * 0.15;
        return result;
    }

    private String realRecognize(MultipartFile file) {
        switch (provider.toLowerCase()) {
            case "baidu":
                return recognizeByBaidu(file);
            case "aliyun":
                return recognizeByAliyun(file);
            case "xunfei":
                return recognizeByXunfei(file);
            case "tencent":
                return recognizeByTencent(file);
            default:
                return mockRecognize(file);
        }
    }

    private String recognizeByBaidu(MultipartFile file) {
        lastResult = "[百度语音识别] 功能待接入";
        lastConfidence = 0.0;
        return lastResult;
    }

    private String recognizeByAliyun(MultipartFile file) {
        lastResult = "[阿里云语音识别] 功能待接入";
        lastConfidence = 0.0;
        return lastResult;
    }

    private String recognizeByXunfei(MultipartFile file) {
        lastResult = "[讯飞语音识别] 功能待接入";
        lastConfidence = 0.0;
        return lastResult;
    }

    private String recognizeByTencent(MultipartFile file) {
        lastResult = "[腾讯语音识别] 功能待接入";
        lastConfidence = 0.0;
        return lastResult;
    }

    private boolean isSupportedFormat(String fileName) {
        String lowerName = fileName.toLowerCase();
        return lowerName.endsWith(".mp3")
                || lowerName.endsWith(".wav")
                || lowerName.endsWith(".m4a")
                || lowerName.endsWith(".aac")
                || lowerName.endsWith(".pcm");
    }
}
