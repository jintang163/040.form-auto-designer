import type { FieldValidation } from '@/types'

const PHONE_REG = /^1[3-9]\d{9}$/
const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ID_CARD_REG = /^\d{17}[\dXx]$/

interface ValidationError {
  key: string
  message: string
}

function validateRequired(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

function validatePhone(value: string): boolean {
  return PHONE_REG.test(value)
}

function validateEmail(value: string): boolean {
  return EMAIL_REG.test(value)
}

function validateIdCard(value: string): boolean {
  return ID_CARD_REG.test(value)
}

function validateMinLength(value: string, min: number): boolean {
  return value.length >= min
}

function validateMaxLength(value: string, max: number): boolean {
  return value.length <= max
}

function validatePattern(value: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(value)
  } catch {
    return false
  }
}

export function validateField(key: string, value: any, rules: FieldValidation): ValidationError | null {
  if (rules.required && !validateRequired(value)) {
    return { key, message: rules.message || `${key}不能为空` }
  }

  if (value === null || value === undefined || value === '') {
    return null
  }

  const strValue = String(value)

  if (rules.minLength && !validateMinLength(strValue, rules.minLength)) {
    return { key, message: rules.message || `最少输入${rules.minLength}个字符` }
  }

  if (rules.maxLength && !validateMaxLength(strValue, rules.maxLength)) {
    return { key, message: rules.message || `最多输入${rules.maxLength}个字符` }
  }

  if (rules.pattern && !validatePattern(strValue, rules.pattern)) {
    return { key, message: rules.message || '格式不正确' }
  }

  if (rules.pattern === 'phone' && !validatePhone(strValue)) {
    return { key, message: rules.message || '手机号格式不正确' }
  }

  if (rules.pattern === 'email' && !validateEmail(strValue)) {
    return { key, message: rules.message || '邮箱格式不正确' }
  }

  if (rules.pattern === 'idCard' && !validateIdCard(strValue)) {
    return { key, message: rules.message || '身份证号格式不正确' }
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return { key, message: rules.message || `不能小于${rules.min}` }
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return { key, message: rules.message || `不能大于${rules.max}` }
  }

  return null
}

export function validateForm(
  formData: Record<string, any>,
  validationMap: Record<string, FieldValidation>
): ValidationError[] {
  const errors: ValidationError[] = []
  for (const [key, rules] of Object.entries(validationMap)) {
    const error = validateField(key, formData[key], rules)
    if (error) {
      errors.push(error)
    }
  }
  return errors
}
