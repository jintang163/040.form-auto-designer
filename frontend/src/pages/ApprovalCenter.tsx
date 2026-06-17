import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Tabs, Input, Space, message, Modal, Badge } from 'antd';
import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { workflowApi } from '@/services/api';
import type { WorkflowInstance } from '@/types';

const { TextArea } = Input;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  RUNNING: { color: 'processing', text: '审批中' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已驳回' },
  CANCELLED: { color: 'default', text: '已取消' },
};

export default function ApprovalCenter() {
  const [pendingList, setPendingList] = useState<WorkflowInstance[]>([]);
  const [submittedList, setSubmittedList] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState('');

  useEffect(() => {
    const uid = localStorage.getItem('userId') || 'demo_user';
    setCurrentUserId(uid);
  }, []);

  const fetchPending = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const data = await workflowApi.listMyPendingTasks(currentUserId);
      setPendingList(data || []);
    } catch {
      setPendingList([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const fetchSubmitted = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await workflowApi.listMySubmitted(currentUserId);
      setSubmittedList(data || []);
    } catch {
      setSubmittedList([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchPending();
    fetchSubmitted();
  }, [fetchPending, fetchSubmitted]);

  const handleAction = (record: WorkflowInstance, type: 'APPROVE' | 'REJECT') => {
    const task = record.tasks.find((t) => t.assignee === currentUserId && !t.action);
    if (!task) {
      message.warning('未找到待审批任务');
      return;
    }
    setActionType(type);
    setCurrentTaskId(task.taskId);
    setComment('');
    setActionModalVisible(true);
  };

  const submitAction = async () => {
    try {
      if (actionType === 'APPROVE') {
        await workflowApi.approve({ taskId: currentTaskId, action: 'APPROVE', comment });
        message.success('审批通过');
      } else {
        await workflowApi.reject({ taskId: currentTaskId, action: 'REJECT', comment });
        message.success('已驳回');
      }
      setActionModalVisible(false);
      fetchPending();
      fetchSubmitted();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '流程ID',
      dataIndex: 'processInstanceId',
      width: 120,
      render: (v: string) => v?.slice(0, 8) || '-',
    },
    {
      title: '模板ID',
      dataIndex: 'templateId',
      width: 80,
    },
    {
      title: '表单数据ID',
      dataIndex: 'formDataId',
      width: 100,
    },
    {
      title: '提交人',
      dataIndex: 'submitterId',
      width: 100,
    },
    {
      title: '当前审批人',
      dataIndex: 'currentAssignee',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = STATUS_MAP[status] || STATUS_MAP.RUNNING;
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '启动时间',
      dataIndex: 'startTime',
      width: 160,
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: WorkflowInstance) => {
        if (record.status !== 'RUNNING') return <Tag>已结束</Tag>;
        const isApprover = record.currentAssignee === currentUserId;
        return isApprover ? (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAction(record, 'APPROVE')}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleAction(record, 'REJECT')}
            >
              驳回
            </Button>
          </Space>
        ) : (
          <Tag color="processing">等待审批</Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <AuditOutlined />
            <span>审批中心</span>
          </Space>
        }
      >
        <Input
          placeholder="输入当前用户ID"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          style={{ width: 300, marginBottom: 16 }}
          addonBefore="用户ID"
        />

        <Tabs
          items={[
            {
              key: 'pending',
              label: (
                <Space>
                  <InboxOutlined />
                  <span>待我审批</span>
                  <Badge count={pendingList.length} size="small" />
                </Space>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={pendingList}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'submitted',
              label: (
                <Space>
                  <SendOutlined />
                  <span>我提交的</span>
                </Space>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={submittedList}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={actionType === 'APPROVE' ? '审批通过' : '驳回审批'}
        open={actionModalVisible}
        onOk={submitAction}
        onCancel={() => setActionModalVisible(false)}
        okText={actionType === 'APPROVE' ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: actionType === 'REJECT' }}
      >
        <div style={{ marginBottom: 16 }}>
          {actionType === 'APPROVE' ? (
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '8px 15px', color: '#52c41a' }}>
              确认通过此审批？
            </div>
          ) : (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '8px 15px', color: '#ff4d4f' }}>
              确认驳回此审批？驳回后流程将终止。
            </div>
          )}
        </div>
        <TextArea
          rows={4}
          placeholder="请输入审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </div>
  );
}
