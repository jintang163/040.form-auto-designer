import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Spin,
  message,
  Button,
  Input,
  Modal,
  Tag,
  Space,
  Tooltip,
  Alert,
  Avatar,
  Progress,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { shareApi, templateApi, fieldApi, formDataApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SmartSchemaPreview, { type SmartSchemaPreviewRef } from '@/components/SmartSchemaPreview';
import CollaboratorsPanel from '@/components/CollaboratorsPanel';
import { useCollaboration } from '@/hooks/useCollaboration';
import { getOrCreateSubmitterId } from '@/utils/submitterId';
import type { FormField, FormSchema, FormShare } from '@/types';

export default function CollaborationFill() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const schemaPreviewRef = useRef<SmartSchemaPreviewRef>(null);
  const isInitializedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [shareInfo, setShareInfo] = useState<FormShare | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [syncingFields, setSyncingFields] = useState<Set<string>>(new Set());

  const userName = useMemo(() => {
    const stored = localStorage.getItem('collabUserName');
    return stored || `访客_${Math.random().toString(36).substring(2, 6)}`;
  }, []);

  const userId = useMemo(() => getOrCreateSubmitterId(), []);

  const {
    connected,
    onlineUsers,
    fieldLocks,
    fieldValues: remoteFieldValues,
    sessionId,
    avatarColor,
    connect,
    disconnect,
    updateCursor,
    lockField,
    unlockField,
    updateFieldValue,
    requestSync,
    isFieldLocked,
    getFieldLockInfo,
  } = useCollaboration({
    shareCode: shareCode || '',
    userId,
    userName,
  });

  useEffect(() => {
    if (!shareCode) return;
    validateShare();
    return () => {
      disconnect();
    };
  }, [shareCode, disconnect]);

  const validateShare = async () => {
    setValidating(true);
    try {
      const share = await shareApi.getShare(shareCode!);
      if (!share) {
        message.error('分享链接无效或已过期');
        setValidating(false);
        setLoading(false);
        return;
      }

      setShareInfo(share);

      if (share.hasPassword) {
        setPasswordModalVisible(true);
        setValidating(false);
        return;
      }

      await loadTemplate(share.templateId);
      connect();
    } catch (e: any) {
      message.error(e.message || '加载分享信息失败');
    } finally {
      setValidating(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      message.warning('请输入访问密码');
      return;
    }

    try {
      const valid = await shareApi.validateShare(shareCode!, password);
      if (!valid) {
        message.error('密码错误');
        return;
      }

      setPasswordModalVisible(false);
      if (shareInfo) {
        await loadTemplate(shareInfo.templateId);
        connect();
      }
    } catch (e: any) {
      message.error(e.message || '验证失败');
    }
  };

  const loadTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const [template, fs] = await Promise.all([
        templateApi.getTemplate(templateId),
        fieldApi.getFields(templateId),
      ]);

      setTemplateName(template.name);
      setFields(fs);

      const s = generateFormSchema(fs.map((f) => ({ ...f })));
      try {
        const saved = JSON.parse(template.schemaJson);
        if (saved?.properties && Object.keys(saved.properties).length > 0) {
          setSchema(saved);
        } else {
          setSchema(s);
        }
      } catch {
        setSchema(s);
      }

      isInitializedRef.current = false;
    } catch (e: any) {
      message.error(e.message || '加载表单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected || !schemaPreviewRef.current || isInitializedRef.current) return;

    const timer = setTimeout(() => {
      if (Object.keys(remoteFieldValues).length > 0 && !isInitializedRef.current) {
        schemaPreviewRef.current?.setValues(remoteFieldValues);
        setFormValues(remoteFieldValues);
        isInitializedRef.current = true;
        message.info('已同步协作填写进度');
      }
      requestSync();
    }, 500);

    return () => clearTimeout(timer);
  }, [connected, remoteFieldValues, requestSync]);

  useEffect(() => {
    if (!schemaPreviewRef.current || !isInitializedRef.current) return;

    const fieldsToUpdate: Record<string, any> = {};
    const newSyncingFields = new Set<string>();

    Object.entries(remoteFieldValues).forEach(([fieldName, value]) => {
      const currentValue = formValues[fieldName];
      const stringifiedCurrent = JSON.stringify(currentValue);
      const stringifiedRemote = JSON.stringify(value);

      if (stringifiedCurrent !== stringifiedRemote) {
        fieldsToUpdate[fieldName] = value;
        newSyncingFields.add(fieldName);
      }
    });

    if (Object.keys(fieldsToUpdate).length > 0) {
      Object.entries(fieldsToUpdate).forEach(([fieldName, value]) => {
        schemaPreviewRef.current?.setFieldValue(fieldName, value);
      });

      setFormValues((prev) => ({ ...prev, ...fieldsToUpdate }));
      setSyncingFields(newSyncingFields);

      setTimeout(() => {
        setSyncingFields(new Set());
      }, 500);
    }
  }, [remoteFieldValues, formValues]);

  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      const field = fields.find((f) => f.fieldName === fieldName);
      updateCursor(fieldName, field?.fieldLabel);

      if (shareInfo?.allowEdit && !isFieldLocked(fieldName)) {
        lockField(fieldName, field?.fieldLabel);
      }
    },
    [fields, updateCursor, lockField, shareInfo?.allowEdit, isFieldLocked]
  );

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      if (shareInfo?.allowEdit) {
        unlockField(fieldName);
      }
    },
    [unlockField, shareInfo?.allowEdit]
  );

  const handleFieldValueChange = useCallback(
    (fieldName: string, value: any) => {
      if (!shareInfo?.allowEdit) return;

      setFormValues((prev) => ({ ...prev, [fieldName]: value }));
      updateFieldValue(fieldName, value);
    },
    [shareInfo?.allowEdit, updateFieldValue]
  );

  const handleSubmit = async (values: Record<string, any>) => {
    if (!shareCode || !shareInfo) return;

    try {
      const result = await formDataApi.submitFormData(
        shareInfo.templateId,
        values,
        userId
      );
      message.success('提交成功');
      setSubmitted(true);
      disconnect();
    } catch (e: any) {
      message.error(e.message || '提交失败');
    }
  };

  const progress = useMemo(() => {
    const totalFields = fields.length;
    if (totalFields === 0) return 0;
    const filledFields = Object.values(formValues).filter(
      (v) => v !== undefined && v !== null && v !== ''
    ).length;
    return Math.round((filledFields / totalFields) * 100);
  }, [fields, formValues]);

  const filledCount = useMemo(
    () => Object.values(formValues).filter((v) => v !== undefined && v !== null && v !== '').length,
    [formValues]
  );

  if (validating || (loading && !passwordModalVisible)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!shareInfo && !passwordModalVisible) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <Alert
          type="error"
          message="分享链接无效"
          description="该分享链接不存在或已过期，请联系分享者获取新的链接。"
          showIcon
          style={{ maxWidth: 500, margin: '0 auto' }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: '16px 24px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              返回
            </Button>
            <div>
              <h3 style={{ margin: 0 }}>{templateName}</h3>
              <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag color="green" icon={<ShareAltOutlined />}>
                  协作填写
                </Tag>
                <Tag color={connected ? 'processing' : 'default'}>
                  {connected ? '已连接' : '未连接'}
                </Tag>
                {shareInfo?.hasPassword && (
                  <Tag color="orange" icon={<LockOutlined />}>
                    密码保护
                  </Tag>
                )}
                {syncingFields.size > 0 && (
                  <Tag color="blue" icon={<EditOutlined />}>
                    正在同步...
                  </Tag>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontSize: 13, color: '#666' }}>
                填写进度: <strong style={{ color: '#333' }}>{filledCount}</strong>/{fields.length}
              </span>
              <div style={{ width: 120 }}>
                <Progress
                  percent={progress}
                  size="small"
                  showInfo={false}
                  strokeColor={{ from: '#1890ff', to: '#52c41a' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tooltip title={`用户: ${userName}`}>
                <Avatar style={{ backgroundColor: avatarColor }} icon={<UserOutlined />} />
              </Tooltip>
              <span style={{ color: '#666', fontSize: 13 }}>
                {onlineUsers.length} 人在线
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {submitted ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 48,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }}>
                  ✓
                </div>
                <h3 style={{ marginBottom: 8 }}>提交成功</h3>
                <p style={{ color: '#666' }}>感谢您的填写！</p>
                <Button type="primary" onClick={() => window.location.reload()}>
                  重新填写
                </Button>
              </div>
            ) : (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 24,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <SmartSchemaPreview
                  ref={schemaPreviewRef}
                  schema={schema}
                  fields={fields}
                  editable={shareInfo?.allowEdit}
                  templateId={shareInfo?.templateId}
                  onSubmit={handleSubmit}
                  onFieldFocus={handleFieldFocus}
                  onFieldBlur={handleFieldBlur}
                  onFieldValueChange={handleFieldValueChange}
                  showValidation={true}
                  showAddressComplete={true}
                  collaborationEnabled={true}
                  onlineUsers={onlineUsers}
                  fieldLocks={fieldLocks}
                  currentSessionId={sessionId}
                />
              </div>
            )}
          </div>

          <div style={{ width: 280, flexShrink: 0 }}>
            <CollaboratorsPanel
              onlineUsers={onlineUsers}
              currentSessionId={sessionId}
            />

            {Object.keys(fieldLocks).length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  background: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  border: '1px solid #f0f0f0',
                }}
              >
                <div style={{ marginBottom: 12, fontWeight: 500 }}>
                  <LockOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  已锁定字段
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.values(fieldLocks).map((lock) => (
                    <div
                      key={lock.fieldName}
                      style={{
                        padding: '6px 8px',
                        background: lock.lockedBy === sessionId ? '#e6f7ff' : '#fffbe6',
                        borderRadius: 4,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Avatar
                        size="small"
                        style={{ backgroundColor: lock.avatarColor }}
                        icon={<UserOutlined />}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lock.fieldLabel || lock.fieldName}
                      </span>
                      <Tooltip title={lock.lockedByName}>
                        <Tag color={lock.lockedBy === sessionId ? 'blue' : 'orange'} style={{ margin: 0 }}>
                          {lock.lockedBy === sessionId ? '我' : lock.lockedByName}
                        </Tag>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                background: '#fff',
                borderRadius: 8,
                padding: 12,
                border: '1px solid #f0f0f0',
              }}
            >
              <div style={{ marginBottom: 12, fontWeight: 500 }}>
                <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                填写进度
              </div>
              <Progress
                type="circle"
                percent={progress}
                size={80}
                style={{ display: 'block', margin: '0 auto 12px' }}
              />
              <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
                已填写 <strong>{filledCount}</strong> / {fields.length} 个字段
              </div>
              {progress === 100 && (
                <Tag color="success" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
                  填写完成，可以提交啦！
                </Tag>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                background: '#e6f7ff',
                borderRadius: 8,
                padding: 12,
                border: '1px solid #91d5ff',
                fontSize: 12,
                color: '#002766',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                💡 协作提示
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li style={{ marginBottom: 4 }}>
                  可以看到其他协作者正在编辑的字段
                </li>
                <li style={{ marginBottom: 4 }}>
                  字段被锁定时，他人无法编辑，避免冲突
                </li>
                <li style={{ marginBottom: 4 }}>
                  填写内容实时同步，所有人都能看到进度
                </li>
                <li>
                  失焦后字段会自动解锁，方便他人编辑
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="请输入访问密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => {}}
        okText="确认"
        cancelText="取消"
        closable={false}
        maskClosable={false}
      >
        <Input.Password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入分享密码"
          size="large"
          onPressEnter={handlePasswordSubmit}
        />
      </Modal>
    </div>
  );
}
