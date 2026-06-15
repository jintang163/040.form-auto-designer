package com.formdesigner.service.impl;

import com.formdesigner.dto.RecognitionResultDTO;
import com.formdesigner.grpc.RecognitionGrpcClient;
import com.formdesigner.service.RecognitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecognitionServiceImpl implements RecognitionService {

    private final RecognitionGrpcClient recognitionGrpcClient;

    @Override
    public RecognitionResultDTO recognize(MultipartFile file) {
        try {
            byte[] imageBytes = file.getBytes();
            return recognitionGrpcClient.recognize(imageBytes, file.getContentType());
        } catch (Exception e) {
            log.error("表单识别失败", e);
            RecognitionResultDTO result = new RecognitionResultDTO();
            result.setSuccess(false);
            result.setMessage("表单识别失败: " + e.getMessage());
            return result;
        }
    }
}
