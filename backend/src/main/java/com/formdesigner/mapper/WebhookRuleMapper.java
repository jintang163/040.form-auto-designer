package com.formdesigner.mapper;

import com.formdesigner.entity.WebhookRule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface WebhookRuleMapper {
    int insert(WebhookRule webhookRule);

    WebhookRule selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    List<WebhookRule> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<WebhookRule> selectEnabledByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<WebhookRule> selectAll(@Param("tenantId") Long tenantId);

    int updateById(WebhookRule webhookRule);

    int deleteById(@Param("id") Long id);
}
