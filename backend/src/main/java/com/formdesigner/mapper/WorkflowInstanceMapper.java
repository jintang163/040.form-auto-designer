package com.formdesigner.mapper;

import com.formdesigner.entity.WorkflowInstance;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface WorkflowInstanceMapper {

    @Insert("INSERT INTO workflow_instance (form_data_id, template_id, process_instance_id, process_definition_id, " +
            "business_key, status, submitter_id, current_assignee, current_level, start_time, tenant_id, created_at) " +
            "VALUES (#{formDataId}, #{templateId}, #{processInstanceId}, #{processDefinitionId}, " +
            "#{businessKey}, #{status}, #{submitterId}, #{currentAssignee}, #{currentLevel}, NOW(), #{tenantId}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(WorkflowInstance instance);

    @Select("SELECT * FROM workflow_instance WHERE id = #{id} AND tenant_id = #{tenantId}")
    WorkflowInstance selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    @Select("SELECT * FROM workflow_instance WHERE process_instance_id = #{processInstanceId}")
    WorkflowInstance selectByProcessInstanceId(@Param("processInstanceId") String processInstanceId);

    @Select("SELECT * FROM workflow_instance WHERE form_data_id = #{formDataId} AND tenant_id = #{tenantId} ORDER BY created_at DESC")
    List<WorkflowInstance> selectByFormDataId(@Param("formDataId") Long formDataId, @Param("tenantId") Long tenantId);

    @Select("SELECT * FROM workflow_instance WHERE template_id = #{templateId} AND tenant_id = #{tenantId} ORDER BY created_at DESC")
    List<WorkflowInstance> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    @Select("SELECT * FROM workflow_instance WHERE submitter_id = #{submitterId} AND tenant_id = #{tenantId} ORDER BY created_at DESC")
    List<WorkflowInstance> selectBySubmitterId(@Param("submitterId") String submitterId, @Param("tenantId") Long tenantId);

    @Update("UPDATE workflow_instance SET status = #{status}, current_assignee = #{currentAssignee}, " +
            "current_level = #{currentLevel}, end_time = #{endTime}, outcome = #{outcome} " +
            "WHERE id = #{id}")
    int update(WorkflowInstance instance);
}
