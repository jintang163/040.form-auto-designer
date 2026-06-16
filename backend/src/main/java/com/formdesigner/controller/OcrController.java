package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.OcrResultDTO;
import com.formdesigner.service.OcrService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;

    @PostMapping("/recognize")
    public R<OcrResultDTO> recognize(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "docType", defaultValue = "AUTO") String docType) {
        return R.ok(ocrService.recognize(file, docType));
    }
}
