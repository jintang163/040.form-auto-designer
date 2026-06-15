package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/upload")
    public R<String> upload(@RequestParam("file") MultipartFile file,
                            @RequestParam(value = "path", defaultValue = "uploads") String path) {
        String url = fileUploadService.upload(file, path);
        return R.ok(url);
    }

    @DeleteMapping
    public R<Void> delete(@RequestParam("fileUrl") String fileUrl) {
        fileUploadService.delete(fileUrl);
        return R.ok();
    }

    @GetMapping("/presigned-url")
    public R<String> getPresignedUrl(@RequestParam("objectName") String objectName) {
        return R.ok(fileUploadService.getPresignedUrl(objectName));
    }
}
