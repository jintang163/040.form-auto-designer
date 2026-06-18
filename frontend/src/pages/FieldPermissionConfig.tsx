import { useEffect, useState } from 'react';
import { Table, Button, Select, Switch, Space, Card, message, Modal, Form, Input, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { templateApi, fieldApi, fieldPermissionApi } from '@/services/api';
import type { FormTemplate, FormField, FormFieldPermission, FieldPermissionInfo } from '@/types';

const ROLE_OPTIONS = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '租户管理员', value: 'TENANT_ADMIN' },
  { label: '普通用户', value: 'USER' },
];

export default function FieldPermissionConfig() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [permissions, setPermissions] = useState<FormFieldPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<FormFieldPermission | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    templateApi.getTemplates({ page: 1, pageSize: 200 }).then((res) => {
      setTemplates(res.list);
      if (res.list.length > 0) setSelectedTemplateId(res.list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    setLoading(true);
    Promise.all([
      fieldApi.getFields(selectedTemplateId),
      fieldPermissionApi.getPermissions(selectedTemplateId),
    ])
      .then(([fieldList, permList]) => {
        setFields(fieldList);
        setPermissions(Array.isArray(permList) ? permList : []);
      })
      .catch(() => {
        setFields([]);
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  }, [selectedTemplateId]);

  const getFieldPermMap = () => {
    const map: Record<string, FieldPermissionInfo> = {};
    for (const f of fields) {
      const fieldPerms = permissions.filter(
        (p) => p.templateId === Number(selectedTemplateId) && p.fieldName === f.fieldName
      );
      map[f.fieldName] = {
        isSensitive: f.isSensitive || false,
        canViewSensitive: fieldPerms.some((p) => p.canViewSensitive),
        canEdit: fieldPerms.length === 0 || fieldPerms.some((p) => p.canEdit),
        canExport: fieldPerms.some((p) => p.canExport),
      };
    }
    return map;
  };

  const handleAdd = () => {
    setEditingPerm(null);
    form.resetFields();
    form.setFieldsValue({
      templateId: Number(selectedTemplateId),
      roleName: 'USER',
      canViewSensitive: false,
      canEdit: true,
      canExport: false,
    });
    setModalOpen(true);
  };

  const handleEdit = (perm: FormFieldPermission) => {
    setEditingPerm(perm);
    form.setFieldsValue({
      templateId: perm.templateId,
      fieldName: perm.fieldName,
      roleName: perm.roleName,
      userId: perm.userId,
      canViewSensitive: perm.canViewSensitive,
      canEdit: perm.canEdit,
      canExport: perm.canExport,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data: Partial<FormFieldPermission> = {
        ...editingPerm,
        templateId: values.templateId ? Number(values.templateId) : undefined,
        fieldName: values.fieldName || undefined,
        roleName: values.roleName,
        userId: values.userId || undefined,
        canViewSensitive: !!values.canViewSensitive,
        canEdit: !!values.canEdit,
        canExport: !!values.canExport,
      };
      await fieldPermissionApi.savePermission(data);
      message.success('权限保存成功');
      setModalOpen(false);
      const permList = await fieldPermissionApi.getPermissions(selectedTemplateId);
      setPermissions(Array.isArray(permList) ? permList : []);
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fieldPermissionApi.deletePermission(id);
      message.success('权限已删除');
      setPermissions((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const permMap = getFieldPermMap();

  const fieldColumns = [
    {
      title: '字段标签',
      dataIndex: 'fieldLabel',
      width: 150,
      render: (text: string, record: FormField) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {text}
          {(record.isSensitive || permMap[record.fieldName]?.isSensitive) && (
            <Tag color="red" icon={<LockOutlined />} style={{ fontSize: 10, padding: '0 4px' }}>
              敏感
            </Tag>
          )}
        </span>
      ),
    },
    { title: '字段名', dataIndex: 'fieldName', width: 150 },
    {
      title: '可查看原文',
      width: 100,
      render: (_: any, record: FormField) => {
        const perm = permMap[record.fieldName];
        return <Switch size="small" checked={perm?.canViewSensitive} disabled />;
      },
    },
    {
      title: '可编辑',
      width: 100,
      render: (_: any, record: FormField) => {
        const perm = permMap[record.fieldName];
        return <Switch size="small" checked={perm?.canEdit} disabled />;
      },
    },
    {
      title: '可导出',
      width: 100,
      render: (_: any, record: FormField) => {
        const perm = permMap[record.fieldName];
        return <Switch size="small" checked={perm?.canExport} disabled />;
      },
    },
  ];

  const permColumns = [
    { title: '字段', dataIndex: 'fieldName', width: 120, render: (v: string) => v || '(全部)' },
    { title: '角色', dataIndex: 'roleName', width: 120 },
    { title: '用户ID', dataIndex: 'userId', width: 120, render: (v: string) => v || '-' },
    {
      title: '查看原文', dataIndex: 'canViewSensitive', width: 80,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '编辑', dataIndex: 'canEdit', width: 80,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '导出', dataIndex: 'canExport', width: 80,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '操作', width: 120,
      render: (_: any, record: FormFieldPermission) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>选择模板：</span>
        <Select
          style={{ width: 250 }}
          value={selectedTemplateId || undefined}
          onChange={(v) => setSelectedTemplateId(v)}
          options={templates.map((t) => ({ label: `${t.name} (v${t.version})`, value: t.id }))}
          placeholder="请选择模板"
        />
      </div>

      <Card size="small" title="字段权限概览" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          rowKey="fieldName"
          dataSource={fields}
          columns={fieldColumns}
          pagination={false}
          loading={loading}
        />
      </Card>

      <Card
        size="small"
        title="权限规则配置"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增规则</Button>}
      >
        <Table
          size="small"
          rowKey="id"
          dataSource={permissions.filter((p) => p.templateId === Number(selectedTemplateId))}
          columns={permColumns}
          pagination={false}
          loading={loading}
        />
      </Card>

      <Modal
        title={editingPerm ? '编辑权限规则' : '新增权限规则'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="templateId" label="模板ID" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="fieldName" label="字段名（留空表示全部字段）">
            <Select
              allowClear
              placeholder="选择字段或留空"
              options={fields.map((f) => ({ label: `${f.fieldLabel} (${f.fieldName})`, value: f.fieldName }))}
            />
          </Form.Item>
          <Form.Item name="roleName" label="角色" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="userId" label="用户ID（留空表示按角色匹配）">
            <Input placeholder="指定用户ID" />
          </Form.Item>
          <Form.Item name="canViewSensitive" label="可查看敏感原文" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="canEdit" label="可编辑" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="canExport" label="可导出" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
