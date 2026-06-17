package com.formdesigner.service;

import com.formdesigner.dto.WorkflowActionDTO;
import com.formdesigner.dto.WorkflowDeployDTO;
import com.formdesigner.dto.WorkflowStartDTO;
import com.formdesigner.vo.WorkflowInstanceVO;
import com.formdesigner.vo.WorkflowProcessVO;

import java.util.List;
import java.util.Map;

public interface WorkflowService {

    WorkflowProcessVO deployProcess(WorkflowDeployDTO dto);

    WorkflowProcessVO getProcessByTemplateId(Long templateId);

    List<WorkflowProcessVO> listProcessesByTemplateId(Long templateId);

    WorkflowInstanceVO startProcess(WorkflowStartDTO dto);

    WorkflowInstanceVO approve(WorkflowActionDTO dto);

    WorkflowInstanceVO reject(WorkflowActionDTO dto);

    WorkflowInstanceVO getInstance(Long id);

    WorkflowInstanceVO getInstanceByFormDataId(Long formDataId);

    List<WorkflowInstanceVO> listInstancesByTemplateId(Long templateId);

    List<WorkflowInstanceVO> listMyPendingTasks(String assignee);

    List<WorkflowInstanceVO> listMySubmitted(String submitterId);

    Map<String, Object> getProcessVariables(Long instanceId);

    void syncFormVariables(Long formDataId, Map<String, Object> fieldValues);

    String generateBpmnXml(WorkflowDeployDTO dto);
}
