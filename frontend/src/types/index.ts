export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';

export type InputType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'fileUpload'
  | 'textarea';

export interface LayoutConfig {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface ValidationRule {
  type: 'regex' | 'lengthRange' | 'custom';
  value: string;
  message: string;
  min?: number;
  max?: number;
}

export interface FieldConfig {
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  inputType: InputType;
  required: boolean;
  defaultValue?: string;
  validationRules: ValidationRule[];
  sortOrder: number;
  layoutConfig: LayoutConfig;
  options?: { label: string; value: string }[];
  linkageCondition?: {
    field: string;
    operator: 'eq' | 'ne' | 'contains';
    value: string;
  }[];
}

export interface FormField extends FieldConfig {
  id: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface FormTemplate {
  id: string;
  name: string;
  code: string;
  version: number;
  status: TemplateStatus;
  schemaJson: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormVersion {
  id: string;
  templateId: string;
  version: number;
  schemaJson: string;
  changelog?: string;
  createdAt: string;
}

export type RecognitionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RecognitionResult {
  id: string;
  fileId: string;
  status: RecognitionStatus;
  progress: number;
  rawText?: string;
  fields: FieldConfig[];
  errorMessage?: string;
  createdAt: string;
}

export interface FormData {
  id: string;
  templateId: string;
  templateName: string;
  submitter: string;
  dataJson: string;
  createdAt: string;
}

export interface FormSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      title: string;
      required?: boolean;
      default?: any;
      'x-decorator'?: string;
      'x-component'?: string;
      'x-component-props'?: Record<string, any>;
      'x-decorator-props'?: Record<string, any>;
      'x-validator'?: any[];
      'x-reactions'?: any[];
      enum?: { label: string; value: string }[];
      properties?: Record<string, any>;
    }
  >;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}
