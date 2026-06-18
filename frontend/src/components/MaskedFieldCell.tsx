import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, LockOutlined } from '@ant-design/icons';
import { formDataApi } from '@/services/api';
import type { FieldPermissionInfo } from '@/types';

interface MaskedFieldCellProps {
  formDataId: string;
  fieldName: string;
  value: string;
  permission?: FieldPermissionInfo;
  isSensitive?: boolean;
}

export default function MaskedFieldCell({
  formDataId,
  fieldName,
  value,
  permission,
  isSensitive,
}: MaskedFieldCellProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawValue, setRawValue] = useState<string | null>(null);

  const sensitive = isSensitive || permission?.isSensitive || value?.includes('*');
  const canViewRaw = permission?.canViewSensitive;

  const handleViewRaw = async () => {
    if (showRaw) {
      setShowRaw(false);
      return;
    }
    if (!canViewRaw) {
      message.warning('没有权限查看该敏感字段的原始值');
      return;
    }
    setLoading(true);
    try {
      const raw = await formDataApi.getFieldRawValue(formDataId, fieldName);
      setRawValue(raw);
      setShowRaw(true);
    } catch (e: any) {
      message.error(e.message || '获取原始值失败');
    } finally {
      setLoading(false);
    }
  };

  if (!sensitive) {
    return <span>{value}</span>;
  }

  const displayValue = showRaw && rawValue ? rawValue : value;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Tooltip title={canViewRaw ? '点击右侧按钮查看原文' : '敏感字段已脱敏，无权限查看原文'}>
        <span style={{ color: showRaw ? undefined : '#8c8c8c' }}>{displayValue}</span>
      </Tooltip>
      {canViewRaw && (
        <Button
          type="text"
          size="small"
          icon={showRaw ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          loading={loading}
          onClick={handleViewRaw}
          style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
        />
      )}
      {!canViewRaw && (
        <Tooltip title="无权限查看原文">
          <LockOutlined style={{ fontSize: 12, color: '#d9d9d9' }} />
        </Tooltip>
      )}
    </span>
  );
}
