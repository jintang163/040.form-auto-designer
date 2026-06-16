package com.formdesigner.service;

import org.springframework.web.multipart.MultipartFile;

public interface VoiceService {

    String speechToText(MultipartFile file);

    Double getConfidence();

    String getProviderName();
}
