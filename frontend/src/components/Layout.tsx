import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Breadcrumb } from 'antd';
import {
  FileTextOutlined,
  DatabaseOutlined,
  HomeOutlined,
  BarChartOutlined,
  ApiOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import TenantSwitcher from './TenantSwitcher';

const { Sider, Header, Content } = AntLayout;

const menuItems = [
  {
    key: '/templates',
    icon: <FileTextOutlined />,
    label: '模板管理',
  },
  {
    key: '/form-data',
    icon: <DatabaseOutlined />,
    label: '数据填报',
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: '统计分析',
  },
  {
    key: '/webhook-rules',
    icon: <ApiOutlined />,
    label: '推送规则',
  },
  {
    key: '/tenants',
    icon: <TeamOutlined />,
    label: '租户管理',
  },
];

function buildBreadcrumb(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const nameMap: Record<string, string> = {
    templates: '模板管理',
    create: '新建模板',
    edit: '编辑模板',
    preview: '预览模板',
    'form-data': '数据填报',
    statistics: '统计分析',
    'webhook-rules': '推送规则',
    tenants: '租户管理',
  };
  const items = [{ title: <><HomeOutlined /><span>首页</span></> }];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    items.push({ title: nameMap[part] || part });
  }
  return items;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className="logo">
          {collapsed ? 'FD' : '表单设计器'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Breadcrumb items={buildBreadcrumb(location.pathname)} />
          <TenantSwitcher />
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
