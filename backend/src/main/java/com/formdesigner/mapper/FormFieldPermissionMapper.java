package com.formdesigner.mapper;

import com.formdesigner.entity.FormFieldPermission;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface FormFieldPermissionMapper {

    @Select("SELECT * FROM form_field_permission WHERE tenant_id = #{tenantId}")
    List<FormFieldPermission> selectAll(@Param("tenantId") Long tenantId);

    List<FormFieldPermission> selectByTemplateAndField(
            @Param("templateId") Long templateId,
            @Param("fieldName") String fieldName,
            @Param("tenantId") Long tenantId);

    int insert(FormFieldPermission permission);

    int update(FormFieldPermission permission);

    int deleteById(@Param("id") Long id);
}
