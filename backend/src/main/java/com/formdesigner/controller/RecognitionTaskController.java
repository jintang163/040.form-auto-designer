package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.entity.RecognitionTask;
import com.formdesigner.service.RecognitionTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recognition-tasks")
@RequiredArgsConstructor
public class RecognitionTaskController {

    private final RecognitionTaskService recognitionTaskService;

    @GetMapping("/{id}")
    public R<RecognitionTask> getById(@PathVariable Long id) {
        return R.ok(recognitionTaskService.getById(id));
    }

    @GetMapping("/task/{taskId}")
    public R<RecognitionTask> getByTaskId(@PathVariable String taskId) {
        return R.ok(recognitionTaskService.getByTaskId(taskId));
    }

    @GetMapping("/status/{status}")
    public R<List<RecognitionTask>> listByStatus(@PathVariable String status) {
        return R.ok(recognitionTaskService.listByStatus(status));
    }

    @GetMapping
    public R<List<RecognitionTask>> listAll() {
        return R.ok(recognitionTaskService.listAll());
    }

    @PostMapping
    public R<RecognitionTask> create(@RequestBody RecognitionTask task) {
        return R.ok(recognitionTaskService.create(task));
    }

    @PutMapping
    public R<RecognitionTask> update(@RequestBody RecognitionTask task) {
        return R.ok(recognitionTaskService.update(task));
    }

    @DeleteMapping("/{id}")
    public R<Void> deleteById(@PathVariable Long id) {
        recognitionTaskService.deleteById(id);
        return R.ok();
    }
}
