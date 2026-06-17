package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.WorkflowActionDTO;
import com.formdesigner.dto.WorkflowDeployDTO;
import com.formdesigner.dto.WorkflowStartDTO;
import com.formdesigner.entity.WorkflowInstance;
import com.formdesigner.entity.WorkflowProcess;
import com.formdesigner.entity.WorkflowTask;
import com.formdesigner.mapper.WorkflowInstanceMapper;
import com.formdesigner.mapper.WorkflowProcessMapper;
import com.formdesigner.mapper.WorkflowTaskMapper;
import com.formdesigner.service.WorkflowService;
import com.formdesigner.service.FormDataService;
import com.formdesigner.vo.WorkflowInstanceVO;
import com.formdesigner.vo.WorkflowProcessVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.*;
import org.flowable.engine.repository.Deployment;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private final RepositoryService repositoryService;
    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final HistoryService historyService;
    private final WorkflowProcessMapper processMapper;
    private final WorkflowInstanceMapper instanceMapper;
    private final WorkflowTaskMapper taskMapper;
    private final FormDataService formDataService;
    private final ObjectMapper objectMapper;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    @Transactional
    public WorkflowProcessVO deployProcess(WorkflowDeployDTO dto) {
        String bpmnXml = dto.getBpmnXml();
        if (bpmnXml == null || bpmnXml.isEmpty()) {
            bpmnXml = generateBpmnXml(dto);
        }

        Deployment deployment = repositoryService.createDeployment()
                .addString(dto.getProcessKey() + ".bpmn20.xml", bpmnXml)
                .name(dto.getProcessName())
                .deploy();

        org.flowable.engine.repository.ProcessDefinition processDefinition = repositoryService
                .createProcessDefinitionQuery()
                .deploymentId(deployment.getId())
                .latestVersion()
                .singleResult();

        WorkflowProcess existing = processMapper.selectActiveByTemplateId(dto.getTemplateId(), currentTenantId());
        if (existing != null) {
            processMapper.updateStatus(existing.getId(), "INACTIVE");
        }

        WorkflowProcess process = new WorkflowProcess();
        process.setTemplateId(dto.getTemplateId());
        process.setProcessKey(dto.getProcessKey());
        process.setProcessName(dto.getProcessName());
        process.setProcessDefinitionId(processDefinition.getId());
        process.setBpmnXml(bpmnXml);
        process.setFormVariableMapping(dto.getFormVariableMapping());
        process.setMultiInstanceType(dto.getMultiInstanceType() != null ? dto.getMultiInstanceType() : 0);
        process.setAssignees(dto.getAssignees() != null ? String.join(",", dto.getAssignees()) : "");
        process.setApprovalLevels(dto.getApprovalLevels() != null ? dto.getApprovalLevels() : dto.getAssignees().size());
        process.setStatus("ACTIVE");
        process.setTenantId(currentTenantId());
        processMapper.insert(process);

        return toProcessVO(process);
    }

    @Override
    public WorkflowProcessVO getProcessByTemplateId(Long templateId) {
        WorkflowProcess process = processMapper.selectActiveByTemplateId(templateId, currentTenantId());
        return process != null ? toProcessVO(process) : null;
    }

    @Override
    public List<WorkflowProcessVO> listProcessesByTemplateId(Long templateId) {
        List<WorkflowProcess> processes = processMapper.selectByTemplateId(templateId, currentTenantId());
        return processes.stream().map(this::toProcessVO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WorkflowInstanceVO startProcess(WorkflowStartDTO dto) {
        WorkflowProcess process = processMapper.selectActiveByTemplateId(dto.getTemplateId(), currentTenantId());
        if (process == null) {
            throw new IllegalArgumentException("该模板未配置审批流程，请先部署流程定义");
        }

        Map<String, Object> variables = new HashMap<>();
        if (dto.getVariables() != null) {
            variables.putAll(dto.getVariables());
        }
        variables.put("formDataId", dto.getFormDataId());
        variables.put("templateId", dto.getTemplateId());
        variables.put("submitterId", dto.getSubmitterId());
        variables.put("initiator", dto.getSubmitterId());

        if (process.getAssignees() != null && !process.getAssignees().isEmpty()) {
            String[] assigneeArr = process.getAssignees().split(",");
            variables.put("assignees", Arrays.asList(assigneeArr));
            variables.put("assigneeList", Arrays.asList(assigneeArr));
        }

        if (process.getFormVariableMapping() != null && !process.getFormVariableMapping().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> mapping = objectMapper.readValue(process.getFormVariableMapping(), Map.class);
                for (Map.Entry<String, String> entry : mapping.entrySet()) {
                    String formField = entry.getKey();
                    String processVar = entry.getValue();
                    if (dto.getVariables() != null && dto.getVariables().containsKey(formField)) {
                        variables.put(processVar, dto.getVariables().get(formField));
                    }
                }
            } catch (Exception e) {
                log.warn("解析表单变量映射失败: {}", e.getMessage());
            }
        }

        ProcessInstance processInstance = runtimeService.startProcessInstanceByKey(
                process.getProcessKey(),
                String.valueOf(dto.getFormDataId()),
                variables
        );

        WorkflowInstance instance = new WorkflowInstance();
        instance.setFormDataId(dto.getFormDataId());
        instance.setTemplateId(dto.getTemplateId());
        instance.setProcessInstanceId(processInstance.getId());
        instance.setProcessDefinitionId(processInstance.getProcessDefinitionId());
        instance.setBusinessKey(String.valueOf(dto.getFormDataId()));
        instance.setStatus("RUNNING");
        instance.setSubmitterId(dto.getSubmitterId());
        instance.setCurrentLevel(1);
        instance.setTenantId(currentTenantId());

        List<Task> tasks = taskService.createTaskQuery()
                .processInstanceId(processInstance.getId())
                .list();
        if (!tasks.isEmpty()) {
            instance.setCurrentAssignee(tasks.get(0).getAssignee());
        }

        instanceMapper.insert(instance);

        for (Task task : tasks) {
            WorkflowTask wfTask = new WorkflowTask();
            wfTask.setWorkflowInstanceId(instance.getId());
            wfTask.setTaskId(task.getId());
            wfTask.setTaskName(task.getName());
            wfTask.setTaskDefinitionKey(task.getTaskDefinitionKey());
            wfTask.setAssignee(task.getAssignee());
            wfTask.setApprovalLevel(1);
            taskMapper.insert(wfTask);
        }

        try {
            formDataService.updateStatus(dto.getFormDataId(), "APPROVING");
        } catch (Exception e) {
            log.warn("更新表单数据状态为审批中失败: {}", e.getMessage());
        }

        log.info("流程已启动: processInstanceId={}, formDataId={}", processInstance.getId(), dto.getFormDataId());
        return toInstanceVO(instance);
    }

    @Override
    @Transactional
    public WorkflowInstanceVO approve(WorkflowActionDTO dto) {
        Task task = taskService.createTaskQuery().taskId(dto.getTaskId()).singleResult();
        if (task == null) {
            throw new IllegalArgumentException("任务不存在或已完成");
        }

        Map<String, Object> variables = new HashMap<>();
        variables.put("approved", true);
        variables.put("action", "APPROVE");
        if (dto.getOutcome() != null) {
            variables.put("outcome", dto.getOutcome());
        }

        if (dto.getComment() != null && !dto.getComment().isEmpty()) {
            taskService.addComment(dto.getTaskId(), task.getProcessInstanceId(), "APPROVE", dto.getComment());
        }

        WorkflowInstance instance = instanceMapper.selectByProcessInstanceId(task.getProcessInstanceId());
        if (instance != null && dto.getFormData() != null && !dto.getFormData().isEmpty()) {
            try {
                String fieldValuesJson = objectMapper.writeValueAsString(dto.getFormData());
                formDataService.updateFieldValues(instance.getFormDataId(), fieldValuesJson);

                syncFormVariables(instance.getFormDataId(), dto.getFormData());
                log.info("审批时更新表单数据和流程变量: formDataId={}", instance.getFormDataId());
            } catch (Exception e) {
                log.warn("审批时更新表单数据失败: {}", e.getMessage());
            }
        }

        taskService.complete(dto.getTaskId(), variables);

        taskMapper.updateAction(dto.getTaskId(), "APPROVE", dto.getComment());

        if (instance != null) {
            updateInstanceStatus(instance);
        }

        return instance != null ? toInstanceVO(instance) : null;
    }

    @Override
    @Transactional
    public WorkflowInstanceVO reject(WorkflowActionDTO dto) {
        Task task = taskService.createTaskQuery().taskId(dto.getTaskId()).singleResult();
        if (task == null) {
            throw new IllegalArgumentException("任务不存在或已完成");
        }

        Map<String, Object> variables = new HashMap<>();
        variables.put("approved", false);
        variables.put("action", "REJECT");

        if (dto.getComment() != null && !dto.getComment().isEmpty()) {
            taskService.addComment(dto.getTaskId(), task.getProcessInstanceId(), "REJECT", dto.getComment());
        }

        WorkflowInstance instance = instanceMapper.selectByProcessInstanceId(task.getProcessInstanceId());
        if (instance != null && dto.getFormData() != null && !dto.getFormData().isEmpty()) {
            try {
                String fieldValuesJson = objectMapper.writeValueAsString(dto.getFormData());
                formDataService.updateFieldValues(instance.getFormDataId(), fieldValuesJson);
                log.info("驳回时更新表单数据: formDataId={}", instance.getFormDataId());
            } catch (Exception e) {
                log.warn("驳回时更新表单数据失败: {}", e.getMessage());
            }
        }

        taskService.complete(dto.getTaskId(), variables);

        taskMapper.updateAction(dto.getTaskId(), "REJECT", dto.getComment());

        if (instance != null) {
            instance.setStatus("REJECTED");
            instance.setEndTime(LocalDateTime.now());
            instance.setOutcome("REJECTED");
            instanceMapper.update(instance);

            try {
                formDataService.updateStatus(instance.getFormDataId(), "REJECTED");
            } catch (Exception e) {
                log.warn("更新表单数据状态为驳回失败: {}", e.getMessage());
            }
        }

        return instance != null ? toInstanceVO(instance) : null;
    }

    @Override
    public WorkflowInstanceVO getInstance(Long id) {
        WorkflowInstance instance = instanceMapper.selectById(id, currentTenantId());
        return instance != null ? toInstanceVO(instance) : null;
    }

    @Override
    public WorkflowInstanceVO getInstanceByFormDataId(Long formDataId) {
        List<WorkflowInstance> instances = instanceMapper.selectByFormDataId(formDataId, currentTenantId());
        return instances.isEmpty() ? null : toInstanceVO(instances.get(0));
    }

    @Override
    public List<WorkflowInstanceVO> listInstancesByTemplateId(Long templateId) {
        List<WorkflowInstance> instances = instanceMapper.selectByTemplateId(templateId, currentTenantId());
        return instances.stream().map(this::toInstanceVO).collect(Collectors.toList());
    }

    @Override
    public List<WorkflowInstanceVO> listMyPendingTasks(String assignee) {
        List<WorkflowTask> pendingTasks = taskMapper.selectPendingByAssignee(assignee);
        List<WorkflowInstanceVO> result = new ArrayList<>();

        for (WorkflowTask wt : pendingTasks) {
            WorkflowInstance instance = instanceMapper.selectById(wt.getWorkflowInstanceId(), currentTenantId());
            if (instance != null && "RUNNING".equals(instance.getStatus())) {
                WorkflowInstanceVO vo = toInstanceVO(instance);
                result.add(vo);
            }
        }
        return result;
    }

    @Override
    public List<WorkflowInstanceVO> listMySubmitted(String submitterId) {
        List<WorkflowInstance> instances = instanceMapper.selectBySubmitterId(submitterId, currentTenantId());
        return instances.stream().map(this::toInstanceVO).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getProcessVariables(Long instanceId) {
        WorkflowInstance instance = instanceMapper.selectById(instanceId, currentTenantId());
        if (instance == null) return Collections.emptyMap();

        try {
            return runtimeService.getVariables(instance.getProcessInstanceId());
        } catch (Exception e) {
            try {
                return historyService.createHistoricVariableInstanceQuery()
                        .processInstanceId(instance.getProcessInstanceId())
                        .list()
                        .stream()
                        .collect(Collectors.toMap(
                                v -> v.getVariableName(),
                                v -> v.getValue(),
                                (a, b) -> b
                        ));
            } catch (Exception ex) {
                return Collections.emptyMap();
            }
        }
    }

    @Override
    public void syncFormVariables(Long formDataId, Map<String, Object> fieldValues) {
        List<WorkflowInstance> instances = instanceMapper.selectByFormDataId(formDataId, currentTenantId());
        for (WorkflowInstance instance : instances) {
            if (!"RUNNING".equals(instance.getStatus())) continue;

            WorkflowProcess process = processMapper.selectActiveByTemplateId(instance.getTemplateId(), currentTenantId());
            if (process == null || process.getFormVariableMapping() == null) continue;

            try {
                @SuppressWarnings("unchecked")
                Map<String, String> mapping = objectMapper.readValue(process.getFormVariableMapping(), Map.class);
                Map<String, Object> varsToUpdate = new HashMap<>();
                for (Map.Entry<String, String> entry : mapping.entrySet()) {
                    if (fieldValues.containsKey(entry.getKey())) {
                        varsToUpdate.put(entry.getValue(), fieldValues.get(entry.getKey()));
                    }
                }
                if (!varsToUpdate.isEmpty()) {
                    runtimeService.setVariables(instance.getProcessInstanceId(), varsToUpdate);
                    log.debug("同步流程变量: instanceId={}, vars={}", instance.getProcessInstanceId(), varsToUpdate.keySet());
                }
            } catch (Exception e) {
                log.warn("同步流程变量失败: {}", e.getMessage());
            }
        }
    }

    @Override
    public String generateBpmnXml(WorkflowDeployDTO dto) {
        String processKey = dto.getProcessKey();
        String processName = dto.getProcessName();
        List<String> assignees = dto.getAssignees() != null ? dto.getAssignees() : Collections.emptyList();
        int multiInstanceType = dto.getMultiInstanceType() != null ? dto.getMultiInstanceType() : 0;

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<definitions xmlns=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" " +
                "xmlns:flowable=\"http://flowable.org/bpmn\" targetNamespace=\"http://formdesigner.com/workflow\">\n");

        xml.append("  <process id=\"").append(processKey).append("\" name=\"").append(processName).append("\" isExecutable=\"true\">\n");
        xml.append("    <startEvent id=\"startEvent\" name=\"提交申请\">\n");
        xml.append("      <extensionElements>\n");
        xml.append("        <flowable:executionListener event=\"start\" class=\"com.formdesigner.workflow.StartEventListener\" />\n");
        xml.append("      </extensionElements>\n");
        xml.append("    </startEvent>\n");

        if (multiInstanceType == 2) {
            xml.append("    <sequenceFlow id=\"flow1\" sourceRef=\"startEvent\" targetRef=\"countersignTask\" />\n");
            xml.append("    <userTask id=\"countersignTask\" name=\"会签审批\">\n");
            xml.append("      <multiInstanceLoopCharacteristics isSequential=\"false\" " +
                    "flowable:collection=\"assigneeList\" flowable:elementVariable=\"assignee\">\n");
            xml.append("        <completionCondition>${nrOfCompletedInstances == nrOfInstances}</completionCondition>\n");
            xml.append("      </multiInstanceLoopCharacteristics>\n");
            xml.append("      <extensionElements>\n");
            xml.append("        <flowable:taskListener event=\"create\" " +
                    "class=\"com.formdesigner.workflow.AssigneeTaskListener\" />\n");
            xml.append("      </extensionElements>\n");
            xml.append("    </userTask>\n");
            xml.append("    <sequenceFlow id=\"flow2\" sourceRef=\"countersignTask\" targetRef=\"endApproved\" />\n");
        } else {
            String prevId = "startEvent";
            for (int i = 0; i < assignees.size(); i++) {
                String taskId = "approveTask" + (i + 1);
                String taskName = "第" + (i + 1) + "级审批";
                String flowId = "flow_to_" + taskId;
                String nextFlowId = "flow_from_" + taskId;

                xml.append("    <sequenceFlow id=\"").append(flowId).append("\" sourceRef=\"")
                        .append(prevId).append("\" targetRef=\"").append(taskId).append("\" />\n");

                xml.append("    <userTask id=\"").append(taskId).append("\" name=\"").append(taskName)
                        .append("\" flowable:assignee=\"").append(assignees.get(i)).append("\">\n");
                xml.append("      <extensionElements>\n");
                xml.append("        <flowable:taskListener event=\"create\" " +
                        "class=\"com.formdesigner.workflow.ApprovalTaskCreateListener\" />\n");
                xml.append("      </extensionElements>\n");
                xml.append("    </userTask>\n");

                if (i < assignees.size() - 1) {
                    String gatewayId = "gateway_approve_" + (i + 1);
                    xml.append("    <sequenceFlow id=\"").append(nextFlowId).append("\" sourceRef=\"")
                            .append(taskId).append("\" targetRef=\"").append(gatewayId).append("\" />\n");
                    xml.append("    <exclusiveGateway id=\"").append(gatewayId).append("\" name=\"审批结果\" />\n");
                    String nextTaskId = "approveTask" + (i + 2);
                    xml.append("    <sequenceFlow id=\"flow_approve_").append(i + 1)
                            .append("\" sourceRef=\"").append(gatewayId).append("\" targetRef=\"")
                            .append(nextTaskId).append("\">\n");
                    xml.append("      <conditionExpression>${approved}</conditionExpression>\n");
                    xml.append("    </sequenceFlow>\n");
                    xml.append("    <sequenceFlow id=\"flow_reject_").append(i + 1)
                            .append("\" sourceRef=\"").append(gatewayId).append("\" targetRef=\"endRejected\">\n");
                    xml.append("      <conditionExpression>${!approved}</conditionExpression>\n");
                    xml.append("    </sequenceFlow>\n");
                    prevId = gatewayId;
                } else {
                    xml.append("    <sequenceFlow id=\"").append(nextFlowId).append("\" sourceRef=\"")
                            .append(taskId).append("\" targetRef=\"approveGateway\" />\n");
                }
            }

            xml.append("    <exclusiveGateway id=\"approveGateway\" name=\"最终审批结果\" />\n");
            xml.append("    <sequenceFlow id=\"flow_final_approve\" sourceRef=\"approveGateway\" targetRef=\"endApproved\">\n");
            xml.append("      <conditionExpression>${approved}</conditionExpression>\n");
            xml.append("    </sequenceFlow>\n");
            xml.append("    <sequenceFlow id=\"flow_final_reject\" sourceRef=\"approveGateway\" targetRef=\"endRejected\">\n");
            xml.append("      <conditionExpression>${!approved}</conditionExpression>\n");
            xml.append("    </sequenceFlow>\n");
        }

        xml.append("    <endEvent id=\"endApproved\" name=\"审批通过\" />\n");
        xml.append("    <endEvent id=\"endRejected\" name=\"审批驳回\" />\n");

        xml.append("  </process>\n");
        xml.append("</definitions>");

        return xml.toString();
    }

    private void updateInstanceStatus(WorkflowInstance instance) {
        List<Task> remainingTasks = taskService.createTaskQuery()
                .processInstanceId(instance.getProcessInstanceId())
                .list();

        if (remainingTasks.isEmpty()) {
            boolean approved = true;
            try {
                Object approvedVar = runtimeService.getVariable(instance.getProcessInstanceId(), "approved");
                if (approvedVar != null) {
                    approved = Boolean.TRUE.equals(approvedVar);
                }
            } catch (Exception e) {
                approved = true;
            }

            instance.setStatus(approved ? "APPROVED" : "REJECTED");
            instance.setEndTime(LocalDateTime.now());
            instance.setOutcome(approved ? "APPROVED" : "REJECTED");

            try {
                formDataService.updateStatus(instance.getFormDataId(), approved ? "APPROVED" : "REJECTED");
                log.info("表单数据状态已更新: formDataId={}, status={}", instance.getFormDataId(),
                        approved ? "APPROVED" : "REJECTED");
            } catch (Exception e) {
                log.warn("更新表单数据状态失败: {}", e.getMessage());
            }
        } else {
            Task currentTask = remainingTasks.get(0);
            instance.setCurrentAssignee(currentTask.getAssignee());

            List<WorkflowTask> completedTasks = taskMapper.selectByWorkflowInstanceId(instance.getId());
            int level = (int) completedTasks.stream().filter(t -> t.getAction() != null).count() + 1;
            instance.setCurrentLevel(level);

            for (Task task : remainingTasks) {
                WorkflowTask existingTask = taskMapper.selectByTaskId(task.getId());
                if (existingTask == null) {
                    WorkflowTask wfTask = new WorkflowTask();
                    wfTask.setWorkflowInstanceId(instance.getId());
                    wfTask.setTaskId(task.getId());
                    wfTask.setTaskName(task.getName());
                    wfTask.setTaskDefinitionKey(task.getTaskDefinitionKey());
                    wfTask.setAssignee(task.getAssignee());
                    wfTask.setApprovalLevel(level);
                    taskMapper.insert(wfTask);
                }
            }
        }

        instanceMapper.update(instance);
    }

    private WorkflowProcessVO toProcessVO(WorkflowProcess process) {
        WorkflowProcessVO vo = new WorkflowProcessVO();
        vo.setId(process.getId());
        vo.setTemplateId(process.getTemplateId());
        vo.setProcessKey(process.getProcessKey());
        vo.setProcessName(process.getProcessName());
        vo.setProcessDefinitionId(process.getProcessDefinitionId());
        vo.setFormVariableMapping(process.getFormVariableMapping());
        vo.setMultiInstanceType(process.getMultiInstanceType());
        vo.setApprovalLevels(process.getApprovalLevels());
        vo.setStatus(process.getStatus());
        vo.setCreatedAt(process.getCreatedAt());

        if (process.getAssignees() != null && !process.getAssignees().isEmpty()) {
            vo.setAssignees(Arrays.asList(process.getAssignees().split(",")));
        } else {
            vo.setAssignees(Collections.emptyList());
        }
        return vo;
    }

    private WorkflowInstanceVO toInstanceVO(WorkflowInstance instance) {
        WorkflowInstanceVO vo = new WorkflowInstanceVO();
        vo.setId(instance.getId());
        vo.setFormDataId(instance.getFormDataId());
        vo.setTemplateId(instance.getTemplateId());
        vo.setProcessInstanceId(instance.getProcessInstanceId());
        vo.setStatus(instance.getStatus());
        vo.setSubmitterId(instance.getSubmitterId());
        vo.setCurrentAssignee(instance.getCurrentAssignee());
        vo.setCurrentLevel(instance.getCurrentLevel());
        vo.setStartTime(instance.getStartTime());
        vo.setEndTime(instance.getEndTime());
        vo.setOutcome(instance.getOutcome());

        List<WorkflowTask> tasks = taskMapper.selectByWorkflowInstanceId(instance.getId());
        List<WorkflowInstanceVO.TaskVO> taskVOs = new ArrayList<>();
        for (WorkflowTask t : tasks) {
            WorkflowInstanceVO.TaskVO tvo = new WorkflowInstanceVO.TaskVO();
            tvo.setTaskId(t.getTaskId());
            tvo.setTaskName(t.getTaskName());
            tvo.setAssignee(t.getAssignee());
            tvo.setAction(t.getAction());
            tvo.setComment(t.getComment());
            tvo.setApprovalLevel(t.getApprovalLevel());
            tvo.setClaimedAt(t.getClaimedAt());
            tvo.setCompletedAt(t.getCompletedAt());
            taskVOs.add(tvo);
        }
        vo.setTasks(taskVOs);

        try {
            Map<String, Object> vars = getProcessVariables(instance.getId());
            vo.setProcessVariables(vars);
        } catch (Exception e) {
            vo.setProcessVariables(Collections.emptyMap());
        }

        return vo;
    }
}
