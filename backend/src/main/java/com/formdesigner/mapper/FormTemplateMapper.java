package com.formdesigner.mapper;

import com.formdesigner.entity.FormTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormTemplateMapper {

    int insert(FormTemplate formTemplate);

    FormTemplate selectById(@Param("id") Long id);

    FormTemplate selectByTemplateCode(@Param("templateCode") String templateCode);

    List<FormTemplate> selectAll();

    int updateById(FormTemplate formTemplate);

    int deleteById(@Param("id") Long id);
}
