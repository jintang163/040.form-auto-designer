import {
  useMemo,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { createForm } from '@formily/core';
import { FormProvider, SchemaField } from '@formily/react';
import {
  FormItem,
  Input,
  NumberPicker,
  DatePicker,
  Select,
  Upload,
  TextArea,
} from '@formily/antd';
import type { FormSchema, FormField } from '@/types';
import { Card, Button, message } from 'antd';
import type { Form } from '@formily/core';
import { linkageApi, validationApi } from '@/services/api';
import { getOrCreateSubmitterId } from '@/utils/submitterId';
import SmartFieldWrapper from './SmartFieldWrapper';
import AddressComplete from './AddressComplete';

export interface SmartSchemaPreviewRef {
  setFieldValue: (fieldName: string, value: any) => void;
  getFieldValue: (fieldName: string) => any;
  getForm: () => Form;
  getValues: () => Record<string, any>;
  setValues: (values: Record<string, any>) => void;
  validateForm: () => Promise<boolean>;
}

interface SmartSchemaPreviewProps {
  schema: FormSchema;
  fields: FormField[];
  editable?: boolean;
  values?: Record<string, any>;
  templateId?: string;
  onSubmit?: (values: Record<string, any>) => void;
  onFieldFocus?: (fieldName: string) => void;
  showValidation?: boolean;
  showAddressComplete?: boolean;
}

function isAddressField(fieldName: string, fieldLabel?: string): boolean {
  const lower = `${fieldName} ${fieldLabel || ''}`.toLowerCase();
  return lower.includes('address') || lower.includes('地址') || lower.includes('addr');
}

const SmartInput = forwardRef<
  any,
  any
>(({ value, onChange, fieldName, fieldLabel, templateId, ...rest }, ref) => {
  const formRef = useRef<Form | null>(null);

  const getFormValues = useCallback((): Record<string, any> => {
    return formRef.current?.values || {};
  }, []);

  const handleChange = useCallback(
    (val: any) => {
      onChange?.(val);
    },
    [onChange]
  );

  const WrappedComponent = isAddressField(fieldName, fieldLabel) ? (
    <AddressComplete value={value} onChange={onChange} />
  ) : (
    <Input ref={ref} value={value} onChange={onChange} {...rest} />
  );

  return (
    <SmartFieldWrapper
      fieldName={fieldName}
      fieldLabel={fieldLabel}
      templateId={templateId || ''}
      submitterId={getOrCreateSubmitterId()}
      value={value}
      allValues={getFormValues()}
      isAddressField={isAddressField(fieldName, fieldLabel)}
      onValueChange={handleChange}
    >
      {WrappedComponent}
    </SmartFieldWrapper>
  );
});

SmartInput.displayName = 'SmartInput';

const SmartTextArea = forwardRef<
  any,
  any
>(({ value, onChange, fieldName, fieldLabel, templateId, ...rest }, ref) => {
  const formRef = useRef<Form | null>(null);

  const getFormValues = useCallback((): Record<string, any> => {
    return formRef.current?.values || {};
  }, []);

  const handleChange = useCallback(
    (val: any) => {
      onChange?.(val);
    },
    [onChange]
  );

  return (
    <SmartFieldWrapper
      fieldName={fieldName}
      fieldLabel={fieldLabel}
      templateId={templateId || ''}
      submitterId={getOrCreateSubmitterId()}
      value={value}
      allValues={getFormValues()}
      onValueChange={handleChange}
    >
      <TextArea ref={ref} value={value} onChange={onChange} {...rest} />
    </SmartFieldWrapper>
  );
});

SmartTextArea.displayName = 'SmartTextArea';

const SmartSchemaPreview = forwardRef<SmartSchemaPreviewRef, SmartSchemaPreviewProps>(
  (
    {
      schema,
      fields,
      editable = true,
      values,
      templateId,
      onSubmit,
      onFieldFocus,
      showValidation = true,
      showAddressComplete = true,
    },
    ref
  ) => {
    const formRef = useRef<Form | null>(null);

    const form = useMemo(() => {
      const f = createForm({
        editable,
        initialValues: values,
      });
      formRef.current = f;
      return f;
    }, [schema, editable, values]);

    const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
    const [computedValues, setComputedValues] = useState<Record<string, any>>({});
    const [dynamicOptionsMap, setDynamicOptionsMap] = useState<
      Record<string, { label: string; value: string }[]>
    >({});
    const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
    const [disabledFields, setDisabledFields] = useState<Set<string>>(new Set());

    const fieldMap = useMemo(() => {
      const map: Record<string, FormField> = {};
      fields.forEach((f) => {
        map[f.fieldName] = f;
      });
      return map;
    }, [fields]);

    const applyLinkageResults = useCallback(
      (results: any[]) => {
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
      },
      [form]
    );

    useEffect(() => {
      if (!templateId) return;
      const currentValues = form.values || {};
      if (Object.keys(currentValues).length === 0) return;
      linkageApi
        .evaluateAll(templateId, currentValues)
        .then(applyLinkageResults)
        .catch(() => {});
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

    const validateForm = useCallback(async (): Promise<boolean> => {
      if (!templateId) return true;

      try {
        const res = await validationApi.validateForm({
          templateId: Number(templateId),
          fieldValues: form.values || {},
          submitterId: getOrCreateSubmitterId(),
          enableSuggestions: false,
          enableAutoCorrect: false,
          partialValidation: false,
        });

        if (!res.overallValid) {
          const errorMsgs = res.fieldResults
            .filter((r) => !r.valid)
            .map((r) => {
              const fieldLabel = fieldMap[r.fieldName]?.fieldLabel || r.fieldName;
              const firstErr = r.errors?.[0]?.errorMessage || '校验失败';
              return `${fieldLabel}: ${firstErr}`;
            });

          message.error(
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                表单校验未通过，发现 {errorMsgs.length} 个问题：
              </div>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {errorMsgs.slice(0, 5).map((msg, idx) => (
                  <div key={idx} style={{ padding: '4px 0', fontSize: 13 }}>
                    • {msg}
                  </div>
                ))}
                {errorMsgs.length > 5 && (
                  <div style={{ padding: '4px 0', fontSize: 13, color: '#999' }}>
                    还有 {errorMsgs.length - 5} 个错误...
                  </div>
                )}
              </div>
            </div>,
            5
          );
          return false;
        }
        return true;
      } catch (err) {
        console.warn('服务端校验失败:', err);
        return true;
      }
    }, [templateId, form.values, fieldMap]);

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
      validateForm,
    }));

    const handleSubmit = useCallback(async () => {
      if (showValidation) {
        const valid = await validateForm();
        if (!valid) return;
      }
      onSubmit?.(form.values);
    }, [onSubmit, showValidation, validateForm, form.values]);

    const SchemaFieldComponents = useMemo(() => {
      if (!showValidation || !templateId) {
        return {
          FormItem,
          Input,
          NumberPicker,
          DatePicker,
          Select,
          Upload,
          TextArea,
        };
      }

      const fieldNameFromPath = (path: string): string => {
        const parts = path.split('.');
        return parts[parts.length - 1];
      };

      const components: Record<string, any> = {
        FormItem,
        Input: (props: any) => {
          const fieldPath = props['x-content']?.props?.fieldName || '';
          const fieldName = fieldNameFromPath(fieldPath);
          const field = fieldMap[fieldName];

          if (showAddressComplete && isAddressField(fieldName, field?.fieldLabel)) {
            return (
              <AddressComplete
                value={props.value}
                onChange={props.onChange}
                placeholder={props.placeholder}
              />
            );
          }

          return <Input {...props} />;
        },
        NumberPicker,
        DatePicker,
        Select,
        Upload,
        TextArea,
      };

      return components;
    }, [showValidation, showAddressComplete, templateId, fieldMap]);

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

          if (showValidation && templateId && p['x-component'] === 'Input') {
            const field = fieldMap[key];
            const isAddr = isAddressField(key, field?.fieldLabel);

            if (showAddressComplete && isAddr) {
              p['x-decorator'] = 'SmartFieldDecorator';
              p['x-component'] = 'SmartAddressInput';
              p['x-component-props'] = {
                ...(p['x-component-props'] || {}),
                fieldName: key,
                fieldLabel: field?.fieldLabel,
                templateId,
              };
            } else {
              p['x-decorator'] = 'SmartFieldDecorator';
              p['x-component'] = 'SmartInput';
              p['x-component-props'] = {
                ...(p['x-component-props'] || {}),
                fieldName: key,
                fieldLabel: field?.fieldLabel,
                templateId,
              };
            }
          }

          props[key] = p;
        }
      }
      return { type: 'object' as const, properties: props };
    }, [schema, hiddenFields, dynamicOptionsMap, requiredFields, disabledFields, showValidation, templateId, fieldMap, showAddressComplete]);

    const schemaJson = useMemo(
      () => ({
        type: 'object',
        properties: enhancedSchema.properties,
      }),
      [enhancedSchema]
    );

    const allComponents = useMemo(() => {
      if (!showValidation) {
        return SchemaFieldComponents;
      }

      const submitterId = getOrCreateSubmitterId();

      const SmartFieldDecorator: React.FC<any> = ({ children, ...props }) => {
        return <FormItem {...props}>{children}</FormItem>;
      };

      const SmartInputComponent: React.FC<any> = (props) => {
        const fieldName = props.fieldName;
        const fieldLabel = props.fieldLabel;
        const [fieldValue, setFieldValue] = useState(props.value);

        useEffect(() => {
          setFieldValue(props.value);
        }, [props.value]);

        const handleChange = (e: any) => {
          const val = e?.target?.value !== undefined ? e.target.value : e;
          setFieldValue(val);
          props.onChange?.(e);
        };

        const getFormValues = () => form.values || {};

        return (
          <SmartFieldWrapper
            fieldName={fieldName}
            fieldLabel={fieldLabel}
            templateId={templateId || ''}
            submitterId={submitterId}
            value={fieldValue}
            allValues={getFormValues()}
            onValueChange={(val) => {
              props.onChange?.(val);
            }}
          >
            <Input {...props} value={fieldValue} onChange={handleChange} />
          </SmartFieldWrapper>
        );
      };

      const SmartAddressInputComponent: React.FC<any> = (props) => {
        const fieldName = props.fieldName;
        const fieldLabel = props.fieldLabel;
        const [fieldValue, setFieldValue] = useState(props.value);

        useEffect(() => {
          setFieldValue(props.value);
        }, [props.value]);

        const handleChange = (val: any) => {
          setFieldValue(val);
          props.onChange?.(val);
        };

        const getFormValues = () => form.values || {};

        return (
          <SmartFieldWrapper
            fieldName={fieldName}
            fieldLabel={fieldLabel}
            templateId={templateId || ''}
            submitterId={submitterId}
            value={fieldValue}
            allValues={getFormValues()}
            isAddressField
            onValueChange={(val) => {
              props.onChange?.(val);
            }}
          >
            <AddressComplete
              value={fieldValue}
              onChange={handleChange}
              placeholder={props.placeholder}
            />
          </SmartFieldWrapper>
        );
      };

      return {
        ...SchemaFieldComponents,
        SmartFieldDecorator,
        SmartInput: SmartInputComponent,
        SmartAddressInput: SmartAddressInputComponent,
      };
    }, [SchemaFieldComponents, showValidation, templateId, form.values]);

    return (
      <Card title="表单预览" size="small">
        <FormProvider form={form}>
          <SchemaField schema={schemaJson} components={allComponents} />
          {onSubmit && editable && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="primary" onClick={handleSubmit}>
                提交
              </Button>
            </div>
          )}
        </FormProvider>
      </Card>
    );
  }
);

SmartSchemaPreview.displayName = 'SmartSchemaPreview';

export default SmartSchemaPreview;
