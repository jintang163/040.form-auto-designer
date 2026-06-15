import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Descriptions, message, Card } from 'antd';
import dayjs from 'dayjs';
import { formDataApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SchemaPreview from '@/components/SchemaPreview';
import type { FormData as FormDataType, FormSchema, FieldConfig } from '@/types';

export default function FormDataDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormDataType | null>(null);
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    formDataApi.getFormDataDetail(templateId)
      .then((data) => {
        setFormData(data);
        try {
          const parsed = JSON.parse(data.dataJson);
          setValues(parsed);
        } catch { setValues({}); }
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading) return <Spin />;
  if (!formData) return null;

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
      <SchemaPreview schema={schema} editable={false} values={values} />
    </div>
  );
}
