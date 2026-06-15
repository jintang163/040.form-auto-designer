import { useMemo } from 'react';
import { createForm } from '@formily/core';
import { FormProvider, SchemaField } from '@formily/react';
import { FormItem, Input, NumberPicker, DatePicker, Select, Upload, TextArea } from '@formily/antd';
import type { FormSchema } from '@/types';
import { Card } from 'antd';

interface SchemaPreviewProps {
  schema: FormSchema;
  editable?: boolean;
  values?: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void;
}

const SchemaFieldComponents = {
  FormItem,
  Input,
  NumberPicker,
  DatePicker,
  Select,
  Upload,
  TextArea,
};

export default function SchemaPreview({ schema, editable = true, values, onSubmit }: SchemaPreviewProps) {
  const form = useMemo(() => {
    const f = createForm({
      editable,
      initialValues: values,
    });
    return f;
  }, [schema, editable, values]);

  const schemaJson = useMemo(() => ({
    type: 'object',
    properties: schema.properties,
  }), [schema]);

  return (
    <Card title="表单预览" size="small">
      <FormProvider form={form}>
        <SchemaField schema={schemaJson} components={SchemaFieldComponents} />
        {onSubmit && editable && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => onSubmit(form.values)}
              style={{
                padding: '4px 24px',
                background: '#1677ff',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              提交
            </button>
          </div>
        )}
      </FormProvider>
    </Card>
  );
}
