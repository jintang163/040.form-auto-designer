import { useMemo, useImperativeHandle, forwardRef, useEffect, useState, useCallback } from 'react';
import { createForm } from '@formily/core';
import { FormProvider, SchemaField } from '@formily/react';
import { FormItem, Input, NumberPicker, DatePicker, Select, Upload, TextArea } from '@formily/antd';
import type { FormSchema } from '@/types';
import { Card } from 'antd';
import type { Form } from '@formily/core';
import { linkageApi } from '@/services/api';

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
  templateId?: string;
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
  ({ schema, editable = true, values, templateId, onSubmit, onFieldFocus }, ref) => {
    const form = useMemo(() => {
      const f = createForm({
        editable,
        initialValues: values,
      });
      return f;
    }, [schema, editable, values]);

    const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
    const [computedValues, setComputedValues] = useState<Record<string, any>>({});
    const [dynamicOptionsMap, setDynamicOptionsMap] = useState<Record<string, { label: string; value: string }[]>>({});
    const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
    const [disabledFields, setDisabledFields] = useState<Set<string>>(new Set());

    const applyLinkageResults = useCallback((results: any[]) => {
      const newHidden = new Set<string>();
      const newComputed: Record<string, any> = {};
      const newOptions: Record<string, { label: string; value: string }[]> = {};
      const newRequired = new Set<string>();
      const newDisabled = new Set<string>();

      for (const r of results) {
        if (!r.visible) newHidden.add(r.targetField);
        if (r.computedValue != null) newComputed[r.targetField] = r.computedValue;
        if (r.dynamicOptions) newOptions[r.targetField] = r.dynamicOptions;
        if (r.required) newRequired.add(r.targetField);
        if (r.disabled) newDisabled.add(r.targetField);
      }

      setHiddenFields(newHidden);
      setComputedValues(newComputed);
      setDynamicOptionsMap(newOptions);
      setRequiredFields(newRequired);
      setDisabledFields(newDisabled);

      for (const [field, val] of Object.entries(newComputed)) {
        try {
          form.setValuesIn(field, val);
        } catch {}
      }
    }, [form]);

    useEffect(() => {
      if (!templateId) return;
      const currentValues = form.values || {};
      if (Object.keys(currentValues).length === 0) return;
      linkageApi.evaluateAll(templateId, currentValues).then(applyLinkageResults).catch(() => {});
    }, [templateId, form.values, applyLinkageResults]);

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

    const enhancedSchema = useMemo(() => {
      const props = { ...schema.properties };
      for (const key of Object.keys(props)) {
        if (hiddenFields.has(key)) {
          props[key] = { ...props[key], 'x-display': 'none' };
        } else {
          const p = { ...props[key] };
          if (dynamicOptionsMap[key]) {
            p.enum = dynamicOptionsMap[key];
          }
          if (requiredFields.has(key)) {
            p.required = true;
          }
          if (disabledFields.has(key)) {
            p['x-component-props'] = { ...(p['x-component-props'] || {}), disabled: true };
          }
          props[key] = p;
        }
      }
      return { type: 'object' as const, properties: props };
    }, [schema, hiddenFields, dynamicOptionsMap, requiredFields, disabledFields]);

    const schemaJson = useMemo(() => ({
      type: 'object',
      properties: enhancedSchema.properties,
    }), [enhancedSchema]);

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
