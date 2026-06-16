package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.entity.SysFile;
import com.formdesigner.service.SysFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class SysFileController {

    private final SysFileService sysFileService;

    @GetMapping("/{id}")
    public R<SysFile> getById(@PathVariable Long id) {
        return R.ok(sysFileService.getById(id));
    }

    @GetMapping("/business/{businessType}/{businessId}")
    public R<List<SysFile>> listByBusiness(@PathVariable String businessType, @PathVariable String businessId) {
        return R.ok(sysFileService.listByBusiness(businessType, businessId));
    }

    @GetMapping("/uploaded-by/{uploadedBy}")
    public R<List<SysFile>> listByUploadedBy(@PathVariable String uploadedBy) {
        return R.ok(sysFileService.listByUploadedBy(uploadedBy));
    }

    @GetMapping
    public R<List<SysFile>> listAll() {
        return R.ok(sysFileService.listAll());
    }

    @PostMapping
    public R<SysFile> save(@RequestBody SysFile file) {
        return R.ok(sysFileService.save(file));
    }

    @DeleteMapping("/{id}")
    public R<Void> deleteById(@PathVariable Long id) {
        sysFileService.deleteById(id);
        return R.ok();
    }
}
