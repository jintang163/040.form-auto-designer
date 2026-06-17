package com.formdesigner.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formdesigner.service.CollaborationService;
import com.formdesigner.vo.CollaborationCursorVO;
import com.formdesigner.vo.FieldLockVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationServiceImpl implements CollaborationService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String KEY_PREFIX = "form:collab:";
    private static final String ONLINE_USERS_KEY = "online_users";
    private static final String FIELD_LOCKS_KEY = "field_locks";
    private static final String FIELD_VALUES_KEY = "field_values";
    private static final long SESSION_TIMEOUT = 60;
    private static final long LOCK_TIMEOUT = 30;

    private String getKey(String shareCode, String suffix) {
        return KEY_PREFIX + shareCode + ":" + suffix;
    }

    @Override
    public void joinSession(String shareCode, String sessionId, String userId, String userName, String avatarColor) {
        String key = getKey(shareCode, ONLINE_USERS_KEY);
        CollaborationCursorVO cursor = new CollaborationCursorVO();
        cursor.setSessionId(sessionId);
        cursor.setUserId(userId);
        cursor.setUserName(userName);
        cursor.setAvatarColor(avatarColor);
        cursor.setLastActive(LocalDateTime.now());

        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
            entries.put(sessionId, objectMapper.writeValueAsString(cursor));
            redisTemplate.opsForHash().putAll(key, entries);
            redisTemplate.expire(key, SESSION_TIMEOUT * 2, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("加入协作会话失败, shareCode={}, sessionId={}", shareCode, sessionId, e);
        }
        log.info("用户加入协作, shareCode={}, sessionId={}, userName={}", shareCode, sessionId, userName);
    }

    @Override
    public void leaveSession(String shareCode, String sessionId) {
        String key = getKey(shareCode, ONLINE_USERS_KEY);
        redisTemplate.opsForHash().delete(key, sessionId);
        unlockAllFieldsForSession(shareCode, sessionId);
        log.info("用户离开协作, shareCode={}, sessionId={}", shareCode, sessionId);
    }

    private void unlockAllFieldsForSession(String shareCode, String sessionId) {
        String locksKey = getKey(shareCode, FIELD_LOCKS_KEY);
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(locksKey);
            List<String> fieldsToUnlock = new ArrayList<>();
            for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                FieldLockVO lock = objectMapper.readValue((String) entry.getValue(), FieldLockVO.class);
                if (sessionId.equals(lock.getLockedBy())) {
                    fieldsToUnlock.add((String) entry.getKey());
                }
            }
            for (String field : fieldsToUnlock) {
                redisTemplate.opsForHash().delete(locksKey, field);
            }
        } catch (Exception e) {
            log.error("解锁用户所有字段失败, shareCode={}, sessionId={}", shareCode, sessionId, e);
        }
    }

    @Override
    public List<CollaborationCursorVO> getOnlineUsers(String shareCode) {
        String key = getKey(shareCode, ONLINE_USERS_KEY);
        List<CollaborationCursorVO> users = new ArrayList<>();
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
            LocalDateTime now = LocalDateTime.now();
            List<String> expiredSessions = new ArrayList<>();

            for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                CollaborationCursorVO cursor = objectMapper.readValue((String) entry.getValue(), CollaborationCursorVO.class);
                if (cursor.getLastActive() != null &&
                        cursor.getLastActive().plusSeconds(SESSION_TIMEOUT).isBefore(now)) {
                    expiredSessions.add((String) entry.getKey());
                } else {
                    users.add(cursor);
                }
            }

            for (String sessionId : expiredSessions) {
                redisTemplate.opsForHash().delete(key, sessionId);
                unlockAllFieldsForSession(shareCode, sessionId);
            }
        } catch (Exception e) {
            log.error("获取在线用户失败, shareCode={}", shareCode, e);
        }
        return users;
    }

    @Override
    public void updateCursor(String shareCode, String sessionId, String fieldName, String fieldLabel, Double scrollTop) {
        String key = getKey(shareCode, ONLINE_USERS_KEY);
        try {
            String cursorStr = (String) redisTemplate.opsForHash().get(key, sessionId);
            if (cursorStr != null) {
                CollaborationCursorVO cursor = objectMapper.readValue(cursorStr, CollaborationCursorVO.class);
                cursor.setCurrentField(fieldName);
                cursor.setFieldLabel(fieldLabel);
                cursor.setScrollTop(scrollTop);
                cursor.setLastActive(LocalDateTime.now());
                redisTemplate.opsForHash().put(key, sessionId, objectMapper.writeValueAsString(cursor));
            }
        } catch (Exception e) {
            log.error("更新光标位置失败, shareCode={}, sessionId={}", shareCode, sessionId, e);
        }
    }

    @Override
    public boolean lockField(String shareCode, String fieldName, String sessionId, String userName, String avatarColor) {
        String locksKey = getKey(shareCode, FIELD_LOCKS_KEY);
        try {
            String existingLockStr = (String) redisTemplate.opsForHash().get(locksKey, fieldName);
            if (existingLockStr != null) {
                FieldLockVO existingLock = objectMapper.readValue(existingLockStr, FieldLockVO.class);
                if (existingLock.getExpireAt() != null &&
                        existingLock.getExpireAt().isBefore(LocalDateTime.now())) {
                    redisTemplate.opsForHash().delete(locksKey, fieldName);
                } else if (!sessionId.equals(existingLock.getLockedBy())) {
                    return false;
                }
            }

            FieldLockVO lock = new FieldLockVO();
            lock.setFieldName(fieldName);
            lock.setLockedBy(sessionId);
            lock.setLockedByName(userName);
            lock.setAvatarColor(avatarColor);
            lock.setLockedAt(LocalDateTime.now());
            lock.setExpireAt(LocalDateTime.now().plusSeconds(LOCK_TIMEOUT));

            redisTemplate.opsForHash().put(locksKey, fieldName, objectMapper.writeValueAsString(lock));
            return true;
        } catch (Exception e) {
            log.error("锁定字段失败, shareCode={}, fieldName={}, sessionId={}", shareCode, fieldName, sessionId, e);
            return false;
        }
    }

    @Override
    public boolean unlockField(String shareCode, String fieldName, String sessionId) {
        String locksKey = getKey(shareCode, FIELD_LOCKS_KEY);
        try {
            String lockStr = (String) redisTemplate.opsForHash().get(locksKey, fieldName);
            if (lockStr == null) {
                return true;
            }
            FieldLockVO lock = objectMapper.readValue(lockStr, FieldLockVO.class);
            if (sessionId.equals(lock.getLockedBy())) {
                redisTemplate.opsForHash().delete(locksKey, fieldName);
                return true;
            }
            return false;
        } catch (Exception e) {
            log.error("解锁字段失败, shareCode={}, fieldName={}, sessionId={}", shareCode, fieldName, sessionId, e);
            return false;
        }
    }

    @Override
    public Map<String, FieldLockVO> getFieldLocks(String shareCode) {
        String locksKey = getKey(shareCode, FIELD_LOCKS_KEY);
        Map<String, FieldLockVO> locks = new HashMap<>();
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(locksKey);
            LocalDateTime now = LocalDateTime.now();
            List<String> expiredFields = new ArrayList<>();

            for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                FieldLockVO lock = objectMapper.readValue((String) entry.getValue(), FieldLockVO.class);
                if (lock.getExpireAt() != null && lock.getExpireAt().isBefore(now)) {
                    expiredFields.add((String) entry.getKey());
                } else {
                    locks.put((String) entry.getKey(), lock);
                }
            }

            for (String field : expiredFields) {
                redisTemplate.opsForHash().delete(locksKey, field);
            }
        } catch (Exception e) {
            log.error("获取字段锁失败, shareCode={}", shareCode, e);
        }
        return locks;
    }

    @Override
    public FieldLockVO getFieldLock(String shareCode, String fieldName) {
        String locksKey = getKey(shareCode, FIELD_LOCKS_KEY);
        try {
            String lockStr = (String) redisTemplate.opsForHash().get(locksKey, fieldName);
            if (lockStr == null) {
                return null;
            }
            FieldLockVO lock = objectMapper.readValue(lockStr, FieldLockVO.class);
            if (lock.getExpireAt() != null && lock.getExpireAt().isBefore(LocalDateTime.now())) {
                redisTemplate.opsForHash().delete(locksKey, fieldName);
                return null;
            }
            return lock;
        } catch (Exception e) {
            log.error("获取字段锁失败, shareCode={}, fieldName={}", shareCode, fieldName, e);
            return null;
        }
    }

    @Override
    public void updateFieldValue(String shareCode, String fieldName, Object value, String sessionId) {
        String valuesKey = getKey(shareCode, FIELD_VALUES_KEY);
        try {
            String valueStr = value != null ? objectMapper.writeValueAsString(value) : null;
            if (valueStr != null) {
                redisTemplate.opsForHash().put(valuesKey, fieldName, valueStr);
            } else {
                redisTemplate.opsForHash().delete(valuesKey, fieldName);
            }
        } catch (Exception e) {
            log.error("更新字段值失败, shareCode={}, fieldName={}", shareCode, fieldName, e);
        }
    }

    @Override
    public Map<String, Object> getAllFieldValues(String shareCode) {
        String valuesKey = getKey(shareCode, FIELD_VALUES_KEY);
        Map<String, Object> values = new HashMap<>();
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(valuesKey);
            for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                try {
                    Object value = objectMapper.readValue((String) entry.getValue(), Object.class);
                    values.put((String) entry.getKey(), value);
                } catch (Exception e) {
                    values.put((String) entry.getKey(), entry.getValue());
                }
            }
        } catch (Exception e) {
            log.error("获取所有字段值失败, shareCode={}", shareCode, e);
        }
        return values;
    }

    @Override
    public void heartbeat(String shareCode, String sessionId) {
        String key = getKey(shareCode, ONLINE_USERS_KEY);
        try {
            String cursorStr = (String) redisTemplate.opsForHash().get(key, sessionId);
            if (cursorStr != null) {
                CollaborationCursorVO cursor = objectMapper.readValue(cursorStr, CollaborationCursorVO.class);
                cursor.setLastActive(LocalDateTime.now());
                redisTemplate.opsForHash().put(key, sessionId, objectMapper.writeValueAsString(cursor));
            }
        } catch (Exception e) {
            log.error("心跳更新失败, shareCode={}, sessionId={}", shareCode, sessionId, e);
        }
    }
}
