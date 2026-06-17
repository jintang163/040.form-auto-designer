import React, { useState } from 'react';
import { View, Text, Input, Textarea, Picker, RadioGroup, Radio, CheckboxGroup, Checkbox } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { FormField as FormFieldType } from '@/types';
import ImageUploader from '../ImageUploader';

interface FormFieldProps {
  field: FormFieldType;
  value: string | string[] | number;
  error?: string;
  onChange: (value: string | string[] | number) => void;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ field, value, error, onChange, disabled = false }) => {
  const [focused, setFocused] = useState(false);

  const handleInputChange = (e: any) => {
    const val = e.detail?.value ?? e;
    onChange(val);
  };

  const handleCheckboxChange = (e: any) => {
    const val = e.detail?.value ?? [];
    onChange(val);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <Input
            className={classnames(styles.input, focused && styles.focused, error && styles.error)}
            type={field.type === 'number' ? 'digit' : 'text'}
            value={String(value || '')}
            placeholder={field.placeholder}
            onInput={handleInputChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxlength={field.maxLength}
            disabled={disabled}
          />
        );

      case 'textarea':
        return (
          <Textarea
            className={classnames(styles.textarea, focused && styles.focused, error && styles.error)}
            value={String(value || '')}
            placeholder={field.placeholder}
            onInput={handleInputChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxlength={field.maxLength}
            disabled={disabled}
            autoHeight
          />
        );

      case 'select':
        return (
          <Picker
            mode="selector"
            range={field.options || []}
            value={field.options?.indexOf(String(value)) || 0}
            onChange={(e) => {
              const index = e.detail.value;
              onChange(field.options?.[index] || '');
            }}
            disabled={disabled}
          >
            <View className={classnames(styles.picker, error && styles.error)}>
              <Text className={classnames(!value && styles.placeholder)}>
                {value || field.placeholder || '请选择'}
              </Text>
              <Text className={styles.arrow}>›</Text>
            </View>
          </Picker>
        );

      case 'radio':
        return (
          <RadioGroup onChange={(e) => onChange(e.detail.value)}>
            <View className={styles.radioGroup}>
              {field.options?.map((option, index) => (
                <View key={index} className={styles.radioItem}>
                  <Radio
                    value={option}
                    checked={value === option}
                    disabled={disabled}
                    color="#165dff"
                  />
                  <Text className={styles.radioLabel}>{option}</Text>
                </View>
              ))}
            </View>
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <CheckboxGroup onChange={handleCheckboxChange}>
            <View className={styles.checkboxGroup}>
              {field.options?.map((option, index) => (
                <View key={index} className={styles.checkboxItem}>
                  <Checkbox
                    value={option}
                    checked={Array.isArray(value) && value.includes(option)}
                    disabled={disabled}
                    color="#165dff"
                  />
                  <Text className={styles.checkboxLabel}>{option}</Text>
                </View>
              ))}
            </View>
          </CheckboxGroup>
        );

      case 'date':
        return (
          <Picker
            mode="date"
            value={String(value || '')}
            onChange={(e) => onChange(e.detail.value)}
            disabled={disabled}
          >
            <View className={classnames(styles.picker, error && styles.error)}>
              <Text className={classnames(!value && styles.placeholder)}>
                {value || field.placeholder || '请选择日期'}
              </Text>
              <Text className={styles.arrow}>›</Text>
            </View>
          </Picker>
        );

      case 'time':
        return (
          <Picker
            mode="time"
            value={String(value || '')}
            onChange={(e) => onChange(e.detail.value)}
            disabled={disabled}
          >
            <View className={classnames(styles.picker, error && styles.error)}>
              <Text className={classnames(!value && styles.placeholder)}>
                {value || field.placeholder || '请选择时间'}
              </Text>
              <Text className={styles.arrow}>›</Text>
            </View>
          </Picker>
        );

      case 'image':
        return (
          <ImageUploader
            fieldId={field.id}
            onChange={onChange}
            disabled={disabled}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View className={classnames(styles.formField, disabled && styles.disabled)}>
      <View className={styles.label}>
        <Text className={styles.labelText}>{field.label}</Text>
        {field.required && <Text className={styles.required}>*</Text>}
      </View>
      <View className={styles.fieldWrapper}>{renderField()}</View>
      {error && <Text className={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default FormField;
