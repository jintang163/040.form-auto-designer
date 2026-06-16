package com.formdesigner.mapper;

import com.formdesigner.entity.WebhookRule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface WebhookRuleMapper {
    int insert(WebhookRule webhookRule);

    WebhookRule selectById(@Param("id") Long id);

    List<WebhookRule> selectByTemplateId(@Param("templateId") Long templateId);

    List<WebhookRule> selectEnabledByTemplateId(@Param("templateId") Long templateId);

    List<WebhookRule> selectAll();

    int updateById(WebhookRule webhookRule);

    int deleteById(@Param("id") Long id);
}
