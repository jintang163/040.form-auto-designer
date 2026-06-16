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

    List<FormData> selectAll();

    List<FormData> selectByTemplateIdPaged(@Param("templateId") Long templateId,
                                           @Param("offset") int offset,
                                           @Param("limit") int limit,
                                           @Param("fieldName") String fieldName,
                                           @Param("fieldValue") String fieldValue);

    Long countByTemplateId(@Param("templateId") Long templateId,
                           @Param("fieldName") String fieldName,
                           @Param("fieldValue") String fieldValue);

    List<FormData> selectByTemplateIdFiltered(@Param("templateId") Long templateId,
                                              @Param("fieldName") String fieldName,
                                              @Param("fieldValue") String fieldValue);

    List<FormData> selectBySubmitterId(@Param("templateId") Long templateId,
                                        @Param("submitterId") String submitterId);

    int deleteById(@Param("id") Long id);
}
