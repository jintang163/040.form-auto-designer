package com.formdesigner.mapper;

import com.formdesigner.entity.FormI18nResource;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormI18nResourceMapper {

    int insert(FormI18nResource resource);

    int update(FormI18nResource resource);

    FormI18nResource selectByKeyAndLanguage(
            @Param("resourceKey") String resourceKey,
            @Param("language") String language,
            @Param("tenantId") Long tenantId
    );

    List<FormI18nResource> selectByTemplateId(
            @Param("templateId") Long templateId,
            @Param("tenantId") Long tenantId
    );

    List<FormI18nResource> selectByTemplateIdAndLanguage(
            @Param("templateId") Long templateId,
            @Param("language") String language,
            @Param("tenantId") Long tenantId
    );

    List<FormI18nResource> selectByLanguage(
            @Param("language") String language,
            @Param("tenantId") Long tenantId
    );

    int deleteByKeyAndLanguage(
            @Param("resourceKey") String resourceKey,
            @Param("language") String language,
            @Param("tenantId") Long tenantId
    );

    int deleteByTemplateId(
            @Param("templateId") Long templateId,
            @Param("tenantId") Long tenantId
    );
}
