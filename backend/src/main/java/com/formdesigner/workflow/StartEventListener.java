package com.formdesigner.workflow;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.ExecutionListener;
import org.flowable.engine.delegate.DelegateExecution;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class StartEventListener implements ExecutionListener {

    @Override
    public void notify(DelegateExecution execution) {
        String processInstanceId = execution.getProcessInstanceId();
        String businessKey = execution.getBusinessKey();

        log.debug("流程启动事件触发: processInstanceId={}, businessKey={}",
                processInstanceId, businessKey);

        String eventName = execution.getEventName();
        if ("start".equals(eventName)) {
            log.info("流程实例已启动: processInstanceId={}, 流程定义ID={}",
                    processInstanceId, execution.getProcessDefinitionId());
        }
    }
}
