import { Avatar, Tooltip, Tag } from 'antd';
import { UserOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import type { CollaborationCursor, FieldLock } from '@/types';

interface CollaborationCursorProps {
  fieldName: string;
  fieldLabel?: string;
  cursors: CollaborationCursor[];
  currentSessionId: string;
  fieldLock?: FieldLock | null;
  showLabel?: boolean;
}

export default function CollaborationCursor({
  fieldName,
  fieldLabel,
  cursors,
  currentSessionId,
  fieldLock,
  showLabel = true,
}: CollaborationCursorProps) {
  const otherCursors = cursors.filter(
    (c) => c.sessionId !== currentSessionId && c.currentField === fieldName
  );

  const isLockedByOther = fieldLock && fieldLock.lockedBy !== currentSessionId;
  const isLockedByMe = fieldLock && fieldLock.lockedBy === currentSessionId;

  if (otherCursors.length === 0 && !fieldLock) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap',
      }}
    >
      {isLockedByOther && (
        <Tag
          color="orange"
          icon={<LockOutlined />}
          style={{
            margin: 0,
            padding: '2px 8px',
            fontSize: 11,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Avatar
              size={14}
              style={{
                backgroundColor: fieldLock.avatarColor,
                width: 14,
                height: 14,
                fontSize: 10,
              }}
              icon={<UserOutlined style={{ fontSize: 8 }} />}
            />
            {fieldLock.lockedByName} 正在编辑
          </span>
        </Tag>
      )}

      {isLockedByMe && (
        <Tag
          color="blue"
          icon={<EditOutlined />}
          style={{
            margin: 0,
            padding: '2px 8px',
            fontSize: 11,
          }}
        >
          你正在编辑
        </Tag>
      )}

      {otherCursors.map((cursor) => (
        <Tooltip
          key={cursor.sessionId}
          title={`${cursor.userName} 正在查看${showLabel ? `「${fieldLabel || fieldName}」` : ''}`}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: `${cursor.avatarColor}15`,
              borderRadius: 4,
              border: `1px solid ${cursor.avatarColor}40`,
              animation: 'pulse 2s infinite',
            }}
          >
            <Avatar
              size={16}
              style={{
                backgroundColor: cursor.avatarColor,
                width: 16,
                height: 16,
                fontSize: 10,
              }}
              icon={<UserOutlined style={{ fontSize: 9 }} />}
            />
            <span style={{ fontSize: 11, color: cursor.avatarColor }}>
              {cursor.userName}
            </span>
          </div>
        </Tooltip>
      ))}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
