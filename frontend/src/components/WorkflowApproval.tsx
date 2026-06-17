import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Steps,
  Button,
  Tag,
  Timeline,
  Modal,
  Input,
  message,
  Descriptions,
  Empty,
  Spin,
  Space,
  Badge,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  AuditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { workflowApi } from '@/services/api';
import type { WorkflowInstance, WorkflowTask } from '@/types';

const { TextArea } = Input;

interface WorkflowApprovalProps {
  formDataId?: string;
  templateId?: string;
  currentUserId?: string;
  onStatusChange?: (status: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  RUNNING: { color: 'processing', text: '审批中', icon: <ClockCircleOutlined /> },
  APPROVED: { color: 'success', text: '已通过', icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'error', text: '已驳回', icon: <CloseCircleOutlined /> },
  CANCELLED: { color: 'default', text: '已取消', icon: <ExclamationCircleOutlined /> },
};

export default function WorkflowApproval({
  formDataId,
  templateId,
  currentUserId,
  onStatusChange,
}: WorkflowApprovalProps) {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string>('');

  const fetchInstance = useCallback(async () => {
    if (!formDataId) return;
    setLoading(true);
    try {
      const data = await workflowApi.getInstanceByFormDataId(formDataId);
      setInstance(data);
      onStatusChange?.(data?.status || '');
    } catch {
      setInstance(null);
    } finally {
      setLoading(false);
    }
  }, [formDataId, onStatusChange]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  const isCurrentApprover = () => {
    if (!instance || !currentUserId) return false;
    return instance.currentAssignee === currentUserId && instance.status === 'RUNNING';
  };

  const getCurrentTask = (): WorkflowTask | undefined => {
    if (!instance || !currentUserId) return undefined;
    return instance.tasks.find(
      (t) => t.assignee === currentUserId && !t.action
    );
  };

  const handleAction = (type: 'APPROVE' | 'REJECT') => {
    const task = getCurrentTask();
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
      const request = {
        taskId: currentTaskId,
        action: actionType,
        comment,
      };
      if (actionType === 'APPROVE') {
        await workflowApi.approve(request);
        message.success('审批通过');
      } else {
        await workflowApi.reject(request);
        message.success('已驳回');
      }
      setActionModalVisible(false);
      fetchInstance();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <Card>
        <Spin tip="加载审批流程..." />
      </Card>
    );
  }

  if (!instance) {
    return (
      <Card>
        <Empty description="暂无审批流程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[instance.status] || STATUS_CONFIG.RUNNING;
  const completedTasks = instance.tasks.filter((t) => t.action);
  const totalLevels = instance.tasks.length;

  return (
    <Card
      title={
        <Space>
          <AuditOutlined />
          <span>审批流程</span>
          <Tag color={statusConfig.color} icon={statusConfig.icon}>
            {statusConfig.text}
          </Tag>
        </Space>
      }
      extra={
        isCurrentApprover() && (
          <Space>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAction('APPROVE')}>
              通过
            </Button>
            <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAction('REJECT')}>
              驳回
            </Button>
          </Space>
        )
      }
    >
      <Steps
        current={completedTasks.length}
        size="small"
        style={{ marginBottom: 24 }}
        items={instance.tasks.map((task, idx) => ({
          title: task.taskName,
          description: (
            <div>
              <div>
                <UserOutlined /> {task.assignee || '待分配'}
              </div>
              {task.action === 'APPROVE' && (
                <Tag color="success" style={{ marginTop: 4 }}>
                  已通过
                </Tag>
              )}
              {task.action === 'REJECT' && (
                <Tag color="error" style={{ marginTop: 4 }}>
                  已驳回
                </Tag>
              )}
              {!task.action && task.assignee === currentUserId && (
                <Tag color="warning" style={{ marginTop: 4 }}>
                  待我审批
                </Tag>
              )}
              {!task.action && task.assignee !== currentUserId && (
                <Tag color="processing" style={{ marginTop: 4 }}>
                  待审批
                </Tag>
              )}
            </div>
          ),
        }))}
      />

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="流程ID">{instance.processInstanceId?.slice(0, 8)}</Descriptions.Item>
        <Descriptions.Item label="提交人">{instance.submitterId}</Descriptions.Item>
        <Descriptions.Item label="当前审批人">
          {instance.currentAssignee ? (
            <Badge status="processing" text={instance.currentAssignee} />
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="审批级别">
          {instance.currentLevel} / {totalLevels}
        </Descriptions.Item>
        <Descriptions.Item label="启动时间">{instance.startTime}</Descriptions.Item>
        <Descriptions.Item label="结束时间">{instance.endTime || '-'}</Descriptions.Item>
      </Descriptions>

      <Card size="small" title="审批记录" style={{ marginTop: 8 }}>
        <Timeline
          items={instance.tasks
            .filter((t) => t.action)
            .map((task) => ({
              color: task.action === 'APPROVE' ? 'green' : 'red',
              children: (
                <div>
                  <div>
                    <strong>{task.assignee}</strong>{' '}
                    <Tag color={task.action === 'APPROVE' ? 'success' : 'error'}>
                      {task.action === 'APPROVE' ? '通过' : '驳回'}
                    </Tag>
                  </div>
                  {task.comment && <div style={{ color: '#666', marginTop: 4 }}>{task.comment}</div>}
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {task.completedAt || ''}
                  </div>
                </div>
              ),
            }))}
        />
        {instance.tasks.filter((t) => t.action).length === 0 && (
          <Empty description="暂无审批记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
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
            <Alert type="success" message="确认通过此审批？" />
          ) : (
            <Alert type="error" message="确认驳回此审批？驳回后流程将终止。" />
          )}
        </div>
        <TextArea
          rows={4}
          placeholder="请输入审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </Card>
  );
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const bgColor = type === 'success' ? '#f6ffed' : '#fff2f0';
  const borderColor = type === 'success' ? '#b7eb8f' : '#ffccc7';
  const textColor = type === 'success' ? '#52c41a' : '#ff4d4f';
  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 4, padding: '8px 15px', color: textColor }}>
      {message}
    </div>
  );
}
