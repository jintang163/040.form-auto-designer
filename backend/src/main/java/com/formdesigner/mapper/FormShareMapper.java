package com.formdesigner.mapper;

import com.formdesigner.entity.FormShare;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FormShareMapper {

    int insert(FormShare formShare);

    FormShare selectByShareCode(@Param("shareCode") String shareCode);

    List<FormShare> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    int updateByShareCode(FormShare formShare);

    int revokeByShareCode(@Param("shareCode") String shareCode);

    int deleteByShareCode(@Param("shareCode") String shareCode);
}
