package com.formdesigner.mapper;

import com.formdesigner.entity.SysTenant;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysTenantMapper {

    SysTenant selectById(@Param("id") Long id);

    SysTenant selectByCode(@Param("tenantCode") String tenantCode);

    List<SysTenant> selectAll();

    List<SysTenant> selectByStatus(@Param("status") String status);

    int insert(SysTenant tenant);

    int updateById(SysTenant tenant);

    int deleteById(@Param("id") Long id);
}
