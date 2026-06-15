package com.formdesigner.mapper;

import com.formdesigner.entity.FormData;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormDataMapper {

    int insert(FormData formData);

    FormData selectById(@Param("id") Long id);

    List<FormData> selectByTemplateId(@Param("templateId") Long templateId);

    int deleteById(@Param("id") Long id);
}
