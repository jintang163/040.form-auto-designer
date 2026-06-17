package com.formdesigner.mapper;

import com.formdesigner.entity.WorkflowTask;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface WorkflowTaskMapper {

    @Insert("INSERT INTO workflow_task (workflow_instance_id, task_id, task_name, task_definition_key, " +
            "assignee, action, comment, approval_level, claimed_at, completed_at, created_at) " +
            "VALUES (#{workflowInstanceId}, #{taskId}, #{taskName}, #{taskDefinitionKey}, " +
            "#{assignee}, #{action}, #{comment}, #{approvalLevel}, #{claimedAt}, #{completedAt}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(WorkflowTask task);

    @Select("SELECT * FROM workflow_task WHERE workflow_instance_id = #{workflowInstanceId} ORDER BY created_at")
    List<WorkflowTask> selectByWorkflowInstanceId(@Param("workflowInstanceId") Long workflowInstanceId);

    @Select("SELECT * FROM workflow_task WHERE task_id = #{taskId}")
    WorkflowTask selectByTaskId(@Param("taskId") String taskId);

    @Select("SELECT * FROM workflow_task WHERE assignee = #{assignee} AND action IS NULL ORDER BY created_at DESC")
    List<WorkflowTask> selectPendingByAssignee(@Param("assignee") String assignee);

    @Update("UPDATE workflow_task SET action = #{action}, comment = #{comment}, completed_at = NOW() " +
            "WHERE task_id = #{taskId}")
    int updateAction(@Param("taskId") String taskId, @Param("action") String action, @Param("comment") String comment);
}
