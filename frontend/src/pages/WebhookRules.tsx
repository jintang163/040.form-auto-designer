import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { webhookApi, templateApi } from '@/services/api';
import type { WebhookRule, FormTemplate } from '@/types';

export default function WebhookRules() {
  const [rules, setRules] = useState<WebhookRule[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WebhookRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const loadRules = () => {
    setLoading(true);
    webhookApi.getRules()
      .then(setRules)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadTemplates = () => {
    templateApi.getTemplates({ page: 1, pageSize: 200 })
      .then((res) => setTemplates(res.list))
      .catch((e) => message.error(e.message));
  };

  useEffect(() => { loadRules(); loadTemplates(); }, []);

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({ httpMethod: 'POST', enabled: true });
    setModalOpen(true);
  };

  const handleEdit = (rule: WebhookRule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      ruleName: rule.ruleName,
      templateId: rule.templateId,
      webhookUrl: rule.webhookUrl,
      httpMethod: rule.httpMethod,
      headersJson: rule.headersJson,
      enabled: rule.enabled,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const payload = { ...values, templateId: String(values.templateId) };
      if (editingRule) {
        webhookApi.updateRule(editingRule.id, payload)
          .then(() => { message.success('更新成功'); loadRules(); setModalOpen(false); })
          .catch((e) => message.error(e.message));
      } else {
        webhookApi.createRule(payload)
          .then(() => { message.success('创建成功'); loadRules(); setModalOpen(false); })
          .catch((e) => message.error(e.message));
      }
    });
  };

  const handleDelete = (id: string) => {
    webhookApi.deleteRule(id)
      .then(() => { message.success('删除成功'); loadRules(); })
      .catch((e) => message.error(e.message));
  };

  const handleToggle = (rule: WebhookRule, enabled: boolean) => {
    webhookApi.updateRule(rule.id, { ...rule, enabled })
      .then(() => { loadRules(); })
      .catch((e) => message.error(e.message));
  };

  const columns = [
    { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
    {
      title: '关联模板', dataIndex: 'templateId', key: 'templateId',
      render: (v: string) => {
        const t = templates.find((t) => t.id === v);
        return t ? t.name : v;
      },
    },
    { title: 'Webhook URL', dataIndex: 'webhookUrl', key: 'webhookUrl', ellipsis: true },
    { title: 'HTTP方法', dataIndex: 'httpMethod', key: 'httpMethod', width: 100 },
    {
      title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100,
      render: (v: boolean, record: WebhookRule) => (
        <Switch checked={v} size="small" onChange={(checked) => handleToggle(record, checked)} />
      ),
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_: any, record: WebhookRule) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建规则</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rules}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editingRule ? '编辑规则' : '新建规则'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="请输入规则名称" />
          </Form.Item>
          <Form.Item name="templateId" label="关联模板" rules={[{ required: true, message: '请选择模板' }]}>
            <Select
              placeholder="请选择模板"
              options={templates.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          <Form.Item name="webhookUrl" label="Webhook URL" rules={[{ required: true, message: '请输入URL' }]}>
            <Input placeholder="https://example.com/webhook" />
          </Form.Item>
          <Form.Item name="httpMethod" label="HTTP方法">
            <Select options={[{ label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }]} />
          </Form.Item>
          <Form.Item name="headersJson" label="自定义请求头(JSON)">
            <Input.TextArea rows={3} placeholder='{"Authorization": "Bearer xxx"}' />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
