import { useState, useEffect, useRef, useCallback } from 'react';
import type { CollaborationCursor, FieldLock, CollaborationMessage } from '@/types';

const AVATAR_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
  '#2f54eb', '#a0d911', '#fa541c', '#eb2f96',
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

interface UseCollaborationOptions {
  shareCode: string;
  userId: string;
  userName: string;
  onFieldValueChange?: (fieldName: string, value: any, fromSessionId: string) => void;
}

export function useCollaboration({ shareCode, userId, userName, onFieldValueChange }: UseCollaborationOptions) {
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<CollaborationCursor[]>([]);
  const [fieldLocks, setFieldLocks] = useState<Record<string, FieldLock>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const stompClientRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const avatarColorRef = useRef<string>(getRandomColor());
  const heartbeatTimerRef = useRef<number | null>(null);

  const sessionId = sessionIdRef.current;
  const avatarColor = avatarColorRef.current;

  const connect = useCallback(() => {
    if (stompClientRef.current?.connected) return;

    const socket = new SockJS('/ws/collaboration');
    const client = (window as any).Stomp?.over(socket);
    
    if (!client) {
      console.warn('STOMP客户端未加载');
      return;
    }

    client.connect(
      {},
      () => {
        setConnected(true);
        console.log('协作WebSocket已连接, sessionId:', sessionId);

        client.subscribe(`/topic/collab/${shareCode}/users`, (message: any) => {
          try {
            const users = JSON.parse(message.body);
            setOnlineUsers(users || []);
          } catch (e) {
            console.error('解析在线用户消息失败:', e);
          }
        });

        client.subscribe(`/topic/collab/${shareCode}/cursors`, (message: any) => {
          try {
            const users = JSON.parse(message.body);
            setOnlineUsers(users || []);
          } catch (e) {
            console.error('解析光标消息失败:', e);
          }
        });

        client.subscribe(`/topic/collab/${shareCode}/locks`, (message: any) => {
          try {
            const locks = JSON.parse(message.body);
            setFieldLocks(locks || {});
          } catch (e) {
            console.error('解析锁消息失败:', e);
          }
        });

        client.subscribe(`/topic/collab/${shareCode}/field-values`, (message: any) => {
          try {
            const values = JSON.parse(message.body);
            setFieldValues(values || {});
          } catch (e) {
            console.error('解析字段值消息失败:', e);
          }
        });

        client.subscribe(`/topic/collab/${shareCode}/sync`, (message: any) => {
          try {
            const data = JSON.parse(message.body);
            if (data.users) setOnlineUsers(data.users);
            if (data.locks) setFieldLocks(data.locks);
            if (data.fieldValues) setFieldValues(data.fieldValues);
          } catch (e) {
            console.error('解析同步消息失败:', e);
          }
        });

        sendJoin();
        startHeartbeat();
      },
      (error: any) => {
        console.error('协作WebSocket连接失败:', error);
        setConnected(false);
      }
    );

    stompClientRef.current = client;
  }, [shareCode, sessionId]);

  const disconnect = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (stompClientRef.current?.connected) {
      sendLeave();
      stompClientRef.current.disconnect();
    }
    stompClientRef.current = null;
    setConnected(false);
  }, [shareCode, sessionId]);

  const sendMessage = useCallback((destination: string, body: Partial<CollaborationMessage>) => {
    if (!stompClientRef.current?.connected) return;

    const message: CollaborationMessage = {
      type: body.type || '',
      shareCode,
      sessionId,
      userId,
      userName,
      avatarColor,
      ...body,
      timestamp: Date.now(),
    };

    stompClientRef.current.send(destination, {}, JSON.stringify(message));
  }, [shareCode, sessionId, userId, userName, avatarColor]);

  const sendJoin = useCallback(() => {
    sendMessage(`/app/collab/${shareCode}/join`, { type: 'join' });
  }, [sendMessage, shareCode]);

  const sendLeave = useCallback(() => {
    sendMessage(`/app/collab/${shareCode}/leave`, { type: 'leave' });
  }, [sendMessage, shareCode]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) return;
    heartbeatTimerRef.current = window.setInterval(() => {
      sendMessage(`/app/collab/${shareCode}/heartbeat`, { type: 'heartbeat' });
    }, 30000);
  }, [sendMessage, shareCode]);

  const updateCursor = useCallback((fieldName: string, fieldLabel?: string, scrollTop?: number) => {
    sendMessage(`/app/collab/${shareCode}/cursor`, {
      type: 'cursor',
      fieldName,
      fieldLabel,
      scrollTop,
    });
  }, [sendMessage, shareCode]);

  const lockField = useCallback((fieldName: string, fieldLabel?: string) => {
    sendMessage(`/app/collab/${shareCode}/lock`, {
      type: 'lock',
      fieldName,
      fieldLabel,
    });
  }, [sendMessage, shareCode]);

  const unlockField = useCallback((fieldName: string) => {
    sendMessage(`/app/collab/${shareCode}/unlock`, {
      type: 'unlock',
      fieldName,
    });
  }, [sendMessage, shareCode]);

  const updateFieldValue = useCallback((fieldName: string, value: any) => {
    sendMessage(`/app/collab/${shareCode}/field-value`, {
      type: 'field-value',
      fieldName,
      fieldValue: value,
    });
  }, [sendMessage, shareCode]);

  const requestSync = useCallback(() => {
    sendMessage(`/app/collab/${shareCode}/sync-request`, {
      type: 'sync-request',
    });
  }, [sendMessage, shareCode]);

  const isFieldLocked = useCallback((fieldName: string): boolean => {
    const lock = fieldLocks[fieldName];
    if (!lock) return false;
    return lock.lockedBy !== sessionId;
  }, [fieldLocks, sessionId]);

  const getFieldLockInfo = useCallback((fieldName: string): FieldLock | null => {
    return fieldLocks[fieldName] || null;
  }, [fieldLocks]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    onlineUsers,
    fieldLocks,
    fieldValues,
    sessionId,
    avatarColor,
    connect,
    disconnect,
    updateCursor,
    lockField,
    unlockField,
    updateFieldValue,
    requestSync,
    isFieldLocked,
    getFieldLockInfo,
  };
}

export { AVATAR_COLORS, getRandomColor };
