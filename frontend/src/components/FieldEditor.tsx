import { useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Space, Card, Divider, Tag, Alert } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { FieldConfig, InputType, ValidationRule } from '@/types';

interface FieldEditorProps {
  field: FieldConfig;
  onChange: (data: Partial<FieldConfig>) => void;
  allFields?: FieldConfig[];
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

export default function FieldEditor({ field, onChange, allFields }: FieldEditorProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(field);
  }, [field, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    onChange(allValues);
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
