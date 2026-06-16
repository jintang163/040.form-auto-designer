import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message, Input, Select, Tooltip, Tag, Space, InputNumber } from 'antd';
import { BulbOutlined, ReloadOutlined } from '@ant-design/icons';
import { templateApi, formDataApi, fieldApi, recommendApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SchemaPreview from '@/components/SchemaPreview';
import type { FormField, FormSchema, FieldRecommendation } from '@/types';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  USER_HISTORY: { label: '历史', color: 'blue' },
  COLLABORATIVE: { label: '协同', color: 'green' },
  GLOBAL: { label: '热门', color: 'orange' },
};

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, FieldRecommendation>>({});
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [submitterId] = useState(() => localStorage.getItem('fd_submitter_id') || 'current_user');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      templateApi.getTemplate(id),
      fieldApi.getFields(id),
    ])
      .then(([template, fs]) => {
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
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const loadRecommendations = useCallback(() => {
    if (!id) return;
    setRecommendLoading(true);
    recommendApi.getFormRecommendations(id, submitterId)
      .then((data) => {
        const map: Record<string, FieldRecommendation> = {};
        (data.fields || []).forEach((f) => {
          map[f.fieldName] = f;
        });
        setRecommendations(map);
      })
      .catch((e) => {
        console.warn('加载推荐失败:', e.message);
      })
      .finally(() => setRecommendLoading(false));
  }, [id, submitterId]);

  useEffect(() => {
    if (fields.length > 0 && id) {
      loadRecommendations();
    }
  }, [fields.length, id]);

  const handleSubmit = async (values: Record<string, any>) => {
    if (!id) return;
    try {
      await formDataApi.submitFormData(id, values);
      message.success('提交成功');
      loadRecommendations();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const applyRecommendation = (fieldName: string, value: string) => {
    message.info(`已选择推荐值: ${value}`);
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{templateName} - 表单预览</h3>
        <Space>
          <Tooltip title="刷新智能推荐">
            <Button
              icon={<ReloadOutlined />}
              loading={recommendLoading}
              onClick={loadRecommendations}
            >
              刷新推荐
            </Button>
          </Tooltip>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </Space>
      </div>

      {Object.keys(recommendations).length > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', background: '#f6ffed',
          border: '1px solid #b7eb8f', borderRadius: 8,
        }}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#52c41a' }}>
            <BulbOutlined /> 智能推荐
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.values(recommendations).map((rec) => (
              <div key={rec.fieldName} style={{
                padding: '4px 12px', background: '#fff', borderRadius: 4,
                border: '1px solid #d9d9d9', fontSize: 13,
              }}>
                <span style={{ color: '#666', marginRight: 4 }}>{rec.fieldLabel}:</span>
                <span style={{ fontWeight: 500 }}>{rec.recommendedValue}</span>
                <Tag
                  color={SOURCE_LABELS[rec.items?.[0]?.source]?.color || 'default'}
                  style={{ marginLeft: 4, fontSize: 11 }}
                >
                  {SOURCE_LABELS[rec.items?.[0]?.source]?.label || '推荐'}
                </Tag>
                {rec.confidence != null && (
                  <span style={{ color: '#999', fontSize: 11, marginLeft: 2 }}>
                    {Math.round(rec.confidence * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <SchemaPreview schema={schema} editable onSubmit={handleSubmit} />
        </div>

        {Object.keys(recommendations).length > 0 && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{
              background: '#fafafa', borderRadius: 8, padding: 16,
              border: '1px solid #f0f0f0', maxHeight: 600, overflowY: 'auto',
            }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                <BulbOutlined style={{ color: '#faad14' }} /> 推荐候选值
              </h4>
              {Object.values(recommendations).map((rec) => (
                <div key={rec.fieldName} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                    {rec.fieldLabel}
                    {rec.confidence != null && (
                      <span style={{ float: 'right', color: '#999', fontSize: 11 }}>
                        置信度 {Math.round(rec.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(rec.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          background: idx === 0 ? '#e6f7ff' : '#fff',
                          border: idx === 0 ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                          borderRadius: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 13,
                        }}
                        onClick={() => applyRecommendation(rec.fieldName, item.value)}
                      >
                        <span>{item.value}</span>
                        <Space size={4}>
                          <Tag
                            color={SOURCE_LABELS[item.source]?.color || 'default'}
                            style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}
                          >
                            {SOURCE_LABELS[item.source]?.label || item.source}
                          </Tag>
                          {item.frequency > 0 && (
                            <span style={{ color: '#999', fontSize: 10 }}>×{item.frequency}</span>
                          )}
                        </Space>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
