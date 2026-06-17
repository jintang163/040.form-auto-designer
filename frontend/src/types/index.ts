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
    operator: 'eq' | 'ne' | 'contains' | 'gt' | 'lt';
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

export interface ServerValidationError {
  errorCode: string;
  errorMessage: string;
  ruleType: string;
  severity: number;
}

export interface ValidationSuggestion {
  suggestionType: string;
  suggestionMessage: string;
  suggestedValue: string;
  confidence: number;
  source: string;
}

export interface FieldValidationResult {
  fieldName: string;
  fieldLabel?: string;
  valid: boolean;
  errors: ServerValidationError[];
  suggestions: ValidationSuggestion[];
  autoCorrectedValue?: string;
}

export interface FormValidationResult {
  templateId: number;
  overallValid: boolean;
  fieldResults: FieldValidationResult[];
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
}

export interface FieldValidateRequest {
  templateId: number;
  fieldName: string;
  fieldValue?: any;
  contextData?: Record<string, any>;
  submitterId?: string;
  enableSuggestions?: boolean;
  enableAutoCorrect?: boolean;
}

export interface FormValidateRequest {
  templateId: number;
  fieldValues: Record<string, any>;
  submitterId?: string;
  enableSuggestions?: boolean;
  enableAutoCorrect?: boolean;
  partialValidation?: boolean;
}

export interface ContextRecommendation {
  targetField: string;
  suggestedValue: any;
  confidence: number;
  source: string;
  explanation: string;
  relatedFields: string[];
}

export interface AddressSuggestion {
  fullAddress: string;
  province: string;
  city: string;
  district: string;
  confidence: number;
}

export interface WorkflowProcess {
  id: string;
  templateId: string;
  processKey: string;
  processName: string;
  processDefinitionId?: string;
  formVariableMapping?: string;
  multiInstanceType: number;
  assignees: string[];
  approvalLevels: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface WorkflowTask {
  taskId: string;
  taskName: string;
  assignee: string;
  action?: 'APPROVE' | 'REJECT';
  comment?: string;
  approvalLevel: number;
  claimedAt?: string;
  completedAt?: string;
}

export interface WorkflowInstance {
  id: string;
  formDataId: string;
  templateId: string;
  processInstanceId: string;
  status: 'RUNNING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submitterId: string;
  currentAssignee?: string;
  currentLevel: number;
  startTime: string;
  endTime?: string;
  outcome?: string;
  tasks: WorkflowTask[];
  processVariables?: Record<string, any>;
}

export interface WorkflowDeployRequest {
  templateId: number;
  processKey: string;
  processName: string;
  bpmnXml?: string;
  formVariableMapping?: string;
  multiInstanceType?: number;
  assignees: string[];
  approvalLevels?: number;
}

export interface WorkflowStartRequest {
  formDataId: number;
  templateId: number;
  submitterId?: string;
  variables?: Record<string, any>;
}

export interface WorkflowActionRequest {
  taskId: string;
  action: 'APPROVE' | 'REJECT';
  assignee?: string;
  comment?: string;
  outcome?: string;
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

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type TenantUserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'USER';

export interface SysTenant {
  id: number;
  tenantCode: string;
  tenantName: string;
  description?: string;
  tablePrefix?: string;
  adminUser?: string;
  adminEmail?: string;
  adminPhone?: string;
  status: TenantStatus;
  isSystem: number;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SysTenantQuota {
  id: number;
  tenantId: number;
  maxTemplates: number;
  maxFieldsPerTemplate: number;
  maxFormSubmissions: number;
  maxStorageMb: number;
  maxApiCallsDaily: number;
  maxWebhookRules: number;
  currentTemplates: number;
  currentFormSubmissions: number;
  currentStorageMb: number;
  currentApiCallsDaily: number;
  currentApiCallsDate?: string;
}

export interface SysTenantUser {
  id: number;
  tenantId: number;
  userId: string;
  userName?: string;
  role: TenantUserRole;
  joinedAt: string;
}

export interface LoginRequest {
  userId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  userName: string;
  role: TenantUserRole;
  email?: string;
  avatarUrl?: string;
  tenants: SysTenantUser[];
}

export type OcrDocType = 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'BUSINESS_LICENSE' | 'AUTO';

export interface OcrFieldItem {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  inputType: InputType;
  defaultValue?: string;
  required?: boolean;
  sortOrder?: number;
}

export interface OcrResult {
  success: boolean;
  message?: string;
  docType?: OcrDocType;
  fields?: Record<string, string>;
  rawJson?: string;
  fieldItems?: OcrFieldItem[];
}

export type LinkageRuleType = 'SHOW' | 'HIDE' | 'COMPUTE' | 'DYNAMIC_OPTIONS' | 'REQUIRED' | 'DISABLED';

export interface LinkageRule {
  id: string;
  templateId: string;
  ruleName: string;
  ruleType: LinkageRuleType;
  sourceField: string;
  targetField: string;
  conditionExpr?: string;
  actionType?: string;
  actionValue?: string;
  expression?: string;
  dynamicOptionsUrl?: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkageEvaluateResult {
  targetField: string;
  visible: boolean;
  computedValue?: any;
  dynamicOptions?: { label: string; value: string }[];
  required: boolean;
  disabled: boolean;
  message?: string;
}
