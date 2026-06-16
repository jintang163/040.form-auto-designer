package com.formdesigner.mapper;

import com.formdesigner.entity.SysFile;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysFileMapper {

    int insert(SysFile sysFile);

    SysFile selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    List<SysFile> selectByBusiness(@Param("businessType") String businessType, @Param("businessId") String businessId, @Param("tenantId") Long tenantId);

    List<SysFile> selectByUploadedBy(@Param("uploadedBy") String uploadedBy, @Param("tenantId") Long tenantId);

    List<SysFile> selectAll(@Param("tenantId") Long tenantId);

    int deleteById(@Param("id") Long id);
}
