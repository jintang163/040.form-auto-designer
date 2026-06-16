package com.formdesigner.mapper;

import com.formdesigner.entity.FieldValueStats;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FieldValueStatsMapper {

    int insert(FieldValueStats stats);

    int upsertIncrement(FieldValueStats stats);

    FieldValueStats selectByUniqueKey(@Param("templateId") Long templateId,
                                       @Param("fieldName") String fieldName,
                                       @Param("fieldValue") String fieldValue,
                                       @Param("submitterId") String submitterId,
                                       @Param("tenantId") Long tenantId);

    List<FieldValueStats> selectByTemplateIdAndFieldName(@Param("templateId") Long templateId,
                                                          @Param("fieldName") String fieldName,
                                                          @Param("submitterId") String submitterId,
                                                          @Param("tenantId") Long tenantId);

    List<FieldValueStats> selectByTemplateIdAndFieldNameGlobal(@Param("templateId") Long templateId,
                                                                @Param("fieldName") String fieldName,
                                                                @Param("tenantId") Long tenantId);

    List<FieldValueStats> selectTopNBySubmitter(@Param("templateId") Long templateId,
                                                 @Param("fieldName") String fieldName,
                                                 @Param("submitterId") String submitterId,
                                                 @Param("limit") int limit,
                                                 @Param("tenantId") Long tenantId);

    List<FieldValueStats> selectTopNGlobal(@Param("templateId") Long templateId,
                                            @Param("fieldName") String fieldName,
                                            @Param("limit") int limit,
                                            @Param("tenantId") Long tenantId);

    int deleteByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    List<FieldValueStats> selectAllPerUserByTemplateIdAndFieldName(@Param("templateId") Long templateId,
                                                                     @Param("fieldName") String fieldName,
                                                                     @Param("tenantId") Long tenantId);
}
