package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.WorkflowActionDTO;
import com.formdesigner.dto.WorkflowDeployDTO;
import com.formdesigner.dto.WorkflowStartDTO;
import com.formdesigner.service.WorkflowService;
import com.formdesigner.vo.WorkflowInstanceVO;
import com.formdesigner.vo.WorkflowProcessVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping("/deploy")
    public R<WorkflowProcessVO> deployProcess(@Valid @RequestBody WorkflowDeployDTO dto) {
        return R.ok(workflowService.deployProcess(dto));
    }

    @GetMapping("/process/template/{templateId}")
    public R<WorkflowProcessVO> getProcessByTemplateId(@PathVariable Long templateId) {
        return R.ok(workflowService.getProcessByTemplateId(templateId));
    }

    @GetMapping("/process/template/{templateId}/list")
    public R<List<WorkflowProcessVO>> listProcessesByTemplateId(@PathVariable Long templateId) {
        return R.ok(workflowService.listProcessesByTemplateId(templateId));
    }

    @PostMapping("/start")
    public R<WorkflowInstanceVO> startProcess(@Valid @RequestBody WorkflowStartDTO dto) {
        return R.ok(workflowService.startProcess(dto));
    }

    @PostMapping("/approve")
    public R<WorkflowInstanceVO> approve(@Valid @RequestBody WorkflowActionDTO dto) {
        return R.ok(workflowService.approve(dto));
    }

    @PostMapping("/reject")
    public R<WorkflowInstanceVO> reject(@Valid @RequestBody WorkflowActionDTO dto) {
        return R.ok(workflowService.reject(dto));
    }

    @GetMapping("/instance/{id}")
    public R<WorkflowInstanceVO> getInstance(@PathVariable Long id) {
        return R.ok(workflowService.getInstance(id));
    }

    @GetMapping("/instance/form-data/{formDataId}")
    public R<WorkflowInstanceVO> getInstanceByFormDataId(@PathVariable Long formDataId) {
        return R.ok(workflowService.getInstanceByFormDataId(formDataId));
    }

    @GetMapping("/instance/template/{templateId}")
    public R<List<WorkflowInstanceVO>> listInstancesByTemplateId(@PathVariable Long templateId) {
        return R.ok(workflowService.listInstancesByTemplateId(templateId));
    }

    @GetMapping("/my-pending")
    public R<List<WorkflowInstanceVO>> listMyPendingTasks(@RequestParam String assignee) {
        return R.ok(workflowService.listMyPendingTasks(assignee));
    }

    @GetMapping("/my-submitted")
    public R<List<WorkflowInstanceVO>> listMySubmitted(@RequestParam String submitterId) {
        return R.ok(workflowService.listMySubmitted(submitterId));
    }

    @GetMapping("/instance/{instanceId}/variables")
    public R<Map<String, Object>> getProcessVariables(@PathVariable Long instanceId) {
        return R.ok(workflowService.getProcessVariables(instanceId));
    }

    @PostMapping("/sync-variables")
    public R<Void> syncFormVariables(@RequestParam Long formDataId, @RequestBody Map<String, Object> fieldValues) {
        workflowService.syncFormVariables(formDataId, fieldValues);
        return R.ok();
    }

    @PostMapping("/generate-bpmn")
    public R<String> generateBpmnXml(@RequestBody WorkflowDeployDTO dto) {
        return R.ok(workflowService.generateBpmnXml(dto));
    }
}
