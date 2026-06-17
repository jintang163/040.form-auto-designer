import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message, Tooltip, Tag, Space, Alert } from 'antd';
import {
  BulbOutlined,
  ReloadOutlined,
  UserOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  AuditOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  templateApi,
  formDataApi,
  fieldApi,
  recommendApi,
  aiRecommendApi,
  validationApi,
  workflowApi,
} from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SmartSchemaPreview, { type SmartSchemaPreviewRef } from '@/components/SmartSchemaPreview';
import WorkflowApproval from '@/components/WorkflowApproval';
import FormShareModal from '@/components/FormShareModal';
import { getOrCreateSubmitterId } from '@/utils/submitterId';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/contexts/I18nContext';
import type {
  FormField,
  FormSchema,
  FieldRecommendation,
  ContextRecommendation,
} from '@/types';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  USER_HISTORY: { label: '历史', color: 'blue' },
  COLLABORATIVE: { label: '协同', color: 'green' },
  GLOBAL: { label: '热门', color: 'orange' },
};

const AI_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  ID_CARD_PARSE: { label: '身份证解析', color: 'purple' },
  PHONE_PREFIX: { label: '手机号分析', color: 'cyan' },
  NAME_PATTERN: { label: '姓名分析', color: 'magenta' },
  COMPANY_KEYWORD: { label: '公司识别', color: 'geekblue' },
  PROVINCE_CAPITAL: { label: '省份关联', color: 'lime' },
  EMAIL_PREFIX: { label: '邮箱分析', color: 'volcano' },
  ADDRESS_ZIPCODE: { label: '地址解析', color: 'gold' },
};

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const schemaPreviewRef = useRef<SmartSchemaPreviewRef>(null);
  const { language, loadTranslations } = useI18n();
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, FieldRecommendation>>({});
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const submitterId = useRef<string>(getOrCreateSubmitterId());

  const formValuesRef = useRef<Record<string, any>>({});
  const [contextRecommendations, setContextRecommendations] = useState<ContextRecommendation[]>([]);
  const [contextRecLoading, setContextRecLoading] = useState(false);
  const [enableSmartValidation, setEnableSmartValidation] = useState(true);
  const [enableAddressComplete, setEnableAddressComplete] = useState(true);
  const [submittedFormDataId, setSubmittedFormDataId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>('');
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [hasWorkflow, setHasWorkflow] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const fieldMapRef = useRef<Record<string, FormField>>({});

  const loadTemplateData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [template, fs, wfProcess] = await Promise.all([
        templateApi.getTemplate(id),
        fieldApi.getFieldsWithTranslation(id, language),
        workflowApi.getProcessByTemplateId(id),
      ]);
      setTemplateName(template.name);
      setFields(fs);
      setHasWorkflow(!!wfProcess);
      const map: Record<string, FormField> = {};
      fs.forEach((f) => {
        map[f.fieldName] = f;
      });
      fieldMapRef.current = map;
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
      await loadTranslations(id);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, language, loadTranslations]);

  useEffect(() => {
    loadTemplateData();
  }, [loadTemplateData]);

  const loadRecommendations = useCallback(() => {
    if (!id) return;
    setRecommendLoading(true);
    recommendApi
      .getFormRecommendations(id, submitterId.current)
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
  }, [id]);

  const loadContextRecommendations = useCallback(async () => {
    if (!id) return;

    const values = formValuesRef.current || {};
    const filledCount = Object.values(values).filter(
      (v) => v !== undefined && v !== null && v !== ''
    ).length;

    if (filledCount < 1) {
      setContextRecommendations([]);
      return;
    }

    setContextRecLoading(true);
    try {
      const fieldDefs = fields.map((f) => ({
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        inputType: f.inputType,
      }));

      const recs = await aiRecommendApi.getContextRecommendations({
        filledFields: values,
        fieldDefinitions: fieldDefs,
      });

      const filtered = recs.filter(
        (r) =>
          formValuesRef.current?.[r.targetField] === undefined ||
          formValuesRef.current?.[r.targetField] === ''
      );

      setContextRecommendations(filtered);

      if (filtered.length > 0) {
        message.info(
          `发现 ${filtered.length} 条上下文推荐，填写身份证、手机号等字段后自动推断性别、生日、运营商等信息`,
          2
        );
      }
    } catch (e) {
      console.warn('加载上下文推荐失败:', e);
      setContextRecommendations([]);
    } finally {
      setContextRecLoading(false);
    }
  }, [id, fields]);

  useEffect(() => {
    if (fields.length > 0 && id) {
      loadRecommendations();
    }
  }, [fields.length, id, loadRecommendations]);

  const applyRecommendation = useCallback(
    (fieldName: string, value: string) => {
      if (schemaPreviewRef.current) {
        const field = fields.find((f) => f.fieldName === fieldName);
        let typedValue: any = value;
        if (field?.inputType === 'number') {
          const num = Number(value);
          if (!Number.isNaN(num)) {
            typedValue = num;
          }
        }
        schemaPreviewRef.current.setFieldValue(fieldName, typedValue);
        message.success(`已填入 ${field?.fieldLabel || fieldName}: ${value}`);

        formValuesRef.current = {
          ...formValuesRef.current,
          [fieldName]: typedValue,
        };
      } else {
        message.info(`已选择推荐值: ${value}`);
      }
    },
    [fields]
  );

  const applyContextRecommendation = useCallback(
    (rec: ContextRecommendation) => {
      applyRecommendation(rec.targetField, String(rec.suggestedValue));
      setTimeout(() => {
        loadContextRecommendations();
      }, 500);
    },
    [applyRecommendation, loadContextRecommendations]
  );

  const applyAllContextRecommendations = useCallback(() => {
    if (!schemaPreviewRef.current || contextRecommendations.length === 0) return;

    for (const rec of contextRecommendations) {
      const field = fields.find((f) => f.fieldName === rec.targetField);
      let typedValue: any = rec.suggestedValue;
      if (field?.inputType === 'number') {
        const num = Number(rec.suggestedValue);
        if (!Number.isNaN(num)) {
          typedValue = num;
        }
      }
      schemaPreviewRef.current.setFieldValue(rec.targetField, typedValue);
      formValuesRef.current = {
        ...formValuesRef.current,
        [rec.targetField]: typedValue,
      };
    }

    message.success(`已自动填入 ${contextRecommendations.length} 个字段`, 2);
    setContextRecommendations([]);
  }, [contextRecommendations, fields]);

  const handleSubmit = async (values: Record<string, any>) => {
    if (!id) return;

    formValuesRef.current = values;

    if (enableSmartValidation) {
      try {
        const valid = await schemaPreviewRef.current?.validateForm();
        if (!valid) return;
      } catch (e) {
        console.warn('校验失败:', e);
      }
    }

    try {
      const result = await formDataApi.submitFormData(id, values, submitterId.current);
      message.success(hasWorkflow ? '提交成功，已进入审批流程' : '提交成功');
      loadRecommendations();
      formValuesRef.current = {};

      if (hasWorkflow && result?.id) {
        setSubmittedFormDataId(String(result.id));
        setShowApprovalPanel(true);
      }
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setFocusedField(fieldName);
      const rec = recommendations[fieldName];
      if (rec && schemaPreviewRef.current) {
        const currentVal = schemaPreviewRef.current.getFieldValue(fieldName);
        if (currentVal == null || currentVal === '') {
          const field = fields.find((f) => f.fieldName === fieldName);
          let typedValue: any = rec.recommendedValue;
          if (field?.inputType === 'number') {
            const num = Number(rec.recommendedValue);
            if (!Number.isNaN(num)) {
              typedValue = num;
            }
          }
          schemaPreviewRef.current.setFieldValue(fieldName, typedValue);
          formValuesRef.current = {
            ...formValuesRef.current,
            [fieldName]: typedValue,
          };
        }
      }
    },
    [recommendations, fields]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (schemaPreviewRef.current) {
        const vals = schemaPreviewRef.current.getValues();
        if (vals && Object.keys(vals).length > 0) {
          const changed =
            JSON.stringify(vals) !== JSON.stringify(formValuesRef.current || {});
          if (changed) {
            formValuesRef.current = vals;
          }
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const filledCount = useMemo(
    () =>
      Object.values(formValuesRef.current || {}).filter(
        (v) => v !== undefined && v !== null && v !== ''
      ).length,
    [formValuesRef.current]
  );

  if (loading) return <Spin />;

  const focusedRec = focusedField ? recommendations[focusedField] : null;

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>{templateName} - 表单预览</h3>
          {hasWorkflow && (
            <Tag color="processing" icon={<AuditOutlined />}>
              已配置审批流程
            </Tag>
          )}
          {workflowStatus && (
            <Tag
              color={
                workflowStatus === 'APPROVED'
                  ? 'success'
                  : workflowStatus === 'REJECTED'
                  ? 'error'
                  : 'processing'
              }
            >
              {workflowStatus === 'RUNNING'
                ? '审批中'
                : workflowStatus === 'APPROVED'
                ? '已通过'
                : workflowStatus === 'REJECTED'
                ? '已驳回'
                : workflowStatus}
            </Tag>
          )}
        </div>
        <Space>
          <LanguageSwitcher />
          <Tooltip title={`提交人ID: ${submitterId.current}`}>
            <Tag icon={<UserOutlined />}>
              用户: {submitterId.current.slice(0, 8)}...
            </Tag>
          </Tooltip>
          <Tooltip title="是否启用智能校验">
            <Button
              type={enableSmartValidation ? 'primary' : 'default'}
              icon={<SafetyOutlined />}
              onClick={() => setEnableSmartValidation(!enableSmartValidation)}
            >
              智能校验: {enableSmartValidation ? '开' : '关'}
            </Button>
          </Tooltip>
          <Tooltip title="是否启用地址补全">
            <Button
              type={enableAddressComplete ? 'primary' : 'default'}
              icon={<EnvironmentOutlined />}
              onClick={() => setEnableAddressComplete(!enableAddressComplete)}
            >
              地址补全: {enableAddressComplete ? '开' : '关'}
            </Button>
          </Tooltip>
          <Tooltip title="根据已填字段获取AI上下文推荐">
            <Button
              icon={<ThunderboltOutlined />}
              loading={contextRecLoading}
              onClick={loadContextRecommendations}
              disabled={filledCount < 1}
            >
              AI 关联推荐
            </Button>
          </Tooltip>
          <Tooltip title="刷新智能推荐">
            <Button
              icon={<ReloadOutlined />}
              loading={recommendLoading}
              onClick={loadRecommendations}
            >
              刷新推荐
            </Button>
          </Tooltip>
          <Tooltip title="分享表单">
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={() => setShareModalVisible(true)}
            >
              分享
            </Button>
          </Tooltip>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </Space>
      </div>

      {contextRecommendations.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<BulbOutlined />}
          style={{ marginBottom: 16 }}
          message={
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ marginRight: 12 }}>
                    <ThunderboltOutlined style={{ marginRight: 4 }} />
                    基于已填字段的AI关联推荐
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {contextRecommendations.length} 条
                    </Tag>
                  </strong>
                  <span style={{ color: '#666', fontSize: 13 }}>
                    填写身份证、手机号、公司名等可自动推断关联字段
                  </span>
                </div>
                <Button
                  size="small"
                  type="primary"
                  onClick={applyAllContextRecommendations}
                >
                  一键填入全部
                </Button>
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {contextRecommendations.map((rec, idx) => {
                  const field = fieldMapRef.current[rec.targetField];
                  const sourceLabel =
                    AI_SOURCE_LABELS[rec.source] || {
                      label: rec.source,
                      color: 'default',
                    };
                  const fieldLabel = field?.fieldLabel || rec.targetField;

                  return (
                    <div
                      key={idx}
                      onClick={() => applyContextRecommendation(rec)}
                      style={{
                        padding: '8px 16px',
                        background: '#f0f5ff',
                        border: '1px solid #adc6ff',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d6e4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0f5ff';
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
                        <Tag color={sourceLabel.color as any}>
                          {sourceLabel.label}
                        </Tag>
                        <span style={{ marginLeft: 4 }}>{rec.explanation}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#262626' }}>
                        <span style={{ color: '#8c8c8c' }}>{fieldLabel}:</span>{' '}
                        <strong>{String(rec.suggestedValue)}</strong>
                      </div>
                      <div
                        style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}
                      >
                        置信度 {Math.round(rec.confidence * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          }
        />
      )}

      {Object.keys(recommendations).length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#52c41a' }}>
            <BulbOutlined /> 智能推荐（点击填入，聚焦字段自动填入上次值）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.values(recommendations).map((rec) => (
              <div
                key={rec.fieldName}
                style={{
                  padding: '4px 12px',
                  background: focusedField === rec.fieldName ? '#e6f7ff' : '#fff',
                  border:
                    focusedField === rec.fieldName
                      ? '2px solid #91d5ff'
                      : '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={() => applyRecommendation(rec.fieldName, rec.recommendedValue)}
              >
                <span style={{ color: '#666', marginRight: 4 }}>
                  {rec.fieldLabel}:
                </span>
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
          <SmartSchemaPreview
            ref={schemaPreviewRef}
            schema={schema}
            fields={fields}
            editable
            templateId={id}
            onSubmit={handleSubmit}
            onFieldFocus={handleFieldFocus}
            showValidation={enableSmartValidation}
            showAddressComplete={enableAddressComplete}
          />
        </div>

        {Object.keys(recommendations).length > 0 && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <div
              style={{
                background: '#fafafa',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #f0f0f0',
                maxHeight: 600,
                overflowY: 'auto',
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                <BulbOutlined style={{ color: '#faad14' }} /> 推荐候选值
              </h4>
              {focusedRec && (
                <div
                  style={{
                    padding: '8px 12px',
                    marginBottom: 12,
                    background: '#fff7e6',
                    border: '1px solid #ffe7ba',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontWeight: 500, color: '#fa8c16', marginBottom: 4 }}>
                    当前聚焦字段：{focusedRec.fieldLabel}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    已自动填入推荐值
                  </div>
                </div>
              )}
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

      {showApprovalPanel && submittedFormDataId && hasWorkflow && (
        <div style={{ marginTop: 24 }}>
          <WorkflowApproval
            formDataId={submittedFormDataId}
            templateId={id}
            currentUserId={submitterId.current}
            onStatusChange={setWorkflowStatus}
          />
        </div>
      )}

      <FormShareModal
        open={shareModalVisible}
        templateId={id || ''}
        templateName={templateName}
        onClose={() => setShareModalVisible(false)}
      />
    </div>
  );
}
