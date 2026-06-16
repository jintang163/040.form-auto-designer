package com.formdesigner.mapper;

import com.formdesigner.entity.FormDraft;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormDraftMapper {

    int insert(FormDraft formDraft);

    FormDraft selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    List<FormDraft> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<FormDraft> selectByUserId(@Param("userId") String userId, @Param("tenantId") Long tenantId);

    FormDraft selectByUserIdAndTemplateId(@Param("userId") String userId, @Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    int deleteById(@Param("id") Long id);

    int deleteByUserIdAndTemplateId(@Param("userId") String userId, @Param("templateId") Long templateId, @Param("tenantId") Long tenantId);
}
