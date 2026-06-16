package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.RecognitionTask;
import com.formdesigner.mapper.RecognitionTaskMapper;
import com.formdesigner.service.RecognitionTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecognitionTaskServiceImpl implements RecognitionTaskService {

    private final RecognitionTaskMapper recognitionTaskMapper;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    @Override
    public RecognitionTask getById(Long id) {
        return recognitionTaskMapper.selectById(id, currentTenantId());
    }

    @Override
    public RecognitionTask getByTaskId(String taskId) {
        return recognitionTaskMapper.selectByTaskId(taskId, currentTenantId());
    }

    @Override
    public List<RecognitionTask> listByStatus(String status) {
        return recognitionTaskMapper.selectByStatus(status, currentTenantId());
    }

    @Override
    public List<RecognitionTask> listAll() {
        return recognitionTaskMapper.selectAll(currentTenantId());
    }

    @Override
    public RecognitionTask create(RecognitionTask task) {
        task.setTenantId(currentTenantId());
        recognitionTaskMapper.insert(task);
        return task;
    }

    @Override
    public RecognitionTask update(RecognitionTask task) {
        task.setTenantId(currentTenantId());
        recognitionTaskMapper.updateById(task);
        return recognitionTaskMapper.selectById(task.getId(), currentTenantId());
    }

    @Override
    public void deleteById(Long id) {
        recognitionTaskMapper.deleteById(id);
    }
}
