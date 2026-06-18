import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Descriptions, message, Card, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formDataApi, fieldApi, fieldPermissionApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SchemaPreview from '@/components/SchemaPreview';
import MaskedFieldCell from '@/components/MaskedFieldCell';
import type { FormData as FormDataType, FormSchema, FieldConfig, FieldPermissionInfo } from '@/types';

export default function FormDataDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormDataType | null>(null);
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [values, setValues] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermissionInfo>>({});

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [data, fieldList] = await Promise.all([
          formDataApi.getFormDataDetail(id),
          fieldApi.getFields(id),
        ]);
        setFormData(data);
        setFields(fieldList);
        try {
          const parsed = JSON.parse(data.dataJson);
          setValues(parsed);
        } catch { setValues({}); }
        try {
          if (fieldList && fieldList.length > 0) {
            setSchema(generateFormSchema(fieldList));
            const perms: Record<string, FieldPermissionInfo> = {};
            for (const f of fieldList) {
              const fp = await fieldPermissionApi.checkPermission(id, f.fieldName).catch(() => null);
              if (fp) {
                perms[f.fieldName] = fp as any;
              } else {
                perms[f.fieldName] = {
                  isSensitive: !!(f as any).isSensitive,
                  canViewSensitive: true,
                  canEdit: true,
                  canExport: true,
                };
              }
            }
            setFieldPermissions(perms);
          }
        } catch (e) {
          console.debug('生成schema失败', e);
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
  if (!formData) return null;

  const sensitiveFields = fields.filter((f) => {
    const perm = fieldPermissions[f.fieldName];
    return perm?.isSensitive || (f as any).isSensitive;
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>填报数据详情</h3>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="模板名称">{formData.templateName}</Descriptions.Item>
          <Descriptions.Item label="提交人">{formData.submitter}</Descriptions.Item>
          <Descriptions.Item label="提交时间">{dayjs(formData.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
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
                    formDataId={id || ''}
                    fieldName={f.fieldName}
                    value={value != null ? String(value) : ''}
                    permission={perm}
                    isSensitive={(f as any).isSensitive}
                  />
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </Card>
      )}

      <SchemaPreview schema={schema} editable={false} values={values} />
    </div>
  );
}
