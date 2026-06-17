import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Switch,
  Select,
  Button,
  Space,
  QRCode,
  message,
  Tag,
  Tooltip,
} from 'antd';
import {
  ShareAltOutlined,
  LinkOutlined,
  QrcodeOutlined,
  CopyOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { shareApi } from '@/services/api';
import type { FormShare } from '@/types';

interface FormShareModalProps {
  open: boolean;
  templateId: string;
  templateName: string;
  onClose: () => void;
}

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export default function FormShareModal({ open, templateId, templateName, onClose }: FormShareModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<FormShare[]>([]);
  const [currentShare, setCurrentShare] = useState<FormShare | null>(null);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    if (open && templateId) {
      loadShares();
    }
  }, [open, templateId]);

  const loadShares = async () => {
    try {
      const list = await shareApi.listShares(templateId);
      setShares(list || []);
      if (list && list.length > 0) {
        setCurrentShare(list[0]);
      }
    } catch (e: any) {
      console.error('加载分享列表失败:', e);
    }
  };

  const handleCreateShare = async (values: any) => {
    setLoading(true);
    try {
      const share = await shareApi.createShare({
        templateId: Number(templateId),
        shareType: values.shareType || 'VIEW',
        expireHours: values.expireHours,
        password: values.password,
        allowEdit: values.allowEdit,
      });
      setCurrentShare(share);
      setShares([share, ...shares]);
      setActiveTab('link');
      message.success('分享链接已生成');
    } catch (e: any) {
      message.error(e.message || '创建分享失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareCode: string) => {
    try {
      await shareApi.revokeShare(shareCode);
      message.success('已撤销分享');
      loadShares();
      if (currentShare?.shareCode === shareCode) {
        setCurrentShare(null);
      }
    } catch (e: any) {
      message.error(e.message || '撤销分享失败');
    }
  };

  const handleRefresh = async (shareCode: string) => {
    try {
      const newShare = await shareApi.refreshShareCode(shareCode);
      setCurrentShare(newShare);
      message.success('分享码已刷新');
      loadShares();
    } catch (e: any) {
      message.error(e.message || '刷新分享码失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          <span>分享表单 - {templateName}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <LinkOutlined /> 创建分享
            </span>
          }
          key="create"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateShare}
            initialValues={{
              shareType: 'VIEW',
              allowEdit: false,
              expireHours: 24,
            }}
          >
            <Form.Item label="分享类型" name="shareType">
              <Select>
                <Option value="VIEW">仅查看</Option>
                <Option value="EDIT">可编辑</Option>
                <Option value="COLLAB">协作填写</Option>
              </Select>
            </Form.Item>

            <Form.Item label="有效期" name="expireHours">
              <Select>
                <Option value={1}>1 小时</Option>
                <Option value={24}>1 天</Option>
                <Option value={72}>3 天</Option>
                <Option value={168}>7 天</Option>
                <Option value={0}>永久有效</Option>
              </Select>
            </Form.Item>

            <Form.Item label="访问密码" name="password">
              <Input.Password placeholder="不设置则无需密码即可访问" allowClear />
            </Form.Item>

            <Form.Item label="允许编辑" name="allowEdit" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                生成分享链接
              </Button>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane
          tab={
            <span>
              <QrcodeOutlined /> 分享链接
            </span>
          }
          key="link"
        >
          {currentShare ? (
            <div>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: 16,
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                  }}
                >
                  <QRCode value={currentShare.shareUrl} size={160} />
                </div>
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  扫描二维码或复制链接访问
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  background: '#fafafa',
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LinkOutlined style={{ color: '#1890ff' }} />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                    }}
                  >
                    {currentShare.shareUrl}
                  </span>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(currentShare.shareUrl)}
                  >
                    复制
                  </Button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="blue">
                    {currentShare.shareType === 'VIEW'
                      ? '仅查看'
                      : currentShare.shareType === 'EDIT'
                      ? '可编辑'
                      : '协作填写'}
                  </Tag>
                  {currentShare.hasPassword ? (
                    <Tag color="orange" icon={<LockOutlined />}>
                      有密码
                    </Tag>
                  ) : (
                    <Tag color="green" icon={<UnlockOutlined />}>
                      无密码
                    </Tag>
                  )}
                  {currentShare.allowEdit && (
                    <Tag color="purple">允许编辑</Tag>
                  )}
                  {currentShare.expireAt && (
                    <Tag color="default" icon={<ClockCircleOutlined />}>
                      {new Date(currentShare.expireAt).toLocaleString()}
                    </Tag>
                  )}
                </div>
              </div>

              <Space>
                <Button onClick={() => handleRefresh(currentShare.shareCode)}>
                  刷新分享码
                </Button>
                <Button danger onClick={() => handleRevoke(currentShare.shareCode)}>
                  撤销分享
                </Button>
              </Space>

              {shares.length > 1 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ marginBottom: 12 }}>历史分享记录</h4>
                  {shares.slice(1).map((share) => (
                    <div
                      key={share.shareCode}
                      style={{
                        padding: '8px 12px',
                        background: '#fafafa',
                        borderRadius: 4,
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: 'monospace' }}>{share.shareCode}</span>
                        <Tag style={{ marginLeft: 8 }} size="small">
                          {share.shareType}
                        </Tag>
                      </div>
                      <Space size="small">
                        <Button size="small" onClick={() => setCurrentShare(share)}>
                          查看
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => handleRevoke(share.shareCode)}
                        >
                          撤销
                        </Button>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <QrcodeOutlined style={{ fontSize: 48, marginBottom: 12 }} />
              <div>暂无分享链接，请先创建分享</div>
            </div>
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
}
