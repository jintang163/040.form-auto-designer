import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenantStore } from '@/store/tenantStore';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setCurrentTenant, fetchTenants } = useTenantStore();

  const from = (location.state as any)?.from?.pathname || '/templates';

  const handleLogin = async (values: { userId: string; password: string }) => {
    setLoading(true);
    try {
      const response = await login(values.userId, values.password);

      await fetchTenants();

      if (response.tenants && response.tenants.length > 0) {
        const firstTenantId = response.tenants[0].tenantId;
        setCurrentTenant(firstTenantId);
      }

      message.success(`欢迎回来，${response.userName}！`);
      navigate(from, { replace: true });
    } catch (e: any) {
      message.error(e.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#1890ff',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <SafetyOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>
            表单自动设计器
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            多租户智能表单平台
          </Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          initialValues={{ remember: true }}
          size="large"
        >
          <Form.Item
            name="userId"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入账号"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44 }}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              演示账号：admin / admin123（超管）
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
