import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Tag,
  Space,
  message,
  Divider,
  Table,
  Modal,
  Empty,
  Spin,
  InputNumber,
} from 'antd';
import {
  DeployOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { workflowApi } from '@/services/api';
import type { WorkflowProcess, WorkflowDeployRequest } from '@/types';

interface WorkflowDeployProps {
  templateId: string;
  templateName?: string;
}

const MULTI_INSTANCE_TYPES = [
  { value: 0, label: '逐级审批', desc: '按顺序依次审批，每级审批人通过后流转到下一级' },
  { value: 1, label: '或签', desc: '任一审批人通过即可，任一驳回即终止' },
  { value: 2, label: '会签', desc: '所有审批人都需审批，全部通过才通过' },
];

export default function WorkflowDeploy({ templateId, templateName }: WorkflowDeployProps) {
  const [existingProcess, setExistingProcess] = useState<WorkflowProcess | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [form] = Form.useForm();
  const [variableMappings, setVariableMappings] = useState<{ formField: string; processVar: string }[]>([]);

  useEffect(() => {
    fetchExistingProcess();
  }, [templateId]);

  const fetchExistingProcess = async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getProcessByTemplateId(templateId);
      setExistingProcess(data);
      if (data) {
        form.setFieldsValue({
          processKey: data.processKey,
          processName: data.processName,
          multiInstanceType: data.multiInstanceType,
          assignees: data.assignees,
          approvalLevels: data.approvalLevels,
        });
        if (data.formVariableMapping) {
          try {
            const mapping = JSON.parse(data.formVariableMapping);
            const entries = Object.entries(mapping).map(([formField, processVar]) => ({
              formField,
              processVar: String(processVar),
            }));
            setVariableMappings(entries);
          } catch {}
        }
      }
    } catch {
      setExistingProcess(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    try {
      const values = await form.validateFields();
      setDeploying(true);

      const formVariableMapping =
        variableMappings.length > 0
          ? JSON.stringify(
              Object.fromEntries(
                variableMappings
                  .filter((m) => m.formField && m.processVar)
                  .map((m) => [m.formField, m.processVar])
              )
            )
          : undefined;

      const request: WorkflowDeployRequest = {
        templateId: Number(templateId),
        processKey: values.processKey || `form_${templateId}_approval`,
        processName: values.processName || `${templateName || '表单'}审批流程`,
        multiInstanceType: values.multiInstanceType ?? 0,
        assignees: values.assignees,
        approvalLevels: values.approvalLevels || values.assignees?.length || 1,
        formVariableMapping,
      };

      await workflowApi.deployProcess(request);
      message.success('流程部署成功');
      fetchExistingProcess();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || '部署失败');
    } finally {
      setDeploying(false);
    }
  };

  const addVariableMapping = () => {
    setVariableMappings([...variableMappings, { formField: '', processVar: '' }]);
  };

  const removeVariableMapping = (index: number) => {
    setVariableMappings(variableMappings.filter((_, i) => i !== index));
  };

  const updateVariableMapping = (index: number, field: 'formField' | 'processVar', value: string) => {
    const updated = [...variableMappings];
    updated[index] = { ...updated[index], [field]: value };
    setVariableMappings(updated);
  };

  const handlePreviewBpmn = async () => {
    try {
      const values = await form.validateFields();
      const request: WorkflowDeployRequest = {
        templateId: Number(templateId),
        processKey: values.processKey || `form_${templateId}_approval`,
        processName: values.processName || `${templateName || '表单'}审批流程`,
        multiInstanceType: values.multiInstanceType ?? 0,
        assignees: values.assignees,
        approvalLevels: values.approvalLevels || values.assignees?.length || 1,
      };
      const bpmnXml = await workflowApi.generateBpmnXml(request);
      Modal.info({
        title: 'BPMN 流程定义预览',
        width: 720,
        content: (
          <pre style={{ maxHeight: 500, overflow: 'auto', fontSize: 12, background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
            {bpmnXml}
          </pre>
        ),
      });
    } catch (e: any) {
      message.error(e.message || '生成失败');
    }
  };

  if (loading) {
    return (
      <Card>
        <Spin tip="加载流程配置..." />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <DeployOutlined />
          <span>审批流程配置</span>
          {existingProcess && (
            <Tag color={existingProcess.status === 'ACTIVE' ? 'success' : 'default'}>
              {existingProcess.status === 'ACTIVE' ? '已部署' : '已失效'}
            </Tag>
          )}
        </Space>
      }
    >
      {existingProcess && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
          <Space>
            <Tag color="blue">{existingProcess.processName}</Tag>
            <span>审批人: {existingProcess.assignees.join(', ')}</span>
            <span>审批级数: {existingProcess.approvalLevels}</span>
            <Tag>{MULTI_INSTANCE_TYPES.find((t) => t.value === existingProcess.multiInstanceType)?.label}</Tag>
          </Space>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          processKey: `form_${templateId}_approval`,
          processName: `${templateName || '表单'}审批流程`,
          multiInstanceType: 0,
          assignees: [],
          approvalLevels: 1,
        }}
      >
        <Form.Item label="流程Key" name="processKey" rules={[{ required: true, message: '请输入流程Key' }]}>
          <Input placeholder="如: form_1_approval" />
        </Form.Item>

        <Form.Item label="流程名称" name="processName" rules={[{ required: true, message: '请输入流程名称' }]}>
          <Input placeholder="如: 员工信息采集审批" />
        </Form.Item>

        <Form.Item label="审批模式" name="multiInstanceType">
          <Select>
            {MULTI_INSTANCE_TYPES.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label} - {t.desc}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="审批人列表" name="assignees" rules={[{ required: true, message: '请输入审批人' }]}>
          <Select mode="tags" placeholder="输入审批人ID后按回车添加" />
        </Form.Item>

        <Form.Item label="审批级数" name="approvalLevels">
          <InputNumber min={1} max={20} style={{ width: '100%' }} />
        </Form.Item>

        <Divider>表单字段与流程变量映射</Divider>

        {variableMappings.length > 0 && (
          <Table
            size="small"
            pagination={false}
            dataSource={variableMappings.map((m, i) => ({ ...m, key: i }))}
            columns={[
              { title: '表单字段', dataIndex: 'formField', render: (_, __, idx) => (
                <Input size="small" value={variableMappings[idx].formField} onChange={(e) => updateVariableMapping(idx, 'formField', e.target.value)} placeholder="字段名" />
              )},
              { title: '流程变量', dataIndex: 'processVar', render: (_, __, idx) => (
                <Input size="small" value={variableMappings[idx].processVar} onChange={(e) => updateVariableMapping(idx, 'processVar', e.target.value)} placeholder="变量名" />
              )},
              { title: '操作', width: 60, render: (_, __, idx) => (
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeVariableMapping(idx)} />
              )},
            ]}
          />
        )}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addVariableMapping} style={{ width: '100%', marginTop: 8 }}>
          添加变量映射
        </Button>

        <Divider />

        <Space>
          <Button type="primary" icon={<DeployOutlined />} loading={deploying} onClick={handleDeploy}>
            {existingProcess ? '重新部署' : '部署流程'}
          </Button>
          <Button icon={<ThunderboltOutlined />} onClick={handlePreviewBpmn}>
            预览BPMN
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
