package com.formdesigner.mapper;

import com.formdesigner.entity.FormVersion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormVersionMapper {

    int insert(FormVersion formVersion);

    FormVersion selectById(@Param("id") Long id);

    List<FormVersion> selectByTemplateId(@Param("templateId") Long templateId);

    FormVersion selectByTemplateIdAndVersion(@Param("templateId") Long templateId, @Param("version") Integer version);
}
