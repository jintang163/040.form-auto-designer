import { useEffect, useState } from 'react';
import { Select, Tag, Space, Dropdown, Typography, Divider } from 'antd';
import {
  SwapOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTenantStore } from '@/store/tenantStore';

const { Text } = Typography;

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
  const navigate = useNavigate();
  const {
    tenants,
    currentTenantId,
    currentTenant,
    userRole,
    userName,
    userId,
    fetchTenants,
    setCurrentTenant,
    logout,
    isLoggedIn,
  } = useTenantStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn() && tenants.length === 0) {
      fetchTenants();
    }
  }, [isLoggedIn]);

  const handleChange = (value: number) => {
    setCurrentTenant(value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleTagColor = userRole === 'SUPER_ADMIN' ? 'red' : userRole === 'TENANT_ADMIN' ? 'orange' : 'blue';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>{userName || userId}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{userId}</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'role',
      icon: roleIconMap[userRole],
      label: <span>角色：{roleLabelMap[userRole] || userRole}</span>,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span style={{ color: '#f5222d' }}>退出登录</span>,
      onClick: handleLogout,
    },
  ];

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
        <Text type="secondary" style={{ fontSize: 12 }}>
          {currentTenant.tenantCode}
        </Text>
      )}
      <Dropdown
        menu={{ items: userMenuItems }}
        placement="bottomRight"
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        trigger={['click']}
      >
        <Tag icon={roleIconMap[userRole]} color={roleTagColor} style={{ margin: 0, cursor: 'pointer' }}>
          <Space size={4}>
            <span>{userName || userId}</span>
          </Space>
        </Tag>
      </Dropdown>
    </Space>
  );
}
