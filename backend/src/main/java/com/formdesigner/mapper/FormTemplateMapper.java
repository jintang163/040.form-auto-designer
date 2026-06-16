package com.formdesigner.mapper;

import com.formdesigner.entity.FormTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormTemplateMapper {

    int insert(FormTemplate formTemplate);

    FormTemplate selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    FormTemplate selectByTemplateCode(@Param("templateCode") String templateCode, @Param("tenantId") Long tenantId);

    List<FormTemplate> selectAll(@Param("tenantId") Long tenantId);

    int updateById(FormTemplate formTemplate);

    int deleteById(@Param("id") Long id);
}
