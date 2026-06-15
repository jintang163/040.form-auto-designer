package com.formdesigner.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {

    String upload(MultipartFile file, String path);

    void delete(String fileUrl);

    String getPresignedUrl(String objectName);
}
