package com.formdesigner.workflow;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AssigneeTaskListener implements TaskListener {

    @Override
    public void notify(DelegateTask delegateTask) {
        String assignee = delegateTask.getVariable("assignee") != null
                ? delegateTask.getVariable("assignee").toString()
                : delegateTask.getAssignee();

        if (assignee != null && !assignee.isEmpty()) {
            delegateTask.setAssignee(assignee);
            log.debug("会签任务分配给: {}", assignee);
        }

        String eventType = delegateTask.getEventName();
        if ("complete".equals(eventType)) {
            Boolean approved = delegateTask.getVariable("approved") != null
                    ? (Boolean) delegateTask.getVariable("approved")
                    : true;
            log.debug("会签任务完成: assignee={}, approved={}", assignee, approved);
        }
    }
}
