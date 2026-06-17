import { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Space, Card, Divider, Tag, Alert, Tabs, message, Spin } from 'antd';
import { MinusCircleOutlined, PlusOutlined, GlobalOutlined } from '@ant-design/icons';
import type { FieldConfig, InputType, ValidationRule, LanguageCode } from '@/types';
import { LANGUAGE_OPTIONS } from '@/types';
import { fieldApi, i18nApi } from '@/services/api';

interface FieldEditorProps {
  field: FieldConfig;
  onChange: (data: Partial<FieldConfig>) => void;
  allFields?: FieldConfig[];
  templateId?: string;
}

const inputTypeOptions: { label: string; value: InputType }[] = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multiSelect' },
  { label: '文件上传', value: 'fileUpload' },
  { label: '文本域', value: 'textarea' },
];

const validationTypeOptions: { label: string; value: ValidationRule['type'] }[] = [
  { label: '正则', value: 'regex' },
  { label: '长度范围', value: 'lengthRange' },
  { label: '自定义', value: 'custom' },
];

export default function FieldEditor({ field, onChange, allFields, templateId }: FieldEditorProps) {
  const [form] = Form.useForm();
  const [enLabel, setEnLabel] = useState<string>('');
  const [savingI18n, setSavingI18n] = useState(false);
  const [enOptions, setEnOptions] = useState<Record<string, string>>({});
  const [loadingI18n, setLoadingI18n] = useState(false);

  useEffect(() => {
    form.setFieldsValue(field);
    const labelI18n = (field as any).fieldLabelI18n;
    if (labelI18n && typeof labelI18n === 'object') {
      setEnLabel(labelI18n['en-US'] || '');
    } else {
      setEnLabel('');
    }
    const optionsI18n = (field as any).optionsI18n;
    if (optionsI18n && typeof optionsI18n === 'object' && optionsI18n['en-US']) {
      setEnOptions({ ...optionsI18n['en-US'] });
    } else {
      setEnOptions({});
    }
  }, [field, form]);

  useEffect(() => {
    if (!templateId || !field.fieldName) return;
    const loadSavedI18n = async () => {
      setLoadingI18n(true);
      try {
        const translations = await i18nApi.getTranslations(templateId, 'en-US');
        if (translations[field.fieldName] && !enLabel) {
          setEnLabel(translations[field.fieldName]);
        }
      } catch (e) {
        console.warn('加载多语言数据失败:', e);
      } finally {
        setLoadingI18n(false);
      }
    };
    loadSavedI18n();
  }, [templateId, field.fieldName]);

  const handleValuesChange = (_: any, allValues: any) => {
    onChange(allValues);
  };

  const handleSaveI18n = async () => {
    if (!templateId || !field.fieldName) {
      return;
    }
    setSavingI18n(true);
    try {
      const labels: Record<string, string> = {
        [field.fieldName]: enLabel,
      };
      Object.entries(enOptions).forEach(([optValue, optLabel]) => {
        if (optLabel) {
          labels[`${field.fieldName}.option.${optValue}`] = optLabel;
        }
      });
      await fieldApi.saveFieldLabelsI18n(templateId, 'en-US', labels);
      await i18nApi.saveBatchTranslations(templateId, 'en-US', labels);
      onChange({
        ...field,
        fieldLabelI18n: {
          ...((field as any).fieldLabelI18n || {}),
          'en-US': enLabel,
        },
        optionsI18n: {
          ...((field as any).optionsI18n || {}),
          'en-US': { ...enOptions },
        },
      } as any);
      message.success('多语言标签保存成功');
    } catch (e: any) {
      console.error('保存多语言标签失败:', e);
      message.error('保存失败: ' + (e.message || '未知错误'));
    } finally {
      setSavingI18n(false);
    }
  };

  const fieldOptions = (allFields || [])
    .filter((f) => f.fieldName !== field.fieldName)
    .map((f) => ({ label: `${f.fieldLabel} (${f.fieldName})`, value: f.fieldName }));

  return (
    <Form
      form={form}
      layout="vertical"
      size="small"
      onValuesChange={handleValuesChange}
      initialValues={field}
    >
      <Card title="基本属性" size="small">
        <Form.Item name="fieldLabel" label="字段标签" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="fieldName" label="字段名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="inputType" label="输入类型">
          <Select options={inputTypeOptions} />
        </Form.Item>
        <Form.Item name="required" label="必填" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="defaultValue" label="默认值">
          <Input />
        </Form.Item>
      </Card>

      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>多语言标签</span>
          </Space>
        }
        size="small"
        style={{ marginTop: 12 }}
      >
        <Alert
          type="info"
          showIcon
          message="配置中英文标签，用户切换语言后表单自动翻译"
          style={{ marginBottom: 12 }}
        />
        <Tabs
          size="small"
          items={LANGUAGE_OPTIONS.map((opt) => ({
            key: opt.code,
            label: (
              <Space size={4}>
                <span>{opt.flag}</span>
                <span>{opt.name}</span>
              </Space>
            ),
            children:
              opt.code === 'zh-CN' ? (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                    中文标签（与字段标签一致）
                  </div>
                  <Input value={field.fieldLabel} disabled />
                  {(field.inputType === 'select' || field.inputType === 'multiSelect') && field.options && field.options.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                        选项（与选项配置一致）
                      </div>
                      {field.options.map((opt: { label: string; value: string }) => (
                        <div key={opt.value} style={{ marginBottom: 4 }}>
                          <Input value={opt.label} disabled />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {loadingI18n && (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <Spin size="small" />
                    </div>
                  )}
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                    英文标签
                  </div>
                  <Input
                    value={enLabel}
                    onChange={(e) => setEnLabel(e.target.value)}
                    placeholder="请输入英文标签"
                  />
                  {(field.inputType === 'select' || field.inputType === 'multiSelect') && field.options && field.options.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                        选项翻译
                      </div>
                      {field.options.map((opt: { label: string; value: string }) => (
                        <div key={opt.value} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>
                            中文: {opt.label} ({opt.value})
                          </div>
                          <Input
                            value={enOptions[opt.value] || ''}
                            onChange={(e) => setEnOptions((prev) => ({
                              ...prev,
                              [opt.value]: e.target.value,
                            }))}
                            placeholder={`Enter English label for "${opt.label}"`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {templateId && (
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 12 }}
                      onClick={handleSaveI18n}
                      loading={savingI18n}
                    >
                      保存英文标签
                    </Button>
                  )}
                  {!templateId && (
                    <div style={{ color: '#faad14', fontSize: 12, marginTop: 12 }}>
                      请先保存模板后再配置多语言标签
                    </div>
                  )}
                </div>
              ),
          }))}
        />
      </Card>

      {(field.inputType === 'select' || field.inputType === 'multiSelect') && (
        <Card title="选项配置" size="small" style={{ marginTop: 12 }}>
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex' }} align="baseline">
                    <Form.Item {...rest} name={[name, 'label']} rules={[{ required: true }]}>
                      <Input placeholder="显示名" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'value']} rules={[{ required: true }]}>
                      <Input placeholder="值" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加选项
                </Button>
              </>
            )}
          </Form.List>
        </Card>
      )}

      <Card title="校验规则" size="small" style={{ marginTop: 12 }}>
        <Form.List name="validationRules">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} style={{ display: 'flex' }} align="baseline">
                  <Form.Item {...rest} name={[name, 'type']}>
                    <Select options={validationTypeOptions} style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'value']}>
                    <Input placeholder="规则值" />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'message']}>
                    <Input placeholder="提示信息" />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'min']}>
                    <InputNumber placeholder="最小" style={{ width: 70 }} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'max']}>
                    <InputNumber placeholder="最大" style={{ width: 70 }} />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ type: 'regex', value: '', message: '' })} block icon={<PlusOutlined />}>
                添加规则
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card title="布局配置" size="small" style={{ marginTop: 12 }}>
        <Space>
          <Form.Item name={['layoutConfig', 'row']} label="行号">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name={['layoutConfig', 'col']} label="列号">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name={['layoutConfig', 'rowSpan']} label="跨行">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name={['layoutConfig', 'colSpan']} label="跨列">
            <InputNumber min={1} />
          </Form.Item>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            联动条件
            <Tag color="blue" style={{ fontSize: 11 }}>简易</Tag>
          </Space>
        }
        size="small"
        style={{ marginTop: 12 }}
        extra={
          <Alert
            type="info"
            message="高级联动规则请在「字段联动规则」面板配置"
            style={{ padding: '2px 8px', fontSize: 12 }}
            banner
          />
        }
      >
        <Form.List name="linkageCondition">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} style={{ display: 'flex' }} align="baseline">
                  <Form.Item {...rest} name={[name, 'field']}>
                    <Select
                      style={{ width: 160 }}
                      options={fieldOptions}
                      showSearch
                      optionFilterProp="label"
                      placeholder="关联字段"
                      allowClear
                    />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'operator']}>
                    <Select
                      style={{ width: 90 }}
                      options={[
                        { label: '等于', value: 'eq' },
                        { label: '不等于', value: 'ne' },
                        { label: '包含', value: 'contains' },
                        { label: '大于', value: 'gt' },
                        { label: '小于', value: 'lt' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, 'value']}>
                    <Input placeholder="值" style={{ width: 120 }} />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ field: '', operator: 'eq', value: '' })} block icon={<PlusOutlined />}>
                添加条件
              </Button>
            </>
          )}
        </Form.List>
      </Card>
    </Form>
  );
}
