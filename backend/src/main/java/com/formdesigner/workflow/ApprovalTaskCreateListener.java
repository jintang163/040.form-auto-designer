package com.formdesigner.workflow;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ApprovalTaskCreateListener implements TaskListener {

    @Override
    public void notify(DelegateTask delegateTask) {
        String eventName = delegateTask.getEventName();
        String taskId = delegateTask.getId();
        String taskName = delegateTask.getName();
        String assignee = delegateTask.getAssignee();
        String processInstanceId = delegateTask.getProcessInstanceId();

        if ("create".equals(eventName)) {
            log.info("审批任务已生成: taskId={}, taskName={}, assignee={}, processInstanceId={}",
                    taskId, taskName, assignee, processInstanceId);
        }
    }
}
