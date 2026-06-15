export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'switch' | 'textarea' | 'file'

export interface FieldOption {
  label: string
  value: string | number
}

export interface FieldValidation {
  required?: boolean
  message?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
}

export interface FormField {
  key: string
  title: string
  type: FieldType
  required?: boolean
  placeholder?: string
  defaultValue?: any
  options?: FieldOption[]
  validation?: FieldValidation
  description?: string
  disabled?: boolean
  visible?: boolean
  condition?: FieldCondition
}

export interface FieldCondition {
  field: string
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt'
  value: any
}

export interface FormSchema {
  id: string
  name: string
  version: string
  description?: string
  fields: FormField[]
  groups?: FieldGroup[]
}

export interface FieldGroup {
  title: string
  fieldKeys: string[]
}

export interface FormTemplate {
  id: string
  name: string
  version: string
  description?: string
  updatedAt: string
  schema: FormSchema
}

export interface FormSubmitData {
  templateId: string
  templateName: string
  data: Record<string, any>
  submitTime?: string
  status?: 'success' | 'failed' | 'pending'
  submitNo?: string
}

export interface DraftData {
  id: string
  templateId: string
  templateName: string
  data: Record<string, any>
  savedAt: string
}

export interface MobileSchemaPage {
  title: string
  fields: MobileField[]
}

export interface MobileField {
  key: string
  title: string
  type: FieldType
  componentType: string
  required: boolean
  placeholder: string
  defaultValue: any
  options: FieldOption[]
  validation: FieldValidation
  description: string
  disabled: boolean
  visible: boolean
  condition?: FieldCondition
}

export interface MobileSchema {
  templateId: string
  templateName: string
  pages: MobileSchemaPage[]
  validationMap: Record<string, FieldValidation>
}

export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}
