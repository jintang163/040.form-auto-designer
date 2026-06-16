import { useEffect } from 'react';
import { Select, Tag, Space } from 'antd';
import {
  SwapOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTenantStore } from '@/store/tenantStore';

const roleIconMap: Record<string, React.ReactNode> = {
  SUPER_ADMIN: <CrownOutlined style={{ color: '#f5222d' }} />,
  TENANT_ADMIN: <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />,
  USER: <UserOutlined />,
};

const roleLabelMap: Record<string, string> = {
  SUPER_ADMIN: '超管',
  TENANT_ADMIN: '租户管理员',
  USER: '普通用户',
};

export default function TenantSwitcher() {
  const { tenants, currentTenantId, currentTenant, userRole, fetchTenants, setCurrentTenant, initializeTenant } =
    useTenantStore();

  useEffect(() => {
    initializeTenant();
  }, []);

  const handleChange = (value: number) => {
    setCurrentTenant(value);
  };

  const roleTagColor = userRole === 'SUPER_ADMIN' ? 'red' : userRole === 'TENANT_ADMIN' ? 'orange' : 'blue';

  return (
    <Space size="middle">
      <Select
        value={currentTenantId}
        onChange={handleChange}
        style={{ minWidth: 180 }}
        placeholder="选择租户"
        suffixIcon={<SwapOutlined />}
        options={tenants.map((t) => ({
          label: (
            <Space>
              <span>{t.tenantName}</span>
              {t.status !== 'ACTIVE' && (
                <Tag color="default" style={{ fontSize: 10, lineHeight: '16px' }}>
                  {t.status}
                </Tag>
              )}
            </Space>
          ),
          value: t.id,
          disabled: t.status !== 'ACTIVE',
        }))}
      />
      {currentTenant && (
        <Space size={4} style={{ fontSize: 12, color: '#888' }}>
          <span>{currentTenant.tenantCode}</span>
        </Space>
      )}
      <Tag icon={roleIconMap[userRole]} color={roleTagColor} style={{ margin: 0 }}>
        {roleLabelMap[userRole] || userRole}
      </Tag>
    </Space>
  );
}
