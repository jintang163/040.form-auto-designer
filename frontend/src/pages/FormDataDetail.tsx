import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Descriptions, message, Card, Tag, Table } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formDataApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SchemaPreview from '@/components/SchemaPreview';
import MaskedFieldCell from '@/components/MaskedFieldCell';
import type { FormSchema, FieldPermissionInfo } from '@/types';

interface FieldInfo {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  inputType: string;
  isSensitive: boolean;
}

export default function FormDataDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [submitterId, setSubmitterId] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [values, setValues] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermissionInfo>>({});

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await formDataApi.getFormDataDetailWithPermissions(id);
        setTemplateName(res.templateName || '');
        setSubmitterId(res.submitterId || '');
        setSubmittedAt(res.submittedAt || '');
        setTemplateId(String(res.templateId || ''));

        const rawFields: any[] = res.fields || [];
        const mappedFields: FieldInfo[] = rawFields.map((f: any) => ({
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType || 'string',
          inputType: f.inputType || 'text',
          isSensitive: f.isSensitive === true || f.isSensitive === 1,
        }));
        setFields(mappedFields);

        if (rawFields.length > 0) {
          setSchema(generateFormSchema(rawFields));
        }

        try {
          const parsed = typeof res.fieldValuesJson === 'string'
            ? JSON.parse(res.fieldValuesJson)
            : res.fieldValuesJson;
          setValues(parsed || {});
        } catch {
          setValues({});
        }

        if (res.fieldPermissions) {
          setFieldPermissions(res.fieldPermissions);
        }
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <Spin />;
  if (!id) return null;

  const sensitiveFields = fields.filter((f) => {
    const perm = fieldPermissions[f.fieldName];
    return perm?.isSensitive || f.isSensitive;
  });

  const allFieldsDataSource = fields.map((f) => {
    const perm = fieldPermissions[f.fieldName];
    const isSensitive = perm?.isSensitive || f.isSensitive;
    const rawValue = values[f.fieldName];
    return {
      key: f.fieldName,
      fieldLabel: f.fieldLabel,
      fieldName: f.fieldName,
      value: rawValue != null ? String(rawValue) : '',
      isSensitive,
      permission: perm,
      fieldIsSensitive: f.isSensitive,
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>填报数据详情</h3>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="模板名称">{templateName}</Descriptions.Item>
          <Descriptions.Item label="提交人">{submitterId}</Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {submittedAt ? dayjs(submittedAt).format('YYYY-MM-DD HH:mm:ss') : ''}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {sensitiveFields.length > 0 && (
        <Card
          size="small"
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LockOutlined style={{ color: '#ff4d4f' }} />
              敏感字段
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={1} size="small">
            {sensitiveFields.map((f) => {
              const perm = fieldPermissions[f.fieldName];
              const value = values[f.fieldName];
              return (
                <Descriptions.Item
                  key={f.fieldName}
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {f.fieldLabel}
                      <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>
                        敏感
                      </Tag>
                    </span>
                  }
                >
                  <MaskedFieldCell
                    formDataId={id}
                    fieldName={f.fieldName}
                    value={value != null ? String(value) : ''}
                    permission={perm}
                    isSensitive={f.isSensitive}
                  />
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </Card>
      )}

      <Card size="small" title="表单数据" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          pagination={false}
          dataSource={allFieldsDataSource}
          columns={[
            {
              title: '字段',
              dataIndex: 'fieldLabel',
              width: 150,
              render: (text: string, record: any) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {text}
                  {record.isSensitive && (
                    <Tag color="red" icon={<LockOutlined />} style={{ fontSize: 10, padding: '0 4px' }}>
                      敏感
                    </Tag>
                  )}
                </span>
              ),
            },
            {
              title: '字段名',
              dataIndex: 'fieldName',
              width: 150,
            },
            {
              title: '值',
              dataIndex: 'value',
              render: (_: any, record: any) => (
                <MaskedFieldCell
                  formDataId={id}
                  fieldName={record.fieldName}
                  value={record.value}
                  permission={record.permission}
                  isSensitive={record.fieldIsSensitive}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="表单预览">
        <SchemaPreview schema={schema} editable={false} values={values} />
      </Card>
    </div>
  );
}
