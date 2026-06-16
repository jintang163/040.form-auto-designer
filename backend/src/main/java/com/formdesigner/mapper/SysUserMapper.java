package com.formdesigner.mapper;

import com.formdesigner.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysUserMapper {

    SysUser selectByUserId(@Param("userId") String userId);

    SysUser selectById(@Param("id") Long id);

    int insert(SysUser user);

    int updateById(SysUser user);
}
