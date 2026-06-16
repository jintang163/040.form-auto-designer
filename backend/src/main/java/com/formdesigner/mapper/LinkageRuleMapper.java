package com.formdesigner.mapper;

import com.formdesigner.entity.LinkageRule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface LinkageRuleMapper {

    void insert(LinkageRule rule);

    void updateById(LinkageRule rule);

    void deleteById(@Param("id") Long id);

    LinkageRule selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    List<LinkageRule> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<LinkageRule> selectByTargetField(@Param("templateId") Long templateId, @Param("targetField") String targetField, @Param("tenantId") Long tenantId);

    List<LinkageRule> selectBySourceField(@Param("templateId") Long templateId, @Param("sourceField") String sourceField, @Param("tenantId") Long tenantId);

    List<LinkageRule> selectAll(@Param("tenantId") Long tenantId);
}
