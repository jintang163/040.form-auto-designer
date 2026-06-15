import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Select, Button, message } from 'antd';
import dayjs from 'dayjs';
import { templateApi, formDataApi } from '@/services/api';
import type { FormTemplate, FormData } from '@/types';

export default function FormDataList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dataList, setDataList] = useState<FormData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    templateApi.getTemplates({ page: 1, pageSize: 200 }).then((res) => {
      setTemplates(res.list);
      if (res.list.length > 0) setSelectedTemplateId(res.list[0].id);
    }).catch((e) => message.error(e.message));
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    setLoading(true);
    formDataApi.getFormDataList(selectedTemplateId, { page, pageSize })
      .then((res) => { setDataList(res.list); setTotal(res.total); })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedTemplateId, page, pageSize]);

  const columns = [
    { title: '提交人', dataIndex: 'submitter', key: 'submitter' },
    { title: '模板名称', dataIndex: 'templateName', key: 'templateName' },
    {
      title: '提交时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_: any, record: FormData) => (
        <Button size="small" onClick={() => navigate(`/form-data/${record.id}`)}>查看详情</Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>选择模板：</span>
        <Select
          style={{ width: 300 }}
          value={selectedTemplateId || undefined}
          onChange={(v) => { setSelectedTemplateId(v); setPage(1); }}
          options={templates.map((t) => ({ label: `${t.name} (v${t.version})`, value: t.id }))}
          placeholder="请选择模板"
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataList}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </div>
  );
}
