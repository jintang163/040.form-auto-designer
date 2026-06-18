import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Popconfirm,
  Card,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { PrintTemplate } from '../types/print';
import { printTemplateApi } from '../services/printApi';
import PrintTemplateEditor from '../components/PrintTemplateEditor';

const { Option } = Select;

const PrintTemplateManage: React.FC = () => {
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editTemplate, setEditTemplate] = useState<PrintTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await printTemplateApi.listAll();
      setTemplates(data);
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditTemplate(null);
    setEditorVisible(true);
  };

  const handleEdit = (record: PrintTemplate) => {
    setEditTemplate(record);
    setEditorVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await printTemplateApi.delete(id);
      message.success('删除成功');
      loadTemplates();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await printTemplateApi.setDefault(id);
      message.success('已设为默认模板');
      loadTemplates();
    } catch (error) {
      message.error('设置失败');
    }
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'templateName',
      key: 'templateName',
      render: (text: string, record: PrintTemplate) => (
        <Space>
          {text}
          {record.isDefault && <Tag color="gold">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '模板编码',
      dataIndex: 'templateCode',
      key: 'templateCode',
    },
    {
      title: '模板类型',
      dataIndex: 'templateType',
      key: 'templateType',
      render: (type: string) => (
        <Tag color={type === 'PREPRINT' ? 'blue' : 'green'}>
          {type === 'PREPRINT' ? '套打模板' : '普通模板'}
        </Tag>
      ),
    },
    {
      title: '纸张大小',
      dataIndex: 'paperSize',
      key: 'paperSize',
    },
    {
      title: '方向',
      dataIndex: 'orientation',
      key: 'orientation',
      render: (orientation: string) =>
        orientation === 'LANDSCAPE' ? '横向' : '纵向',
    },
    {
      title: '水印',
      dataIndex: 'watermarkEnabled',
      key: 'watermarkEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'cyan' : 'default'}>{enabled ? '已启用' : '未启用'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '激活' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: PrintTemplate) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={record.isDefault ? <StarFilled /> : <StarOutlined />}
            onClick={() => handleSetDefault(record.id)}
            disabled={record.isDefault}
          >
            {record.isDefault ? '已默认' : '设为默认'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此模板？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="打印模板管理"
        extra={
          <Space>
            <Select
              placeholder="选择表单模板"
              style={{ width: 200 }}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              allowClear
            >
              <Option value={null}>全部模板</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新建模板
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <PrintTemplateEditor
        open={editorVisible}
        templateId={selectedTemplateId || 0}
        editTemplate={editTemplate}
        onClose={() => setEditorVisible(false)}
        onSuccess={() => {
          loadTemplates();
          setEditorVisible(false);
        }}
      />
    </div>
  );
};

export default PrintTemplateManage;
