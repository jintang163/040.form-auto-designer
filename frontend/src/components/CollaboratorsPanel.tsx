import { Avatar, Tooltip, Tag, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { CollaborationCursor } from '@/types';

interface CollaboratorsPanelProps {
  onlineUsers: CollaborationCursor[];
  currentSessionId: string;
}

export default function CollaboratorsPanel({ onlineUsers, currentSessionId }: CollaboratorsPanelProps) {
  const otherUsers = onlineUsers.filter((u) => u.sessionId !== currentSessionId);
  const currentUser = onlineUsers.find((u) => u.sessionId === currentSessionId);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 12,
        border: '1px solid #f0f0f0',
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge status="processing" text="协作中" />
        <span style={{ color: '#666', fontSize: 12, marginLeft: 'auto' }}>
          {onlineUsers.length} 人在线
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: '#e6f7ff',
              borderRadius: 4,
            }}
          >
            <Avatar
              size="small"
              style={{ backgroundColor: currentUser.avatarColor }}
              icon={<UserOutlined />}
            />
            <span style={{ flex: 1, fontSize: 13 }}>
              {currentUser.userName}
              <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>
                我
              </Tag>
            </span>
            {currentUser.currentField && (
              <Tooltip title={`正在编辑: ${currentUser.fieldLabel || currentUser.currentField}`}>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {currentUser.fieldLabel || currentUser.currentField}
                </span>
              </Tooltip>
            )}
          </div>
        )}

        {otherUsers.map((user) => (
          <div
            key={user.sessionId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: '#fafafa',
              borderRadius: 4,
            }}
          >
            <Avatar
              size="small"
              style={{ backgroundColor: user.avatarColor }}
              icon={<UserOutlined />}
            />
            <span style={{ flex: 1, fontSize: 13 }}>{user.userName}</span>
            {user.currentField && (
              <Tooltip title={`正在编辑: ${user.fieldLabel || user.currentField}`}>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {user.fieldLabel || user.currentField}
                </span>
              </Tooltip>
            )}
          </div>
        ))}

        {otherUsers.length === 0 && !currentUser && (
          <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
            暂无其他协作者
          </div>
        )}
      </div>
    </div>
  );
}
