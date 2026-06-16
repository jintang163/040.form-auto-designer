import { useState, useEffect } from 'react';
import { Timeline, Button, Space, Tag, Tooltip, Modal, Form, Input, message, Popconfirm, Select } from 'antd';
import {
  HistoryOutlined,
  DiffOutlined,
  RollbackOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { versionApi } from '@/services/api';
import type { FormVersion } from '@/types';

interface VersionTimelineProps {
  templateId: string;
  currentVersion: number;
  onRefresh?: () => void;
  onCompare?: (sourceVersion: number, targetVersion: number) => void;
}

export default function VersionTimeline({ templateId, currentVersion, onRefresh, onCompare }: VersionTimelineProps) {
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<number[]>([]);
  const [createForm] = Form.useForm();
  const [rollbackForm] = Form.useForm();

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await versionApi.getVersions(templateId);
      setVersions(data);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [templateId]);

  const handleCreateSnapshot = async () => {
    try {
      const values = await createForm.validateFields();
      await versionApi.createVersion(templateId, values.changeLog);
      message.success('版本快照创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      loadVersions();
      onRefresh?.();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      const values = await rollbackForm.validateFields();
      await versionApi.rollbackVersion(templateId, rollbackTarget, values.changeLog);
      message.success('版本回滚成功');
      setRollbackModalOpen(false);
      setRollbackTarget(null);
      rollbackForm.resetFields();
      loadVersions();
      onRefresh?.();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message);
    }
  };

  const handleSelectCompare = (version: number) => {
    if (selectedCompare.includes(version)) {
      setSelectedCompare(selectedCompare.filter((v) => v !== version));
    } else if (selectedCompare.length < 2) {
      const newSelected = [...selectedCompare, version].sort((a, b) => a - b);
      setSelectedCompare(newSelected);
      if (newSelected.length === 2) {
        onCompare?.(newSelected[0], newSelected[1]);
        setSelectedCompare([]);
        setCompareMode(false);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag icon={<HistoryOutlined />} color="blue">
            共 {versions.length} 个版本
          </Tag>
          {compareMode && (
            <Tag color="orange">
              对比模式：已选 {selectedCompare.length}/2，点击版本卡片选择
            </Tag>
          )}
        </Space>
        <Space>
          {compareMode ? (
            <Button size="small" onClick={() => { setCompareMode(false); setSelectedCompare([]); }}>
              取消对比
            </Button>
          ) : (
            <Button size="small" icon={<DiffOutlined />} onClick={() => setCompareMode(true)}>
              版本对比
            </Button>
          )}
          <Button size="small" type="primary" icon={<CameraOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建快照
          </Button>
        </Space>
      </div>

      <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
        <Timeline
          mode="left"
          items={versions.map((v) => ({
            color: v.version === currentVersion ? 'blue' : 'gray',
            dot: v.version === currentVersion ? <Tag color="blue">当前</Tag> : undefined,
            children: (
              <div
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: compareMode && selectedCompare.includes(v.version) ? '#fff7e6' : '#fff',
                  cursor: compareMode ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
                onClick={() => compareMode && handleSelectCompare(v.version)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space>
                    <strong>版本 v{v.version}</strong>
                    {v.version === currentVersion && <Tag color="processing">最新</Tag>}
                  </Space>
                  <span style={{ color: '#999', fontSize: 12 }}>{dayjs(v.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                </div>
                {v.changeLog && (
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{v.changeLog}</div>
                )}
                {!compareMode && (
                  <Space size="small">
                    <Tooltip title="与当前版本对比">
                      <Button
                        type="link"
                        size="small"
                        icon={<DiffOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (v.version !== currentVersion) {
                            onCompare?.(Math.min(v.version, currentVersion), Math.max(v.version, currentVersion));
                          }
                        }}
                        disabled={v.version === currentVersion}
                      >
                        对比
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title={`确认回滚至版本 v${v.version}？`}
                      description="回滚前会自动创建当前版本的快照"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        setRollbackTarget(v.version);
                        setRollbackModalOpen(true);
                      }}
                      disabled={v.version === currentVersion}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<RollbackOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        disabled={v.version === currentVersion}
                      >
                        回滚
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
            ),
          }))}
        />
      </div>

      <Modal
        title="创建版本快照"
        open={createModalOpen}
        onOk={handleCreateSnapshot}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        okText="创建"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="changeLog"
            label="版本说明"
            rules={[{ required: true, message: '请输入版本说明' }]}
          >
            <Input.TextArea rows={3} placeholder="描述本次变更的内容..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`回滚至版本 v${rollbackTarget ?? ''}`}
        open={rollbackModalOpen}
        onOk={handleRollback}
        onCancel={() => { setRollbackModalOpen(false); setRollbackTarget(null); rollbackForm.resetFields(); }}
        okText="确认回滚"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          回滚前系统会自动保存当前版本的快照，您可以随时恢复。
        </p>
        <Form form={rollbackForm} layout="vertical">
          <Form.Item name="changeLog" label="回滚说明">
            <Input.TextArea rows={2} placeholder="可选，说明回滚原因..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
