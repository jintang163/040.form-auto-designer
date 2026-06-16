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
  fieldsJson?: string;
  changeLog?: string;
  createdAt: string;
}

export interface RollbackResult {
  template: FormTemplate;
  fields: FormField[];
  newVersion: number;
}

export interface FieldDiff {
  fieldName: string;
  fieldLabel: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  oldValue?: string;
  newValue?: string;
}

export interface VersionCompareResult {
  sourceVersion: FormVersion;
  targetVersion: FormVersion;
  addedFields: FieldDiff[];
  removedFields: FieldDiff[];
  modifiedFields: FieldDiff[];
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

export interface DistributionItem {
  value: string;
  label: string;
  count: number;
}

export interface FieldDistribution {
  fieldName: string;
  fieldLabel: string;
  items: DistributionItem[];
}

export interface NumericAggregation {
  fieldName: string;
  fieldLabel: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface TemplateRecordCount {
  templateId: number;
  templateName: string;
  count: number;
}

export interface SubmissionTrend {
  date: string;
  count: number;
}

export interface StatisticsDashboard {
  totalRecords: number;
  templateCounts: TemplateRecordCount[];
  fieldDistributions: FieldDistribution[];
  numericAggregations: NumericAggregation[];
  submissionTrend: SubmissionTrend[];
}

export interface WebhookRule {
  id: string;
  ruleName: string;
  templateId: string;
  webhookUrl: string;
  httpMethod: string;
  headersJson: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedItem {
  value: string;
  frequency: number;
  score: number;
  source: string;
}

export interface FieldRecommendation {
  fieldName: string;
  fieldLabel: string;
  inputType: string;
  recommendedValue: string;
  confidence: number;
  items: RecommendedItem[];
}

export interface FormRecommendation {
  templateId: number;
  submitterId: string;
  fields: FieldRecommendation[];
}
