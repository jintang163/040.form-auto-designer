package com.formdesigner.controller;

import com.formdesigner.dto.CollaborationMessageDTO;
import com.formdesigner.service.CollaborationService;
import com.formdesigner.service.FormShareService;
import com.formdesigner.vo.CollaborationCursorVO;
import com.formdesigner.vo.FieldLockVO;
import com.formdesigner.vo.FormShareVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationWebSocketController {

    private final CollaborationService collaborationService;
    private final FormShareService formShareService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/collab/{shareCode}/join")
    @SendTo("/topic/collab/{shareCode}/users")
    public List<CollaborationCursorVO> join(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        FormShareVO share = formShareService.getShareByCode(shareCode);
        if (share == null) {
            throw new RuntimeException("分享链接无效或已过期");
        }

        collaborationService.joinSession(
                shareCode,
                message.getSessionId(),
                message.getUserId(),
                message.getUserName(),
                message.getAvatarColor()
        );

        log.info("用户加入协作, shareCode={}, sessionId={}, userName={}",
                shareCode, message.getSessionId(), message.getUserName());

        return collaborationService.getOnlineUsers(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/cursor")
    @SendTo("/topic/collab/{shareCode}/cursors")
    public List<CollaborationCursorVO> updateCursor(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        collaborationService.updateCursor(
                shareCode,
                message.getSessionId(),
                message.getFieldName(),
                message.getFieldLabel(),
                message.getScrollTop()
        );

        return collaborationService.getOnlineUsers(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/lock")
    @SendTo("/topic/collab/{shareCode}/locks")
    public Map<String, FieldLockVO> lockField(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        boolean success = collaborationService.lockField(
                shareCode,
                message.getFieldName(),
                message.getSessionId(),
                message.getUserName(),
                message.getAvatarColor()
        );

        if (!success) {
            FieldLockVO existingLock = collaborationService.getFieldLock(shareCode, message.getFieldName());
            if (existingLock != null) {
                log.warn("字段锁定失败, 已被其他用户锁定, shareCode={}, fieldName={}, lockedBy={}",
                        shareCode, message.getFieldName(), existingLock.getLockedByName());
            }
        }

        return collaborationService.getFieldLocks(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/unlock")
    @SendTo("/topic/collab/{shareCode}/locks")
    public Map<String, FieldLockVO> unlockField(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        collaborationService.unlockField(
                shareCode,
                message.getFieldName(),
                message.getSessionId()
        );

        return collaborationService.getFieldLocks(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/field-value")
    @SendTo("/topic/collab/{shareCode}/field-values")
    public Map<String, Object> updateFieldValue(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        collaborationService.updateFieldValue(
                shareCode,
                message.getFieldName(),
                message.getFieldValue(),
                message.getSessionId()
        );

        return collaborationService.getAllFieldValues(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/heartbeat")
    public void heartbeat(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        collaborationService.heartbeat(shareCode, message.getSessionId());
    }

    @MessageMapping("/collab/{shareCode}/leave")
    @SendTo("/topic/collab/{shareCode}/users")
    public List<CollaborationCursorVO> leave(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        collaborationService.leaveSession(shareCode, message.getSessionId());

        log.info("用户离开协作, shareCode={}, sessionId={}", shareCode, message.getSessionId());

        return collaborationService.getOnlineUsers(shareCode);
    }

    @MessageMapping("/collab/{shareCode}/sync-request")
    public void requestSync(
            @DestinationVariable String shareCode,
            CollaborationMessageDTO message) {

        Map<String, FieldLockVO> locks = collaborationService.getFieldLocks(shareCode);
        Map<String, Object> values = collaborationService.getAllFieldValues(shareCode);
        List<CollaborationCursorVO> users = collaborationService.getOnlineUsers(shareCode);

        messagingTemplate.convertAndSend(
                "/topic/collab/" + shareCode + "/sync",
                Map.of(
                        "users", users,
                        "locks", locks,
                        "fieldValues", values
                )
        );
    }
}
