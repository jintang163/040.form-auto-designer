package com.formdesigner.service;

import com.formdesigner.entity.RecognitionTask;
import java.util.List;

public interface RecognitionTaskService {

    RecognitionTask getById(Long id);

    RecognitionTask getByTaskId(String taskId);

    List<RecognitionTask> listByStatus(String status);

    List<RecognitionTask> listAll();

    RecognitionTask create(RecognitionTask task);

    RecognitionTask update(RecognitionTask task);

    void deleteById(Long id);
}
