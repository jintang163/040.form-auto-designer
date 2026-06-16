package com.formdesigner.mapper;

import com.formdesigner.entity.SysTenantQuota;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysTenantQuotaMapper {

    SysTenantQuota selectByTenantId(@Param("tenantId") Long tenantId);

    int insert(SysTenantQuota quota);

    int updateByTenantId(SysTenantQuota quota);

    int incrementTemplateCount(@Param("tenantId") Long tenantId, @Param("delta") int delta);

    int incrementFormSubmissionCount(@Param("tenantId") Long tenantId, @Param("delta") int delta);

    int incrementApiCallCount(@Param("tenantId") Long tenantId, @Param("today") String today);
}
