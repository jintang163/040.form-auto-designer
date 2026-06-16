import { useState, useRef } from 'react';
import { Upload, Button, Card, Radio, Space, Descriptions, Tag, message, Spin, Alert } from 'antd';
import { UploadOutlined, ScanOutlined } from '@ant-design/icons';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { ocrApi } from '@/services/api';
import type { OcrDocType, OcrResult, OcrFieldItem } from '@/types';

interface OcrImageUploaderProps {
  onFieldsRecognized?: (fields: OcrFieldItem[]) => void;
}

const DOC_OPTIONS: { label: string; value: OcrDocType; hint: string }[] = [
  { label: '身份证（人像面）', value: 'ID_CARD_FRONT', hint: '姓名/性别/民族/出生日期/住址/身份证号' },
  { label: '身份证（国徽面）', value: 'ID_CARD_BACK', hint: '签发机关/有效期限' },
  { label: '营业执照', value: 'BUSINESS_LICENSE', hint: '企业名称/信用代码/法人/注册资金/成立日期/经营范围' },
];

function OcrImageUploader({ onFieldsRecognized }: OcrImageUploaderProps) {
  const [docType, setDocType] = useState<OcrDocType>('ID_CARD_FRONT');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileRef = useRef<UploadFile | null>(null);

  const handleBeforeUpload = (file: File) => {
    const ok = /^image\/(jpeg|png|bmp)$/.test(file.type);
    if (!ok) {
      message.error('仅支持 JPG/PNG/BMP 图片');
      return Upload.LIST_IGNORE;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.originFileObj) {
      fileRef.current = info.file;
      const url = URL.createObjectURL(info.file.originFileObj);
      setPreviewUrl(url);
      setResult(null);
    }
  };

  const handleRecognize = async () => {
    if (!fileRef.current?.originFileObj) {
      message.warning('请先上传图片');
      return;
    }
    try {
      setLoading(true);
      const r = await ocrApi.recognize(fileRef.current.originFileObj, docType);
      if (!r.success) {
        message.error(r.message || '识别失败');
        return;
      }
      setResult(r);
      message.success(r.message || '识别完成');
      if (r.fieldItems && r.fieldItems.length > 0 && onFieldsRecognized) {
        onFieldsRecognized(r.fieldItems);
      }
    } catch (e: any) {
      message.error(e.message || '识别失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card size="small" title={<Space><ScanOutlined />OCR 证件识别</Space>} style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>选择证件类型</div>
            <Radio.Group
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              {DOC_OPTIONS.map((o) => (
                <Radio.Button key={o.value} value={o.value}>{o.label}</Radio.Button>
              ))}
            </Radio.Group>
            <div style={{ marginTop: 6, color: '#999', fontSize: 12 }}>
              {DOC_OPTIONS.find((o) => o.value === docType)?.hint}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minHeight: 200 }}>
              <Upload
                accept="image/jpeg,image/png,image/bmp"
                showUploadList={false}
                beforeUpload={handleBeforeUpload}
                onChange={handleChange}
              >
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
              {previewUrl && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{ maxWidth: 260, maxHeight: 200, borderRadius: 6, border: '1px solid #eee' }}
                  />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <Button
                type="primary"
                icon={<ScanOutlined />}
                onClick={handleRecognize}
                loading={loading}
                disabled={!fileRef.current}
              >
                {loading ? '识别中...' : '开始识别'}
              </Button>
              <Spin spinning={loading} tip="OCR 服务端识别中...">
                {result && (
                  <div style={{ marginTop: 8 }}>
                    {result.success ? (
                      <Tag color="green">识别成功</Tag>
                    ) : (
                      <Tag color="red">识别失败</Tag>
                    )}
                    {result.message && (
                      <Alert
                        type={result.success ? 'success' : 'error'}
                        message={result.message}
                        style={{ marginTop: 8 }}
                        showIcon
                      />
                    )}
                    {result.fields && (
                      <Descriptions
                        size="small"
                        bordered
                        column={1}
                        style={{ marginTop: 8 }}
                      >
                        {Object.entries(result.fields).map(([k, v]) => (
                          <Descriptions.Item key={k} label={k}>
                            <span style={{ color: '#1677ff', userSelect: 'all' }}>{v}</span>
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    )}
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default OcrImageUploader;
