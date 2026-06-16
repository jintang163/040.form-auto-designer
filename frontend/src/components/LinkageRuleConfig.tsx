import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Switch, Button, Space, Table, Modal, message, Tag, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { linkageApi } from '@/services/api';
import type { LinkageRule, LinkageRuleType, FormField } from '@/types';

interface LinkageRuleConfigProps {
  templateId: string;
  fields: FormField[];
}

const RULE_TYPE_OPTIONS: { label: string; value: LinkageRuleType; desc: string }[] = [
  { label: '条件显隐（显示）', value: 'SHOW', desc: '条件满足时显示目标字段' },
  { label: '条件显隐（隐藏）', value: 'HIDE', desc: '条件满足时隐藏目标字段' },
  { label: '计算公式', value: 'COMPUTE', desc: '如：quantity * unitPrice' },
  { label: '动态选项', value: 'DYNAMIC_OPTIONS', desc: '从外部 API 获取下拉选项' },
  { label: '条件必填', value: 'REQUIRED', desc: '条件满足时目标字段必填' },
  { label: '条件禁用', value: 'DISABLED', desc: '条件满足时目标字段禁用' },
];

const EXPRESSION_EXAMPLES = [
  { label: '数量×单价', expr: 'quantity * unitPrice' },
  { label: '合计=小计+税', expr: 'subtotal + tax' },
  { label: '折扣价=原价×折扣', expr: 'originalPrice * discount' },
  { label: '总价=数量×单价×(1+税率)', expr: 'quantity * unitPrice * (1 + taxRate)' },
];

const CONDITION_EXAMPLES = [
  { label: '是否需要备注', expr: 'needRemark == "是"' },
  { label: '金额大于1000', expr: 'amount > 1000' },
  { label: '类型为采购', expr: 'type == "采购"' },
  { label: '包含某选项', expr: 'string.includes(category, "设备")' },
];

export default function LinkageRuleConfig({ templateId, fields }: LinkageRuleConfigProps) {
  const [rules, setRules] = useState<LinkageRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LinkageRule | null>(null);
  const [form] = Form.useForm();

  const fetchRules = async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const list = await linkageApi.listByTemplate(templateId);
      setRules(list);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [templateId]);

  const fieldOptions = fields.map((f) => ({ label: `${f.fieldLabel} (${f.fieldName})`, value: f.fieldName }));

  const openCreate = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      ruleType: 'SHOW',
      enabled: true,
      sortOrder: rules.length,
    });
    setModalOpen(true);
  };

  const openEdit = (rule: LinkageRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        templateId: Number(templateId),
      };
      if (editingRule) {
        await linkageApi.updateRule(editingRule.id, data);
        message.success('更新成功');
      } else {
        await linkageApi.createRule(data);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchRules();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    await linkageApi.deleteRule(id);
    message.success('删除成功');
    fetchRules();
  };

  const ruleTypeColor: Record<string, string> = {
    SHOW: 'green',
    HIDE: 'orange',
    COMPUTE: 'blue',
    DYNAMIC_OPTIONS: 'purple',
    REQUIRED: 'red',
    DISABLED: 'default',
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 140,
    },
    {
      title: '类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 120,
      render: (t: LinkageRuleType) => (
        <Tag color={ruleTypeColor[t] || 'default'}>
          {RULE_TYPE_OPTIONS.find((o) => o.value === t)?.label || t}
        </Tag>
      ),
    },
    {
      title: '触发字段',
      dataIndex: 'sourceField',
      key: 'sourceField',
      width: 120,
    },
    {
      title: '目标字段',
      dataIndex: 'targetField',
      key: 'targetField',
      width: 120,
    },
    {
      title: '条件',
      dataIndex: 'conditionExpr',
      key: 'conditionExpr',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '表达式/URL',
      key: 'exprOrUrl',
      ellipsis: true,
      render: (_: any, r: LinkageRule) => r.expression || r.dynamicOptionsUrl || '-',
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 70,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, r: LinkageRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
        </Space>
      ),
    },
  ];

  const selectedRuleType = Form.useWatch('ruleType', form);

  return (
    <Card
      title="字段联动规则"
      size="small"
      extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加规则</Button>}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rules}
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: <Empty description="暂无联动规则" /> }}
      />

      <Modal
        title={editingRule ? '编辑联动规则' : '新建联动规则'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={640}
        okText="保存"
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="ruleName" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="如：选择是时显示备注框" />
          </Form.Item>

          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true }]}>
            <Select options={RULE_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="sourceField" label="触发字段" style={{ width: 240 }}>
              <Select
                options={fieldOptions}
                showSearch
                optionFilterProp="label"
                placeholder="值变化时触发"
                allowClear
              />
            </Form.Item>
            <Form.Item name="targetField" label="目标字段" rules={[{ required: true }]} style={{ width: 240 }}>
              <Select options={fieldOptions} showSearch optionFilterProp="label" placeholder="受影响的字段" />
            </Form.Item>
          </Space>

          <Form.Item
            name="conditionExpr"
            label={
              <Space>
                条件表达式（Aviator）
                <span style={{ color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                  留空则始终触发
                </span>
              </Space>
            }
          >
            <Input.TextArea
              rows={2}
              placeholder='如：needRemark == "是" 或 amount > 1000'
            />
          </Form.Item>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#999' }}>常用条件示例：</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {CONDITION_EXAMPLES.map((ex) => (
                <Tag
                  key={ex.label}
                  style={{ cursor: 'pointer' }}
                  color="default"
                  onClick={() => form.setFieldsValue({ conditionExpr: ex.expr })}
                >
                  {ex.label}
                </Tag>
              ))}
            </div>
          </div>

          {(selectedRuleType === 'COMPUTE') && (
            <>
              <Form.Item name="expression" label="计算表达式（Aviator）" rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="如：quantity * unitPrice" />
              </Form.Item>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#999' }}>常用公式示例：</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {EXPRESSION_EXAMPLES.map((ex) => (
                    <Tag
                      key={ex.label}
                      style={{ cursor: 'pointer' }}
                      color="blue"
                      onClick={() => form.setFieldsValue({ expression: ex.expr })}
                    >
                      {ex.label}
                    </Tag>
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedRuleType === 'DYNAMIC_OPTIONS' && (
            <Form.Item name="dynamicOptionsUrl" label="动态数据源 URL" rules={[{ required: true }]}>
              <Input placeholder="https://api.example.com/options?type=#{category}" />
            </Form.Item>
          )}

          <Space>
            <Form.Item name="sortOrder" label="排序">
              <Input type="number" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
