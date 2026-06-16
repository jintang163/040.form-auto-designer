package com.formdesigner.service;

import com.formdesigner.dto.OcrResultDTO;
import org.springframework.web.multipart.MultipartFile;

public interface OcrService {

    OcrResultDTO recognize(MultipartFile file, String docType);
}
