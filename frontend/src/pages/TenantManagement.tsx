import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Tabs,
  InputNumber,
  Descriptions,
  Card,
  Progress,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { tenantApi } from '@/services/api';
import { useTenantStore } from '@/store/tenantStore';
import type { SysTenant, SysTenantQuota } from '@/types';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green',
  SUSPENDED: 'orange',
  DELETED: 'red',
};

const statusLabelMap: Record<string, string> = {
  ACTIVE: '正常',
  SUSPENDED: '暂停',
  DELETED: '已删除',
};

export default function TenantManagement() {
  const { tenants, fetchTenants, userRole } = useTenantStore();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<SysTenant | null>(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [currentQuota, setCurrentQuota] = useState<SysTenantQuota | null>(null);
  const [quotaTenantId, setQuotaTenantId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTenant, setDetailTenant] = useState<SysTenant | null>(null);
  const [detailQuota, setDetailQuota] = useState<SysTenantQuota | null>(null);

  const [form] = Form.useForm();
  const [quotaForm] = Form.useForm();

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      await fetchTenants();
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditTenant(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      maxTemplates: 50,
      maxFieldsPerTemplate: 30,
      maxFormSubmissions: 5000,
      maxStorageMb: 512,
      maxApiCallsDaily: 20000,
      maxWebhookRules: 10,
    });
    setModalOpen(true);
  };

  const handleEdit = (tenant: SysTenant) => {
    setEditTenant(tenant);
    form.setFieldsValue({
      tenantCode: tenant.tenantCode,
      tenantName: tenant.tenantName,
      description: tenant.description,
      adminUser: tenant.adminUser,
      adminEmail: tenant.adminEmail,
      adminPhone: tenant.adminPhone,
      status: tenant.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editTenant) {
        await tenantApi.updateTenant(editTenant.id, values);
        message.success('租户更新成功');
      } else {
        await tenantApi.createTenant(values);
        message.success('租户创建成功');
      }
      setModalOpen(false);
      loadTenants();
    } catch (e: any) {
      if (e.message) message.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tenantApi.deleteTenant(id);
      message.success('租户删除成功');
      loadTenants();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleQuota = async (tenantId: number) => {
    try {
      const quota = await tenantApi.getQuota(tenantId);
      setCurrentQuota(quota);
      setQuotaTenantId(tenantId);
      quotaForm.setFieldsValue(quota);
      setQuotaModalOpen(true);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleQuotaSubmit = async () => {
    try {
      const values = await quotaForm.validateFields();
      if (quotaTenantId) {
        await tenantApi.updateQuota(quotaTenantId, values);
        message.success('配额更新成功');
        setQuotaModalOpen(false);
      }
    } catch (e: any) {
      if (e.message) message.error(e.message);
    }
  };

  const handleDetail = async (tenant: SysTenant) => {
    setDetailTenant(tenant);
    try {
      const quota = await tenantApi.getQuota(tenant.id);
      setDetailQuota(quota);
    } catch {
      setDetailQuota(null);
    }
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: '租户编码',
      dataIndex: 'tenantCode',
      width: 120,
    },
    {
      title: '租户名称',
      dataIndex: 'tenantName',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '管理员',
      dataIndex: 'adminUser',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusLabelMap[status] || status}</Tag>
      ),
    },
    {
      title: '系统内置',
      dataIndex: 'isSystem',
      width: 80,
      render: (v: number) => v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作',
      width: 220,
      render: (_: any, record: SysTenant) => (
        <Space>
          <Tooltip title="详情">
            <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => handleDetail(record)} />
          </Tooltip>
          {isSuperAdmin && (
            <>
              <Tooltip title="编辑">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              </Tooltip>
              <Tooltip title="配额">
                <Button size="small" icon={<SettingOutlined />} onClick={() => handleQuota(record.id)} />
              </Tooltip>
              {record.isSystem !== 1 && (
                <Popconfirm title="确定删除此租户？" onConfirm={() => handleDelete(record.id)}>
                  <Tooltip title="删除">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const quotaPercent = (current: number, max: number) => {
    if (!max) return 0;
    return Math.min(Math.round((current / max) * 100), 100);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>租户管理</h2>
        {isSuperAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建租户
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={tenants}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      <Modal
        title={editTenant ? '编辑租户' : '新建租户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tenantCode" label="租户编码" rules={[{ required: true, message: '请输入租户编码' }]}>
            <Input disabled={!!editTenant} placeholder="如：HR、FINANCE" />
          </Form.Item>
          <Form.Item name="tenantName" label="租户名称" rules={[{ required: true, message: '请输入租户名称' }]}>
            <Input placeholder="如：人事部、财务部" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="adminUser" label="管理员账号" rules={editTenant ? [] : [{ required: true, message: '请输入管理员账号' }]}>
            <Input placeholder="管理员登录账号" />
          </Form.Item>
          <Form.Item name="adminEmail" label="管理员邮箱">
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="adminPhone" label="管理员手机">
            <Input placeholder="手机号" />
          </Form.Item>
          {editTenant && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { label: '正常', value: 'ACTIVE' },
                { label: '暂停', value: 'SUSPENDED' },
              ]} />
            </Form.Item>
          )}
          {!editTenant && (
            <>
              <Form.Item name="maxTemplates" label="最大模板数">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="maxFormSubmissions" label="最大填报次数">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="maxStorageMb" label="最大存储空间(MB)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="资源配额设置"
        open={quotaModalOpen}
        onOk={handleQuotaSubmit}
        onCancel={() => setQuotaModalOpen(false)}
        width={500}
        destroyOnClose
      >
        <Tabs items={[
          {
            key: 'quota',
            label: '配额上限',
            children: (
              <Form form={quotaForm} layout="vertical">
                <Form.Item name="maxTemplates" label="最大模板数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="maxFieldsPerTemplate" label="每模板最大字段数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="maxFormSubmissions" label="最大填报次数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="maxStorageMb" label="最大存储空间(MB)">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="maxApiCallsDaily" label="每日最大API调用次数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="maxWebhookRules" label="最大Webhook规则数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'usage',
            label: '当前用量',
            children: currentQuota ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>模板数</span>
                    <span>{currentQuota.currentTemplates} / {currentQuota.maxTemplates}</span>
                  </div>
                  <Progress percent={quotaPercent(currentQuota.currentTemplates, currentQuota.maxTemplates)} size="small" />
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>填报次数</span>
                    <span>{currentQuota.currentFormSubmissions} / {currentQuota.maxFormSubmissions}</span>
                  </div>
                  <Progress percent={quotaPercent(currentQuota.currentFormSubmissions, currentQuota.maxFormSubmissions)} size="small" />
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>存储空间</span>
                    <span>{Number(currentQuota.currentStorageMb).toFixed(1)} / {currentQuota.maxStorageMb} MB</span>
                  </div>
                  <Progress percent={quotaPercent(Number(currentQuota.currentStorageMb), currentQuota.maxStorageMb)} size="small" />
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>今日API调用</span>
                    <span>{currentQuota.currentApiCallsDaily} / {currentQuota.maxApiCallsDaily}</span>
                  </div>
                  <Progress percent={quotaPercent(currentQuota.currentApiCallsDaily, currentQuota.maxApiCallsDaily)} size="small" />
                </Card>
              </div>
            ) : <div>暂无用量数据</div>,
          },
        ]} />
      </Modal>

      <Modal
        title="租户详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {detailTenant && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="租户编码">{detailTenant.tenantCode}</Descriptions.Item>
            <Descriptions.Item label="租户名称">{detailTenant.tenantName}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColorMap[detailTenant.status]}>{statusLabelMap[detailTenant.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="系统内置">{detailTenant.isSystem ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="管理员">{detailTenant.adminUser}</Descriptions.Item>
            <Descriptions.Item label="管理员邮箱">{detailTenant.adminEmail || '-'}</Descriptions.Item>
            <Descriptions.Item label="管理员手机">{detailTenant.adminPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="表前缀">{detailTenant.tablePrefix || '(共享表)'}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{detailTenant.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {detailTenant.createdAt ? new Date(detailTenant.createdAt).toLocaleString() : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
        {detailQuota && (
          <Card title="资源配额" size="small" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>模板数</span>
                <span>{detailQuota.currentTemplates} / {detailQuota.maxTemplates}</span>
              </div>
              <Progress percent={quotaPercent(detailQuota.currentTemplates, detailQuota.maxTemplates)} size="small" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>填报次数</span>
                <span>{detailQuota.currentFormSubmissions} / {detailQuota.maxFormSubmissions}</span>
              </div>
              <Progress percent={quotaPercent(detailQuota.currentFormSubmissions, detailQuota.maxFormSubmissions)} size="small" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>存储空间</span>
                <span>{Number(detailQuota.currentStorageMb).toFixed(1)} / {detailQuota.maxStorageMb} MB</span>
              </div>
              <Progress percent={quotaPercent(Number(detailQuota.currentStorageMb), detailQuota.maxStorageMb)} size="small" />
            </div>
          </Card>
        )}
      </Modal>
    </div>
  );
}
