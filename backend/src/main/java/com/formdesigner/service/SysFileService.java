package com.formdesigner.service;

import com.formdesigner.entity.SysFile;
import java.util.List;

public interface SysFileService {

    SysFile getById(Long id);

    List<SysFile> listByBusiness(String businessType, String businessId);

    List<SysFile> listByUploadedBy(String uploadedBy);

    List<SysFile> listAll();

    SysFile save(SysFile file);

    void deleteById(Long id);
}
