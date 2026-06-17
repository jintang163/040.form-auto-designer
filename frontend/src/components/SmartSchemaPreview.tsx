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
import type { FormSchema, FormField, CollaborationCursor as CollaborationCursorType, FieldLock } from '@/types';
import { Card, Button, message } from 'antd';
import type { Form } from '@formily/core';
import { linkageApi, validationApi } from '@/services/api';
import { getOrCreateSubmitterId } from '@/utils/submitterId';
import SmartFieldWrapper from './SmartFieldWrapper';
import AddressComplete from './AddressComplete';
import CollaborationCursor from './CollaborationCursor';
import { useI18n } from '@/contexts/I18nContext';

export interface SmartSchemaPreviewRef {
  setFieldValue: (fieldName: string, value: any) => void;
  getFieldValue: (fieldName: string) => any;
  getForm: () => Form;
  getValues: () => Record<string, any>;
  setValues: (values: Record<string, any>) => void;
  validateForm: () => Promise<boolean>;
  setFieldDisabled: (fieldName: string, disabled: boolean) => void;
}

interface SmartSchemaPreviewProps {
  schema: FormSchema;
  fields: FormField[];
  editable?: boolean;
  values?: Record<string, any>;
  templateId?: string;
  onSubmit?: (values: Record<string, any>) => void;
  onFieldFocus?: (fieldName: string) => void;
  onFieldBlur?: (fieldName: string) => void;
  onFieldValueChange?: (fieldName: string, value: any) => void;
  showValidation?: boolean;
  showAddressComplete?: boolean;
  collaborationEnabled?: boolean;
  onlineUsers?: CollaborationCursorType[];
  fieldLocks?: Record<string, FieldLock>;
  currentSessionId?: string;
}

function isAddressField(fieldName: string, fieldLabel?: string): boolean {
  const lower = `${fieldName} ${fieldLabel || ''}`.toLowerCase();
  return lower.includes('address') || lower.includes('地址') || lower.includes('addr');
}

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
      onFieldBlur,
      onFieldValueChange,
      showValidation = true,
      showAddressComplete = true,
      collaborationEnabled = false,
      onlineUsers = [],
      fieldLocks = {},
      currentSessionId = '',
    },
    ref
  ) => {
    const formRef = useRef<Form | null>(null);
    const [externallyDisabledFields, setExternallyDisabledFields] = useState<Set<string>>(new Set());
    const { language, translate } = useI18n();

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

    const isFieldLockedByOther = useCallback(
      (fieldName: string): boolean => {
        if (!collaborationEnabled) return false;
        const lock = fieldLocks[fieldName];
        return !!lock && lock.lockedBy !== currentSessionId;
      },
      [collaborationEnabled, fieldLocks, currentSessionId]
    );

    const getFieldLock = useCallback(
      (fieldName: string): FieldLock | null => {
        if (!collaborationEnabled) return null;
        return fieldLocks[fieldName] || null;
      },
      [collaborationEnabled, fieldLocks]
    );

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
      if (!onFieldFocus && !onFieldBlur) return;
      const disposers: (() => void)[] = [];
      Object.keys(schema.properties || {}).forEach((fieldName) => {
        try {
          const field = form.query(fieldName).take();
          if (field) {
            if (onFieldFocus) {
              const dispFocus = field.addEffects?.('__collab_focus__', (fieldSelf: any) => {
                fieldSelf.onFieldFocus?.(() => {
                  onFieldFocus(fieldName);
                });
              });
              if (typeof dispFocus === 'function') disposers.push(dispFocus);
            }
            if (onFieldBlur) {
              const dispBlur = field.addEffects?.('__collab_blur__', (fieldSelf: any) => {
                fieldSelf.onFieldBlur?.(() => {
                  onFieldBlur(fieldName);
                });
              });
              if (typeof dispBlur === 'function') disposers.push(dispBlur);
            }
          }
        } catch {
          if (onFieldFocus) {
            const dispFocus = form.addEffects?.(`__collab_focus_${fieldName}__`, () => {
              form.onFieldFocus?.(`${fieldName}`, () => {
                onFieldFocus(fieldName);
              });
            });
            if (typeof dispFocus === 'function') disposers.push(dispFocus);
          }
          if (onFieldBlur) {
            const dispBlur = form.addEffects?.(`__collab_blur_${fieldName}__`, () => {
              form.onFieldBlur?.(`${fieldName}`, () => {
                onFieldBlur(fieldName);
              });
            });
            if (typeof dispBlur === 'function') disposers.push(dispBlur);
          }
        }
      });
      return () => disposers.forEach((d) => d && d());
    }, [form, schema, onFieldFocus, onFieldBlur]);

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
              const fieldLabel = translate(r.fieldName, fieldMap[r.fieldName]?.fieldLabel || r.fieldName);
              const firstErr = r.errors?.[0]?.errorMessage || translate('validationFailed', '校验失败');
              return `${fieldLabel}: ${firstErr}`;
            });

          const errorTitle =
            language === 'zh-CN'
              ? `表单校验未通过，发现 ${errorMsgs.length} 个问题：`
              : `Validation failed, ${errorMsgs.length} issue(s) found:`;
          const moreErrorsText =
            language === 'zh-CN'
              ? `还有 ${errorMsgs.length - 5} 个错误...`
              : `${errorMsgs.length - 5} more error(s)...`;

          message.error(
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                {errorTitle}
              </div>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {errorMsgs.slice(0, 5).map((msg, idx) => (
                  <div key={idx} style={{ padding: '4px 0', fontSize: 13 }}>
                    • {msg}
                  </div>
                ))}
                {errorMsgs.length > 5 && (
                  <div style={{ padding: '4px 0', fontSize: 13, color: '#999' }}>
                    {moreErrorsText}
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
    }, [templateId, form.values, fieldMap, translate, language]);

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
      setValues: (vals: Record<string, any>) => {
        Object.entries(vals).forEach(([key, val]) => {
          try {
            form.setValuesIn(key, val);
          } catch {}
        });
      },
      validateForm,
      setFieldDisabled: (fieldName: string, disabled: boolean) => {
        setExternallyDisabledFields((prev) => {
          const next = new Set(prev);
          if (disabled) {
            next.add(fieldName);
          } else {
            next.delete(fieldName);
          }
          return next;
        });
      },
    }));

    const handleSubmit = useCallback(async () => {
      if (showValidation) {
        const valid = await validateForm();
        if (!valid) return;
      }
      onSubmit?.(form.values);
    }, [onSubmit, showValidation, validateForm, form.values]);

    const handleFieldValueChange = useCallback(
      (fieldName: string, value: any) => {
        onFieldValueChange?.(fieldName, value);
      },
      [onFieldValueChange]
    );

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
          const field = fieldMap[key];
          const originalLabel = field?.fieldLabel || p.title || key;
          const translatedLabel = translate(key, originalLabel);
          p.title = translatedLabel;

          if (dynamicOptionsMap[key]) {
            p.enum = dynamicOptionsMap[key];
          }
          if (requiredFields.has(key)) {
            p.required = true;
          }
          const isDisabled =
            disabledFields.has(key) ||
            externallyDisabledFields.has(key) ||
            isFieldLockedByOther(key);
          if (isDisabled) {
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
                disabled: isDisabled,
              };
            } else {
              p['x-decorator'] = 'SmartFieldDecorator';
              p['x-component'] = 'SmartInput';
              p['x-component-props'] = {
                ...(p['x-component-props'] || {}),
                fieldName: key,
                fieldLabel: field?.fieldLabel,
                templateId,
                disabled: isDisabled,
              };
            }
          }

          props[key] = p;
        }
      }
      return { type: 'object' as const, properties: props };
    }, [
      schema,
      hiddenFields,
      dynamicOptionsMap,
      requiredFields,
      disabledFields,
      externallyDisabledFields,
      showValidation,
      templateId,
      fieldMap,
      showAddressComplete,
      isFieldLockedByOther,
      translate,
    ]);

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
        const fieldName = props['data-field-name'] || '';
        const field = fieldMap[fieldName];

        return (
          <div data-field-wrapper={fieldName}>
            <FormItem {...props}>
              {children}
            </FormItem>
            {collaborationEnabled && (
              <div style={{ paddingLeft: 112 }}>
                <CollaborationCursor
                  fieldName={fieldName}
                  fieldLabel={field?.fieldLabel}
                  cursors={onlineUsers}
                  currentSessionId={currentSessionId}
                  fieldLock={getFieldLock(fieldName)}
                />
              </div>
            )}
          </div>
        );
      };

      const SmartInputComponent: React.FC<any> = (props) => {
        const fieldName = props.fieldName;
        const fieldLabel = props.fieldLabel;
        const [fieldValue, setFieldValue] = useState(props.value);
        const isLocked = isFieldLockedByOther(fieldName);

        useEffect(() => {
          setFieldValue(props.value);
        }, [props.value]);

        const handleChange = (e: any) => {
          const val = e?.target?.value !== undefined ? e.target.value : e;
          setFieldValue(val);
          props.onChange?.(e);
          handleFieldValueChange(fieldName, val);
        };

        const getFormValues = () => form.values || {};

        const handleFocus = () => {
          onFieldFocus?.(fieldName);
        };

        const handleBlur = () => {
          onFieldBlur?.(fieldName);
        };

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
              handleFieldValueChange(fieldName, val);
            }}
            fieldProps={{
              'data-field-name': fieldName,
            }}
            decoratorProps={{
              'data-field-name': fieldName,
            }}
          >
            <Input
              {...props}
              value={fieldValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isLocked || props.disabled}
            />
          </SmartFieldWrapper>
        );
      };

      const SmartAddressInputComponent: React.FC<any> = (props) => {
        const fieldName = props.fieldName;
        const fieldLabel = props.fieldLabel;
        const [fieldValue, setFieldValue] = useState(props.value);
        const isLocked = isFieldLockedByOther(fieldName);

        useEffect(() => {
          setFieldValue(props.value);
        }, [props.value]);

        const handleChange = (val: any) => {
          setFieldValue(val);
          props.onChange?.(val);
          handleFieldValueChange(fieldName, val);
        };

        const getFormValues = () => form.values || {};

        const handleFocus = () => {
          onFieldFocus?.(fieldName);
        };

        const handleBlur = () => {
          onFieldBlur?.(fieldName);
        };

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
              handleFieldValueChange(fieldName, val);
            }}
            fieldProps={{
              'data-field-name': fieldName,
            }}
            decoratorProps={{
              'data-field-name': fieldName,
            }}
          >
            <AddressComplete
              value={fieldValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
    }, [
      SchemaFieldComponents,
      showValidation,
      templateId,
      form.values,
      fieldMap,
      collaborationEnabled,
      onlineUsers,
      currentSessionId,
      getFieldLock,
      isFieldLockedByOther,
      onFieldFocus,
      onFieldBlur,
      handleFieldValueChange,
    ]);

    return (
      <Card title={translate('formPreview', '表单预览')} size="small">
        <FormProvider form={form}>
          <SchemaField schema={schemaJson} components={allComponents} />
          {onSubmit && editable && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="primary" onClick={handleSubmit}>
                {translate('submit', '提交')}
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
