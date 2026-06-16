package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.service.VoiceService;
import com.formdesigner.vo.SpeechResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping("/speechToText")
    public R<SpeechResultVO> speechToText(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return R.fail("请上传语音文件");
        }

        try {
            String text = voiceService.speechToText(file);
            Double confidence = voiceService.getConfidence();

            SpeechResultVO result = new SpeechResultVO();
            result.setText(text);
            result.setConfidence(confidence);
            result.setSource(voiceService.getProviderName());
            result.setDuration(0L);

            return R.ok(result);
        } catch (Exception e) {
            return R.fail("语音识别失败: " + e.getMessage());
        }
    }

    @GetMapping("/status")
    public R<String> getStatus() {
        return R.ok(voiceService.getProviderName());
    }
}
