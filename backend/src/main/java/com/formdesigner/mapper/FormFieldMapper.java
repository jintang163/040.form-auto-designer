package com.formdesigner.mapper;

import com.formdesigner.entity.FormField;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormFieldMapper {

    int insert(FormField formField);

    int batchInsert(@Param("list") List<FormField> list);

    FormField selectById(@Param("id") Long id);

    List<FormField> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    int updateById(FormField formField);

    int deleteById(@Param("id") Long id);

    int deleteByTemplateId(@Param("templateId") Long templateId);

    FormField selectByTemplateIdAndFieldName(@Param("templateId") Long templateId,
                                             @Param("fieldName") String fieldName,
                                             @Param("tenantId") Long tenantId);
}
