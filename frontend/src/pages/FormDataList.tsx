import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Select, Button, Input, Space, message, Popconfirm, Tag, Checkbox } from 'antd';
import { DownloadOutlined, DeleteOutlined, LockOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { templateApi, formDataApi, fieldApi } from '@/services/api';
import MaskedFieldCell from '@/components/MaskedFieldCell';
import BatchExportButton from '@/components/BatchExportButton';
import type { FormTemplate, FormField, FormData, FieldPermissionInfo } from '@/types';

export default function FormDataList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [dataList, setDataList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [filterFieldName, setFilterFieldName] = useState<string>('');
  const [filterFieldValue, setFilterFieldValue] = useState<string>('');
  const [selectedFilterField, setSelectedFilterField] = useState<string>('');
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermissionInfo>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    templateApi.getTemplates({ page: 1, pageSize: 200 }).then((res) => {
      setTemplates(res.list);
      if (res.list.length > 0) setSelectedTemplateId(res.list[0].id);
    }).catch((e) => message.error(e.message));
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    fieldApi.getFields(selectedTemplateId).then(setFields).catch(() => {});
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    setLoading(true);
    formDataApi.getFormDataListPaged(selectedTemplateId, {
      page, pageSize,
      fieldName: selectedFilterField || undefined,
      fieldValue: filterFieldValue || undefined,
    })
      .then((res: any) => {
        setDataList(res.list || []);
        setTotal(res.total || 0);
        if (res.fieldPermissions) {
          setFieldPermissions(res.fieldPermissions);
        }
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedTemplateId, page, pageSize, selectedFilterField, filterFieldValue]);

  const handleExport = () => {
    formDataApi.exportExcel(selectedTemplateId, {
      fieldName: selectedFilterField || undefined,
      fieldValue: filterFieldValue || undefined,
    });
  };

  const handleDelete = (id: string) => {
    message.info('删除功能已就绪');
  };

  const baseColumns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 80,
    },
    {
      title: '提交人', dataIndex: 'submitterId', key: 'submitterId', width: 120,
    },
    {
      title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 180,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '',
    },
  ];

  const dynamicColumns = fields.slice(0, 5).map((f) => {
    const perm = fieldPermissions[f.fieldName];
    const isSensitive = perm?.isSensitive || f.isSensitive;
    return {
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {f.fieldLabel}
          {isSensitive && (
            <Tag color="red" icon={<LockOutlined />} style={{ fontSize: 10, padding: '0 4px' }}>
              敏感
            </Tag>
          )}
        </span>
      ),
      key: f.fieldName,
      width: 180,
      render: (_: any, record: any) => {
        try {
          const values = typeof record.fieldValuesJson === 'string'
            ? JSON.parse(record.fieldValuesJson)
            : record.fieldValuesJson;
          const val = values?.[f.fieldName];
          const strVal = val != null ? String(val) : '';
          return (
            <MaskedFieldCell
              formDataId={String(record.id)}
              fieldName={f.fieldName}
              value={strVal}
              permission={perm}
              isSensitive={f.isSensitive}
            />
          );
        } catch {
          return '';
        }
      },
    };
  });

  const actionColumn = {
    title: '操作', key: 'actions', width: 120,
    render: (_: any, record: any) => (
      <Space>
        <Button size="small" onClick={() => navigate(`/form-data/${record.id}`)}>查看</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(String(record.id))}>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  };

  const columns = [...baseColumns, ...dynamicColumns, actionColumn];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>选择模板：</span>
        <Select
          style={{ width: 250 }}
          value={selectedTemplateId || undefined}
          onChange={(v) => { setSelectedTemplateId(v); setPage(1); setSelectedFilterField(''); setFilterFieldValue(''); }}
          options={templates.map((t) => ({ label: `${t.name} (v${t.version})`, value: t.id }))}
          placeholder="请选择模板"
        />
        <span style={{ marginLeft: 16 }}>筛选字段：</span>
        <Select
          style={{ width: 180 }}
          value={selectedFilterField || undefined}
          onChange={setSelectedFilterField}
          options={fields.map((f) => ({ label: f.fieldLabel, value: f.fieldName }))}
          placeholder="选择筛选字段"
          allowClear
        />
        <Input
          style={{ width: 200 }}
          placeholder="字段值"
          value={filterFieldValue}
          onChange={(e) => setFilterFieldValue(e.target.value)}
          onPressEnter={() => setPage(1)}
        />
        <Button type="primary" onClick={() => setPage(1)}>查询</Button>
        <Button onClick={() => { setSelectedFilterField(''); setFilterFieldValue(''); }}>重置</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出Excel
        </Button>
        {selectedTemplateId && (
          <BatchExportButton
            formDataIds={selectedRowKeys.map((k) => Number(k))}
            templateId={Number(selectedTemplateId)}
            buttonText="批量导出PDF"
          />
        )}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataList}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </div>
  );
}
