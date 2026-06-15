package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.RecognitionResultDTO;
import com.formdesigner.service.RecognitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/recognition")
@RequiredArgsConstructor
public class RecognitionController {

    private final RecognitionService recognitionService;

    @PostMapping("/recognize")
    public R<RecognitionResultDTO> recognize(@RequestParam("file") MultipartFile file) {
        return R.ok(recognitionService.recognize(file));
    }
}
