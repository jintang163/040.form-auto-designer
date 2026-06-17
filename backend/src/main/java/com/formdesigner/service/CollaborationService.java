package com.formdesigner.service;

import com.formdesigner.vo.CollaborationCursorVO;
import com.formdesigner.vo.FieldLockVO;
import java.util.List;
import java.util.Map;

public interface CollaborationService {

    void joinSession(String shareCode, String sessionId, String userId, String userName, String avatarColor);

    void leaveSession(String shareCode, String sessionId);

    List<CollaborationCursorVO> getOnlineUsers(String shareCode);

    void updateCursor(String shareCode, String sessionId, String fieldName, String fieldLabel, Double scrollTop);

    boolean lockField(String shareCode, String fieldName, String sessionId, String userName, String avatarColor);

    boolean unlockField(String shareCode, String fieldName, String sessionId);

    Map<String, FieldLockVO> getFieldLocks(String shareCode);

    FieldLockVO getFieldLock(String shareCode, String fieldName);

    void updateFieldValue(String shareCode, String fieldName, Object value, String sessionId);

    Map<String, Object> getAllFieldValues(String shareCode);

    void heartbeat(String shareCode, String sessionId);
}
