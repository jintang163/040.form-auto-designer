import { useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createForm } from '@formily/core';
import { FormProvider, SchemaField } from '@formily/react';
import { FormItem, Input, NumberPicker, DatePicker, Select, Upload, TextArea } from '@formily/antd';
import type { FormSchema } from '@/types';
import { Card } from 'antd';
import type { Form } from '@formily/core';

export interface SchemaPreviewRef {
  setFieldValue: (fieldName: string, value: any) => void;
  getFieldValue: (fieldName: string) => any;
  getForm: () => Form;
  getValues: () => Record<string, any>;
  setValues: (values: Record<string, any>) => void;
}

interface SchemaPreviewProps {
  schema: FormSchema;
  editable?: boolean;
  values?: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void;
  onFieldFocus?: (fieldName: string) => void;
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

const SchemaPreview = forwardRef<SchemaPreviewRef, SchemaPreviewProps>(
  ({ schema, editable = true, values, onSubmit, onFieldFocus }, ref) => {
    const form = useMemo(() => {
      const f = createForm({
        editable,
        initialValues: values,
      });
      return f;
    }, [schema, editable, values]);

    useEffect(() => {
      if (!onFieldFocus) return;
      const disposers: (() => void)[] = [];
      Object.keys(schema.properties || {}).forEach((fieldName) => {
        try {
          const field = form.query(fieldName).take();
          if (field) {
            const disp = field.addEffects?.('__recommend_focus__', (fieldSelf: any) => {
              fieldSelf.onFieldFocus?.(() => {
                onFieldFocus(fieldName);
              });
            });
            if (typeof disp === 'function') disposers.push(disp);
          }
        } catch {
          const disp = form.addEffects?.(`__focus_${fieldName}__`, () => {
            form.onFieldFocus?.(`${fieldName}`, () => {
              onFieldFocus(fieldName);
            });
          });
          if (typeof disp === 'function') disposers.push(disp);
        }
      });
      return () => disposers.forEach((d) => d && d());
    }, [form, schema, onFieldFocus]);

    useImperativeHandle(ref, () => ({
      setFieldValue: (fieldName: string, value: any) => {
        try {
          form.setValuesIn?.(fieldName, value);
        } catch {
          form.setFieldState?.(fieldName, (state: any) => {
            state.value = value;
          });
        }
      },
      getFieldValue: (fieldName: string) => form.getValuesIn?.(fieldName),
      getForm: () => form,
      getValues: () => form.values,
      setValues: (vals: Record<string, any>) => form.setInitialValues(vals),
    }));

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
);

SchemaPreview.displayName = 'SchemaPreview';

export default SchemaPreview;
