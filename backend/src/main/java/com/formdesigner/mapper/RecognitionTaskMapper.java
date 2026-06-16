package com.formdesigner.mapper;

import com.formdesigner.entity.RecognitionTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface RecognitionTaskMapper {

    int insert(RecognitionTask recognitionTask);

    int updateById(RecognitionTask recognitionTask);

    RecognitionTask selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    RecognitionTask selectByTaskId(@Param("taskId") String taskId, @Param("tenantId") Long tenantId);

    List<RecognitionTask> selectByStatus(@Param("status") String status, @Param("tenantId") Long tenantId);

    List<RecognitionTask> selectAll(@Param("tenantId") Long tenantId);

    int deleteById(@Param("id") Long id);
}
