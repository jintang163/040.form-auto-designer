package com.formdesigner.mapper;

import com.formdesigner.entity.SysTenantUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysTenantUserMapper {

    List<SysTenantUser> selectByUserId(@Param("userId") String userId);

    List<SysTenantUser> selectByTenantId(@Param("tenantId") Long tenantId);

    SysTenantUser selectByTenantIdAndUserId(@Param("tenantId") Long tenantId, @Param("userId") String userId);

    int insert(SysTenantUser tenantUser);

    int deleteById(@Param("id") Long id);

    int deleteByTenantIdAndUserId(@Param("tenantId") Long tenantId, @Param("userId") String userId);
}
