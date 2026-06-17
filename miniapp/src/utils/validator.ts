import type { FormField, ValidationResult } from '@/types';

export const validateField = (
  field: FormField,
  value: string | string[] | number | undefined
): string | null => {
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return `${field.label}不能为空`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `${field.label}不能为空`;
    }
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (field.type === 'text' || field.type === 'textarea') {
    const strValue = String(value);
    if (field.maxLength && strValue.length > field.maxLength) {
      return `${field.label}不能超过${field.maxLength}个字符`;
    }
  }

  if (field.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return `${field.label}必须是数字`;
    }
    if (field.min !== undefined && numValue < field.min) {
      return `${field.label}不能小于${field.min}`;
    }
    if (field.max !== undefined && numValue > field.max) {
      return `${field.label}不能大于${field.max}`;
    }
  }

  return null;
};

export const validateForm = (
  fields: FormField[],
  formData: Record<string, string | string[] | number>
): ValidationResult => {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const error = validateField(field, formData[field.id]);
    if (error) {
      errors[field.id] = error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export const isPhoneNumber = (value: string): boolean => {
  return /^1[3-9]\d{9}$/.test(value);
};

export const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isIdCard = (value: string): boolean => {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(value);
};
