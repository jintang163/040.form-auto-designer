package com.formdesigner.mapper;

import com.formdesigner.entity.PrintTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface PrintTemplateMapper {

    PrintTemplate selectById(@Param("id") Long id);

    PrintTemplate selectByCode(@Param("templateCode") String templateCode, @Param("tenantId") Long tenantId);

    List<PrintTemplate> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<PrintTemplate> selectAll(@Param("tenantId") Long tenantId);

    PrintTemplate selectDefault(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    int insert(PrintTemplate printTemplate);

    int update(PrintTemplate printTemplate);

    int deleteById(@Param("id") Long id);

    int updateDefaultStatus(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId, @Param("isDefault") Boolean isDefault);
}
