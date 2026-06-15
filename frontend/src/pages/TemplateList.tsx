import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, Tag, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFormStore } from '@/store/formStore';
import { templateApi } from '@/services/api';
import type { TemplateStatus } from '@/types';

const statusMap: Record<TemplateStatus, { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PUBLISHED: { color: 'green', text: '已发布' },
  ARCHIVED: { color: 'orange', text: '已归档' },
};

export default function TemplateList() {
  const navigate = useNavigate();
  const { templates, templatesTotal, templatesLoading, fetchTemplates } = useFormStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchTemplates(page, pageSize, keyword);
  }, [page, pageSize, keyword, fetchTemplates]);

  const handlePublish = async (id: string) => {
    try {
      await templateApi.publishTemplate(id);
      message.success('发布成功');
      fetchTemplates(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await templateApi.copyTemplate(id);
      message.success('复制成功');
      fetchTemplates(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await templateApi.deleteTemplate(id);
      message.success('删除成功');
      fetchTemplates(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '编码', dataIndex: 'code', key: 'code' },
    { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TemplateStatus) => {
        const s = statusMap[status];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" onClick={() => navigate(`/templates/${record.id}/edit`)}>编辑</Button>
          <Button size="small" onClick={() => navigate(`/templates/${record.id}/preview`)}>预览</Button>
          {record.status === 'DRAFT' && (
            <Popconfirm title="确认发布？" onConfirm={() => handlePublish(record.id)}>
              <Button size="small" type="primary">发布</Button>
            </Popconfirm>
          )}
          <Button size="small" onClick={() => handleCopy(record.id)}>复制</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="搜索模板"
          allowClear
          style={{ width: 300 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/templates/create')}>
          新建模板
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={templates}
        loading={templatesLoading}
        pagination={{
          current: page,
          pageSize,
          total: templatesTotal,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </div>
  );
}
