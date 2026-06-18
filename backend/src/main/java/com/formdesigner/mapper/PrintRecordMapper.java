package com.formdesigner.mapper;

import com.formdesigner.entity.PrintRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface PrintRecordMapper {

    PrintRecord selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    List<PrintRecord> selectByFormDataId(@Param("formDataId") Long formDataId, @Param("tenantId") Long tenantId);

    List<PrintRecord> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    int insert(PrintRecord printRecord);

    int updatePrintCount(@Param("id") Long id);

    int updateStatus(@Param("id") Long id, @Param("status") String status, @Param("errorMessage") String errorMessage);
}
