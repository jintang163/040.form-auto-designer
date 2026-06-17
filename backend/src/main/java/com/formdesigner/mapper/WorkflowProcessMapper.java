package com.formdesigner.mapper;

import com.formdesigner.entity.WorkflowProcess;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface WorkflowProcessMapper {

    @Insert("INSERT INTO workflow_process (template_id, process_key, process_name, process_definition_id, " +
            "bpmn_xml, form_variable_mapping, multi_instance_type, assignees, approval_levels, status, tenant_id, created_at, updated_at) " +
            "VALUES (#{templateId}, #{processKey}, #{processName}, #{processDefinitionId}, " +
            "#{bpmnXml}, #{formVariableMapping}, #{multiInstanceType}, #{assignees}, #{approvalLevels}, #{status}, #{tenantId}, NOW(), NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(WorkflowProcess process);

    @Select("SELECT * FROM workflow_process WHERE id = #{id} AND tenant_id = #{tenantId}")
    WorkflowProcess selectById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    @Select("SELECT * FROM workflow_process WHERE template_id = #{templateId} AND tenant_id = #{tenantId} AND status = 'ACTIVE'")
    WorkflowProcess selectActiveByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    @Select("SELECT * FROM workflow_process WHERE template_id = #{templateId} AND tenant_id = #{tenantId}")
    List<WorkflowProcess> selectByTemplateId(@Param("templateId") Long templateId, @Param("tenantId") Long tenantId);

    @Update("UPDATE workflow_process SET status = #{status}, updated_at = NOW() WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    @Update("UPDATE workflow_process SET process_definition_id = #{processDefinitionId}, bpmn_xml = #{bpmnXml}, " +
            "form_variable_mapping = #{formVariableMapping}, multi_instance_type = #{multiInstanceType}, " +
            "assignees = #{assignees}, approval_levels = #{approvalLevels}, status = #{status}, updated_at = NOW() " +
            "WHERE id = #{id}")
    int update(WorkflowProcess process);
}
