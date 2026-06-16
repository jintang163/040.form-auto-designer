package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.SysFile;
import com.formdesigner.mapper.SysFileMapper;
import com.formdesigner.service.SysFileService;
import com.formdesigner.service.SysTenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SysFileServiceImpl implements SysFileService {

    private final SysFileMapper sysFileMapper;
    private final SysTenantService tenantService;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    public SysFile getById(Long id) {
        return sysFileMapper.selectById(id, currentTenantId());
    }

    @Override
    public List<SysFile> listByBusiness(String businessType, String businessId) {
        return sysFileMapper.selectByBusiness(businessType, businessId, currentTenantId());
    }

    @Override
    public List<SysFile> listByUploadedBy(String uploadedBy) {
        return sysFileMapper.selectByUploadedBy(uploadedBy, currentTenantId());
    }

    @Override
    public List<SysFile> listAll() {
        return sysFileMapper.selectAll(currentTenantId());
    }

    @Override
    @Transactional
    public SysFile save(SysFile file) {
        Long tenantId = currentTenantId();
        file.setTenantId(tenantId);

        long fileSizeBytes = file.getFileSize() != null ? file.getFileSize() : 0L;
        BigDecimal fileSizeMb = BigDecimal.valueOf(fileSizeBytes).divide(BigDecimal.valueOf(1024 * 1024), 2, BigDecimal.ROUND_HALF_UP);

        if (!tenantService.checkQuota(tenantId, "storage")) {
            throw new IllegalArgumentException("存储空间配额不足");
        }

        sysFileMapper.insert(file);

        log.info("File uploaded: {} ({} MB) for tenant {}", file.getFileName(), fileSizeMb, tenantId);
        return file;
    }

    @Override
    public void deleteById(Long id) {
        sysFileMapper.deleteById(id);
    }
}
