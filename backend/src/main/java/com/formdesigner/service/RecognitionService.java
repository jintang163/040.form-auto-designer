package com.formdesigner.service;

import com.formdesigner.dto.RecognitionResultDTO;
import org.springframework.web.multipart.MultipartFile;

public interface RecognitionService {

    RecognitionResultDTO recognize(MultipartFile file);
}
