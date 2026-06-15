import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message } from 'antd';
import { templateApi, formDataApi } from '@/services/api';
import { generateFormSchema } from '@/utils/schemaTransform';
import SchemaPreview from '@/components/SchemaPreview';
import type { FormField, FormSchema } from '@/types';
import { fieldApi } from '@/services/api';

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      templateApi.getTemplate(id),
      fieldApi.getFields(id),
    ])
      .then(([template, fields]) => {
        setTemplateName(template.name);
        const s = generateFormSchema(fields.map((f) => ({ ...f })));
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

  const handleSubmit = async (values: Record<string, any>) => {
    if (!id) return;
    try {
      await formDataApi.submitFormData(id, values);
      message.success('提交成功');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{templateName} - 表单预览</h3>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
      <SchemaPreview schema={schema} editable onSubmit={handleSubmit} />
    </div>
  );
}
