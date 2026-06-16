import { useState, useEffect } from 'react';
import { Modal, Tabs, Table, Tag, Space, Empty, Spin, message } from 'antd';
import { PlusOutlined, MinusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { versionApi } from '@/services/api';
import type { VersionCompareResult, FieldDiff } from '@/types';

interface VersionDiffModalProps {
  open: boolean;
  templateId: string;
  sourceVersion: number;
  targetVersion: number;
  onClose: () => void;
}

function formatJsonValue(value?: string): string {
  if (!value) return '-';
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
    return String(parsed);
  } catch {
    return value;
  }
}

function DiffTable({ data, type }: { data: FieldDiff[]; type: 'ADDED' | 'REMOVED' | 'MODIFIED' }) {
  const config = {
    ADDED: {
      icon: <PlusOutlined style={{ color: '#52c41a' }} />,
      color: 'green',
      text: '新增',
      columns: [
        { title: '字段名', dataIndex: 'fieldName', key: 'fieldName', width: 160 },
        { title: '字段标签', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 160 },
        {
          title: '字段配置',
          dataIndex: 'newValue',
          key: 'newValue',
          render: (v: string) => (
            <pre style={{
              background: '#f6ffed',
              padding: 8,
              borderRadius: 4,
              maxHeight: 200,
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>{formatJsonValue(v)}</pre>
          ),
        },
      ],
    },
    REMOVED: {
      icon: <MinusOutlined style={{ color: '#ff4d4f' }} />,
      color: 'red',
      text: '删除',
      columns: [
        { title: '字段名', dataIndex: 'fieldName', key: 'fieldName', width: 160 },
        { title: '字段标签', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 160 },
        {
          title: '原字段配置',
          dataIndex: 'oldValue',
          key: 'oldValue',
          render: (v: string) => (
            <pre style={{
              background: '#fff2f0',
              padding: 8,
              borderRadius: 4,
              maxHeight: 200,
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>{formatJsonValue(v)}</pre>
          ),
        },
      ],
    },
    MODIFIED: {
      icon: <EditOutlined style={{ color: '#faad14' }} />,
      color: 'orange',
      text: '修改',
      columns: [
        { title: '字段名', dataIndex: 'fieldName', key: 'fieldName', width: 140 },
        { title: '字段标签', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 140 },
        {
          title: '变更前',
          dataIndex: 'oldValue',
          key: 'oldValue',
          width: '35%',
          render: (v: string) => (
            <pre style={{
              background: '#fff2f0',
              padding: 8,
              borderRadius: 4,
              maxHeight: 150,
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>{formatJsonValue(v)}</pre>
          ),
        },
        {
          title: '变更后',
          dataIndex: 'newValue',
          key: 'newValue',
          width: '35%',
          render: (v: string) => (
            <pre style={{
              background: '#f6ffed',
              padding: 8,
              borderRadius: 4,
              maxHeight: 150,
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>{formatJsonValue(v)}</pre>
          ),
        },
      ],
    },
  }[type];

  if (data.length === 0) {
    return <Empty description={`暂无${config.text}的字段`} />;
  }

  return (
    <Table
      rowKey={(r, i) => `${r.fieldName}-${i}`}
      columns={config.columns}
      dataSource={data}
      pagination={false}
      size="small"
    />
  );
}

export default function VersionDiffModal({ open, templateId, sourceVersion, targetVersion, onClose }: VersionDiffModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VersionCompareResult | null>(null);

  useEffect(() => {
    if (open && templateId && sourceVersion && targetVersion) {
      loadDiff();
    }
  }, [open, templateId, sourceVersion, targetVersion]);

  const loadDiff = async () => {
    try {
      setLoading(true);
      const data = await versionApi.compareVersions(templateId, sourceVersion, targetVersion);
      setResult(data);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tabItems = result
    ? [
        {
          key: 'modified',
          label: (
            <Space>
              <Tag color="orange" icon={<EditOutlined />}>
                修改 {result.modifiedFields.length}
              </Tag>
            </Space>
          ),
          children: <DiffTable data={result.modifiedFields} type="MODIFIED" />,
        },
        {
          key: 'added',
          label: (
            <Space>
              <Tag color="green" icon={<PlusOutlined />}>
                新增 {result.addedFields.length}
              </Tag>
            </Space>
          ),
          children: <DiffTable data={result.addedFields} type="ADDED" />,
        },
        {
          key: 'removed',
          label: (
            <Space>
              <Tag color="red" icon={<MinusOutlined />}>
                删除 {result.removedFields.length}
              </Tag>
            </Space>
          ),
          children: <DiffTable data={result.removedFields} type="REMOVED" />,
        },
      ]
    : [];

  return (
    <Modal
      title={
        <Space>
          <span>版本对比</span>
          {result && (
            <Tag color="blue">
              v{sourceVersion} → v{targetVersion}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      {result && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
          <Space size="large" split={<span style={{ color: '#999' }}>→</span>}>
            <div>
              <div style={{ fontWeight: 500 }}>版本 v{result.sourceVersion.version}</div>
              <div style={{ color: '#999', fontSize: 12 }}>
                {dayjs(result.sourceVersion.createdAt).format('YYYY-MM-DD HH:mm')}
                {result.sourceVersion.changeLog && ` · ${result.sourceVersion.changeLog}`}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>版本 v{result.targetVersion.version}</div>
              <div style={{ color: '#999', fontSize: 12 }}>
                {dayjs(result.targetVersion.createdAt).format('YYYY-MM-DD HH:mm')}
                {result.targetVersion.changeLog && ` · ${result.targetVersion.changeLog}`}
              </div>
            </div>
          </Space>
        </div>
      )}
      <Spin spinning={loading}>
        {result ? (
          <Tabs defaultActiveKey="modified" items={tabItems} />
        ) : (
          <Empty description="暂无对比数据" />
        )}
      </Spin>
    </Modal>
  );
}
