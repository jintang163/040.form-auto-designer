package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FormShareDTO;
import com.formdesigner.service.CollaborationService;
import com.formdesigner.service.FormShareService;
import com.formdesigner.vo.CollaborationCursorVO;
import com.formdesigner.vo.FieldLockVO;
import com.formdesigner.vo.FormShareVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/form-share")
@RequiredArgsConstructor
public class FormShareController {

    private final FormShareService formShareService;
    private final CollaborationService collaborationService;

    @PostMapping
    public R<FormShareVO> createShare(@Valid @RequestBody FormShareDTO dto) {
        return R.ok(formShareService.createShare(dto));
    }

    @GetMapping("/{shareCode}")
    public R<FormShareVO> getShare(@PathVariable String shareCode) {
        return R.ok(formShareService.getShareByCode(shareCode));
    }

    @PostMapping("/{shareCode}/validate")
    public R<Boolean> validateShare(
            @PathVariable String shareCode,
            @RequestBody(required = false) Map<String, String> body) {
        String password = body != null ? body.get("password") : null;
        return R.ok(formShareService.validateShare(shareCode, password));
    }

    @PostMapping("/{shareCode}/revoke")
    public R<Void> revokeShare(@PathVariable String shareCode) {
        formShareService.revokeShare(shareCode);
        return R.ok();
    }

    @PostMapping("/{shareCode}/refresh")
    public R<FormShareVO> refreshShareCode(@PathVariable String shareCode) {
        return R.ok(formShareService.refreshShareCode(shareCode));
    }

    @GetMapping("/template/{templateId}")
    public R<List<FormShareVO>> listShares(@PathVariable Long templateId) {
        return R.ok(formShareService.listSharesByTemplateId(templateId));
    }

    @GetMapping("/{shareCode}/online-users")
    public R<List<CollaborationCursorVO>> getOnlineUsers(@PathVariable String shareCode) {
        return R.ok(collaborationService.getOnlineUsers(shareCode));
    }

    @GetMapping("/{shareCode}/field-locks")
    public R<Map<String, FieldLockVO>> getFieldLocks(@PathVariable String shareCode) {
        return R.ok(collaborationService.getFieldLocks(shareCode));
    }

    @GetMapping("/{shareCode}/field-values")
    public R<Map<String, Object>> getFieldValues(@PathVariable String shareCode) {
        return R.ok(collaborationService.getAllFieldValues(shareCode));
    }
}
