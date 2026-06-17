import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResult,
  FormTemplate,
  FormField,
  FormData,
  FormVersion,
  RecognitionResult,
  FieldConfig,
  VersionCompareResult,
  RollbackResult,
  StatisticsDashboard,
  FieldDistribution,
  NumericAggregation,
  WebhookRule,
  FormRecommendation,
  FieldRecommendation,
  SysTenant,
  SysTenantQuota,
  SysTenantUser,
  LoginResponse,
  OcrResult,
  OcrDocType,
  LinkageRule,
  LinkageEvaluateResult,
  FieldValidationResult,
  FormValidationResult,
  FieldValidateRequest,
  FormValidateRequest,
  ContextRecommendation,
  AddressSuggestion,
} from '@/types';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('currentTenantId');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.message || error.message;
    return Promise.reject(new Error(msg));
  },
);

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.code !== 0 && res.code !== 200) throw new Error(res.message);
  return res.data;
}

function mapTemplateFromBackend(t: any): FormTemplate {
  return {
    id: String(t.id),
    name: t.templateName,
    code: t.templateCode,
    description: t.description,
    version: t.version,
    status: t.status as FormTemplate['status'],
    schemaJson: t.schemaJson,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function mapTemplateToBackend(t: Partial<FormTemplate> & { changeLog?: string }): any {
  return {
    templateName: t.name,
    templateCode: t.code,
    description: t.description,
    schemaJson: t.schemaJson,
    status: t.status,
    changeLog: t.changeLog,
  };
}

function mapWebhookFromBackend(w: any): WebhookRule {
  return {
    id: String(w.id),
    ruleName: w.ruleName,
    templateId: String(w.templateId),
    webhookUrl: w.webhookUrl,
    httpMethod: w.httpMethod,
    headersJson: w.headersJson || '',
    enabled: !!w.enabled,
    createdBy: w.createdBy || '',
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export const templateApi = {
  getTemplates: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    request
      .get<any, ApiResponse<any>>('/templates', { params })
      .then(unwrap)
      .then((r) => {
        if (Array.isArray(r)) {
          return {
            list: r.map(mapTemplateFromBackend),
            total: r.length,
            page: params?.page || 1,
            pageSize: params?.pageSize || r.length,
          };
        }
        return {
          list: r.list?.map(mapTemplateFromBackend) || [],
          total: r.total || 0,
          page: r.page || params?.page || 1,
          pageSize: r.pageSize || params?.pageSize || 10,
        };
      }),

  getTemplate: (id: string) =>
    request.get<any, ApiResponse<any>>(`/templates/${id}`).then(unwrap).then(mapTemplateFromBackend),

  createTemplate: (data: Partial<FormTemplate> & { changeLog?: string }) =>
    request
      .post<any, ApiResponse<any>>('/templates', mapTemplateToBackend(data))
      .then(unwrap)
      .then(mapTemplateFromBackend),

  updateTemplate: (id: string, data: Partial<FormTemplate> & { changeLog?: string }) =>
    request
      .put<any, ApiResponse<any>>(`/templates/${id}`, mapTemplateToBackend(data))
      .then(unwrap)
      .then(mapTemplateFromBackend),

  deleteTemplate: (id: string) =>
    request.delete<any, ApiResponse<void>>(`/templates/${id}`).then(unwrap),

  publishTemplate: (id: string) =>
    request
      .post<any, ApiResponse<any>>(`/templates/${id}/publish`)
      .then(unwrap)
      .then(mapTemplateFromBackend),

  copyTemplate: (id: string) =>
    request
      .post<any, ApiResponse<any>>(`/templates/${id}/copy`)
      .then(unwrap)
      .then(mapTemplateFromBackend),
};

export const fieldApi = {
  getFields: (templateId: string) =>
    request
      .get<any, ApiResponse<any[]>>(`/templates/${templateId}/fields`)
      .then(unwrap)
      .then((list) => list.map(mapFieldFromBackend)),

  updateField: (templateId: string, fieldId: string, data: Partial<FieldConfig>) =>
    request
      .put<any, ApiResponse<any>>(`/templates/${templateId}/fields/${fieldId}`, data)
      .then(unwrap)
      .then(mapFieldFromBackend),

  batchUpdateFields: (templateId: string, fields: Partial<FieldConfig>[]) =>
    request
      .put<any, ApiResponse<any[]>>(`/templates/${templateId}/fields/batch`, { fields })
      .then(unwrap)
      .then((list) => list.map(mapFieldFromBackend)),

  deleteField: (templateId: string, fieldId: string) =>
    request.delete<any, ApiResponse<void>>(`/templates/${templateId}/fields/${fieldId}`).then(unwrap),
};

export const fileApi = {
  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request.post<any, ApiResponse<{ fileId: string; url: string }>>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
};

export const recognitionApi = {
  startRecognition: (fileId: string) =>
    request.post<any, ApiResponse<RecognitionResult>>('/recognition/start', { fileId }).then(unwrap),

  getRecognitionStatus: (recognitionId: string) =>
    request.get<any, ApiResponse<RecognitionResult>>(`/recognition/${recognitionId}/status`).then(unwrap),

  getRecognitionResult: (recognitionId: string) =>
    request.get<any, ApiResponse<RecognitionResult>>(`/recognition/${recognitionId}/result`).then(unwrap),
};

export const ocrApi = {
  recognize: (file: File, docType: OcrDocType = 'AUTO') => {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    return request.post<any, ApiResponse<OcrResult>>('/ocr/recognize', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
};

export const formDataApi = {
  submitFormData: (templateId: string, data: Record<string, any>, submitterId?: string) => {
    const fieldValues: Record<string, any> = {};
    let sid = submitterId;
    Object.entries(data).forEach(([k, v]) => {
      if (k === '__submitterId') {
        sid = String(v);
      } else {
        fieldValues[k] = v;
      }
    });
    return request.post<any, ApiResponse<FormData>>('/form-data', {
      templateId: Number(templateId),
      fieldValuesJson: JSON.stringify(fieldValues),
      submitterId: sid,
    }).then(unwrap);
  },

  getFormDataList: (templateId: string, params?: { page?: number; pageSize?: number }) =>
    request.get<any, ApiResponse<PaginatedResult<FormData>>>(`/form-data/${templateId}/list`, { params }).then(unwrap),

  getFormDataListPaged: (templateId: string, params?: {
    page?: number; pageSize?: number; fieldName?: string; fieldValue?: string;
  }) =>
    request.get<any, ApiResponse<any>>(`/form-data/template/${templateId}/paged`, { params }).then(unwrap),

  getFormDataDetail: (formDataId: string) =>
    request.get<any, ApiResponse<FormData>>(`/form-data/${formDataId}`).then(unwrap),

  exportExcel: (templateId: string, params?: { fieldName?: string; fieldValue?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.fieldName) searchParams.set('fieldName', params.fieldName);
    if (params?.fieldValue) searchParams.set('fieldValue', params.fieldValue);
    const qs = searchParams.toString();
    const url = `/api/form-data/template/${templateId}/export${qs ? '?' + qs : ''}`;
    window.open(url, '_blank');
  },
};

export const statisticsApi = {
  getDashboard: (templateId?: number) =>
    request.get<any, ApiResponse<StatisticsDashboard>>('/statistics/dashboard', {
      params: templateId ? { templateId } : {},
    }).then(unwrap),

  getFieldDistribution: (templateId: number, fieldName: string) =>
    request.get<any, ApiResponse<FieldDistribution>>('/statistics/field-distribution', {
      params: { templateId, fieldName },
    }).then(unwrap),

  getNumericAggregation: (templateId: number, fieldName: string) =>
    request.get<any, ApiResponse<NumericAggregation>>('/statistics/numeric-aggregation', {
      params: { templateId, fieldName },
    }).then(unwrap),
};

export const recommendApi = {
  getFormRecommendations: (templateId: string, submitterId?: string) =>
    request.get<any, ApiResponse<FormRecommendation>>(`/smart-recommend/form/${templateId}`, {
      params: submitterId ? { submitterId } : {},
    }).then(unwrap),

  getFieldRecommendations: (templateId: string, fieldName: string, submitterId?: string) =>
    request.get<any, ApiResponse<FieldRecommendation[]>>('/smart-recommend/field', {
      params: { templateId, fieldName, ...(submitterId ? { submitterId } : {}) },
    }).then(unwrap),

  rebuildStats: (templateId: string) =>
    request.post<any, ApiResponse<void>>(`/smart-recommend/rebuild/${templateId}`).then(unwrap),
};

export const validationApi = {
  validateField: (data: FieldValidateRequest) =>
    request.post<any, ApiResponse<FieldValidationResult>>('/validation/field', data).then(unwrap),

  validateForm: (data: FormValidateRequest) =>
    request.post<any, ApiResponse<FormValidationResult>>('/validation/form', data).then(unwrap),

  getBuiltinRules: () =>
    request.get<any, ApiResponse<any[]>>('/validation/rules/builtin').then(unwrap),

  getFieldRules: (templateId: string, fieldName: string) =>
    request.get<any, ApiResponse<any[]>>('/validation/rules/field', {
      params: { templateId, fieldName },
    }).then(unwrap),

  autoCorrectValue: (templateId: string, fieldName: string, value: any) =>
    request.post<any, ApiResponse<{ correctedValue?: string }>>(
      `/validation/auto-correct?templateId=${templateId}&fieldName=${fieldName}`,
      { value }
    ).then(unwrap),
};

export const aiRecommendApi = {
  getContextRecommendations: (data: {
    filledFields: Record<string, any>;
    fieldDefinitions?: { fieldName: string; fieldLabel?: string; inputType?: string }[];
    targetFields?: string[];
    excludeFields?: string[];
  }) =>
    request.post<any, ApiResponse<ContextRecommendation[]>>(
      'http://localhost:5000/api/recommend/context',
      data
    ).then(unwrap),

  completeAddress: (data: {
    partialAddress: string;
    province?: string;
    city?: string;
    limit?: number;
  }) =>
    request.post<any, ApiResponse<{ suggestions: AddressSuggestion[] }>>(
      'http://localhost:5000/api/recommend/address/complete',
      data
    ).then(unwrap),
};

export const webhookApi = {
  createRule: (data: Partial<WebhookRule>) =>
    request.post<any, ApiResponse<any>>('/webhook-rules', {
      ruleName: data.ruleName,
      templateId: data.templateId,
      webhookUrl: data.webhookUrl,
      httpMethod: data.httpMethod || 'POST',
      headersJson: data.headersJson,
    }).then(unwrap).then(mapWebhookFromBackend),

  getRules: (templateId?: string) =>
    templateId
      ? request.get<any, ApiResponse<any[]>>(`/webhook-rules/template/${templateId}`).then(unwrap).then((l) => l.map(mapWebhookFromBackend))
      : request.get<any, ApiResponse<any[]>>('/webhook-rules').then(unwrap).then((l) => l.map(mapWebhookFromBackend)),

  updateRule: (id: string, data: Partial<WebhookRule>) =>
    request.put<any, ApiResponse<any>>(`/webhook-rules/${id}`, {
      ruleName: data.ruleName,
      webhookUrl: data.webhookUrl,
      httpMethod: data.httpMethod,
      headersJson: data.headersJson,
      enabled: data.enabled,
    }).then(unwrap).then(mapWebhookFromBackend),

  deleteRule: (id: string) =>
    request.delete<any, ApiResponse<void>>(`/webhook-rules/${id}`).then(unwrap),
};

function mapVersionFromBackend(v: any): FormVersion {
  return {
    id: String(v.id),
    templateId: String(v.templateId),
    version: v.version,
    schemaJson: v.schemaJson,
    fieldsJson: v.fieldsJson,
    changeLog: v.changeLog,
    createdAt: v.createdAt,
  };
}

function mapFieldFromBackend(f: any): FormField {
  return {
    id: String(f.id),
    templateId: String(f.templateId),
    fieldName: f.fieldName,
    fieldLabel: f.fieldLabel,
    fieldType: f.fieldType || 'string',
    inputType: f.inputType || 'text',
    required: f.required || false,
    defaultValue: f.defaultValue,
    validationRules: f.validationRules ? (typeof f.validationRules === 'string' ? JSON.parse(f.validationRules) : f.validationRules) : [],
    sortOrder: f.sortOrder ?? 0,
    layoutConfig: f.layoutConfig ? (typeof f.layoutConfig === 'string' ? JSON.parse(f.layoutConfig) : f.layoutConfig) : { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
    createdAt: f.createdAt || new Date().toISOString(),
    updatedAt: f.updatedAt || new Date().toISOString(),
  };
}

export const versionApi = {
  getVersions: (templateId: string) =>
    request
      .get<any, ApiResponse<any[]>>(`/templates/${templateId}/versions`)
      .then(unwrap)
      .then((list) => list.map(mapVersionFromBackend)),

  createVersion: (templateId: string, changeLog?: string) =>
    request
      .post<any, ApiResponse<any>>(`/templates/${templateId}/versions`, { changeLog })
      .then(unwrap)
      .then(mapVersionFromBackend),

  getVersion: (templateId: string, version: number) =>
    request
      .get<any, ApiResponse<any>>(`/templates/${templateId}/versions/${version}`)
      .then(unwrap)
      .then(mapVersionFromBackend),

  compareVersions: (templateId: string, sourceVersion: number, targetVersion: number) =>
    request
      .get<any, ApiResponse<any>>(`/templates/${templateId}/versions/compare`, {
        params: { sourceVersion, targetVersion },
      })
      .then(unwrap)
      .then((r) => ({
        sourceVersion: mapVersionFromBackend(r.sourceVersion),
        targetVersion: mapVersionFromBackend(r.targetVersion),
        addedFields: r.addedFields,
        removedFields: r.removedFields,
        modifiedFields: r.modifiedFields,
      })),

  rollbackVersion: (templateId: string, targetVersion: number, changeLog?: string) =>
    request
      .post<any, ApiResponse<any>>(`/templates/${templateId}/versions/rollback`, {
        targetVersion,
        changeLog,
      })
      .then(unwrap)
      .then((r): RollbackResult => ({
        template: mapTemplateFromBackend(r.template),
        fields: (r.fields || []).map(mapFieldFromBackend),
        newVersion: r.newVersion,
      })),
};

function mapTenantFromBackend(t: any): SysTenant {
  return {
    id: t.id,
    tenantCode: t.tenantCode,
    tenantName: t.tenantName,
    description: t.description,
    tablePrefix: t.tablePrefix,
    adminUser: t.adminUser,
    adminEmail: t.adminEmail,
    adminPhone: t.adminPhone,
    status: t.status,
    isSystem: t.isSystem,
    expiredAt: t.expiredAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export const tenantApi = {
  listTenants: () =>
    request.get<any, ApiResponse<any[]>>('/tenants').then(unwrap).then((l) => (l || []).map(mapTenantFromBackend)),

  listActiveTenants: () =>
    request.get<any, ApiResponse<any[]>>('/tenants/active').then(unwrap).then((l) => (l || []).map(mapTenantFromBackend)),

  getTenant: (id: number) =>
    request.get<any, ApiResponse<any>>(`/tenants/${id}`).then(unwrap).then(mapTenantFromBackend),

  createTenant: (data: Partial<SysTenant> & { maxTemplates?: number; maxFormSubmissions?: number; maxStorageMb?: number }) =>
    request.post<any, ApiResponse<any>>('/tenants', {
      tenantCode: data.tenantCode,
      tenantName: data.tenantName,
      description: data.description,
      tablePrefix: data.tablePrefix,
      adminUser: data.adminUser,
      adminEmail: data.adminEmail,
      adminPhone: data.adminPhone,
      maxTemplates: data.maxTemplates,
      maxFormSubmissions: data.maxFormSubmissions,
      maxStorageMb: data.maxStorageMb,
    }).then(unwrap).then(mapTenantFromBackend),

  updateTenant: (id: number, data: Partial<SysTenant>) =>
    request.put<any, ApiResponse<any>>(`/tenants/${id}`, {
      tenantName: data.tenantName,
      description: data.description,
      adminEmail: data.adminEmail,
      adminPhone: data.adminPhone,
      status: data.status,
    }).then(unwrap).then(mapTenantFromBackend),

  deleteTenant: (id: number) =>
    request.delete<any, ApiResponse<void>>(`/tenants/${id}`).then(unwrap),

  getQuota: (tenantId: number) =>
    request.get<any, ApiResponse<SysTenantQuota>>(`/tenants/${tenantId}/quota`).then(unwrap),

  updateQuota: (tenantId: number, data: Partial<SysTenantQuota>) =>
    request.put<any, ApiResponse<SysTenantQuota>>(`/tenants/${tenantId}/quota`, data).then(unwrap),

  getTenantUsers: (tenantId: number) =>
    request.get<any, ApiResponse<SysTenantUser[]>>(`/tenants/${tenantId}/users`).then(unwrap),

  addUserToTenant: (tenantId: number, userId: string, userName: string, role: string = 'USER') =>
    request.post<any, ApiResponse<SysTenantUser>>(`/tenants/${tenantId}/users`, null, {
      params: { userId, userName, role },
    }).then(unwrap),

  removeUserFromTenant: (tenantId: number, userId: string) =>
    request.delete<any, ApiResponse<void>>(`/tenants/${tenantId}/users/${userId}`).then(unwrap),

  getCurrentUserTenants: () =>
    request.get<any, ApiResponse<SysTenantUser[]>>('/tenants/current/user-tenants').then(unwrap),

  checkQuota: (tenantId: number, type: string) =>
    request.get<any, ApiResponse<boolean>>(`/tenants/${tenantId}/check-quota`, { params: { type } }).then(unwrap),
};

function mapLinkageRuleFromBackend(r: any): LinkageRule {
  return {
    id: String(r.id),
    templateId: String(r.templateId),
    ruleName: r.ruleName,
    ruleType: r.ruleType,
    sourceField: r.sourceField || '',
    targetField: r.targetField,
    conditionExpr: r.conditionExpr,
    actionType: r.actionType,
    actionValue: r.actionValue,
    expression: r.expression,
    dynamicOptionsUrl: r.dynamicOptionsUrl,
    sortOrder: r.sortOrder ?? 0,
    enabled: !!r.enabled,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const linkageApi = {
  createRule: (data: Partial<LinkageRule>) =>
    request.post<any, ApiResponse<any>>('/linkage-rules', data).then(unwrap).then(mapLinkageRuleFromBackend),

  updateRule: (id: string, data: Partial<LinkageRule>) =>
    request.put<any, ApiResponse<any>>('/linkage-rules', { ...data, id: Number(id) }).then(unwrap).then(mapLinkageRuleFromBackend),

  deleteRule: (id: string) =>
    request.delete<any, ApiResponse<void>>(`/linkage-rules/${id}`).then(unwrap),

  getRule: (id: string) =>
    request.get<any, ApiResponse<any>>(`/linkage-rules/${id}`).then(unwrap).then(mapLinkageRuleFromBackend),

  listByTemplate: (templateId: string) =>
    request.get<any, ApiResponse<any[]>>(`/linkage-rules/template/${templateId}`).then(unwrap).then((l) => (l || []).map(mapLinkageRuleFromBackend)),

  listAll: () =>
    request.get<any, ApiResponse<any[]>>('/linkage-rules').then(unwrap).then((l) => (l || []).map(mapLinkageRuleFromBackend)),

  evaluate: (templateId: string, sourceField: string, fieldValues: Record<string, any>) =>
    request.post<any, ApiResponse<LinkageEvaluateResult[]>>('/linkage-rules/evaluate', {
      templateId: Number(templateId),
      sourceField,
      fieldValues,
    }).then(unwrap),

  evaluateAll: (templateId: string, fieldValues: Record<string, any>) =>
    request.post<any, ApiResponse<LinkageEvaluateResult[]>>('/linkage-rules/evaluate', {
      templateId: Number(templateId),
      fieldValues,
    }).then(unwrap),
};

export const authApi = {
  login: (userId: string, password: string) =>
    request
      .post<any, ApiResponse<LoginResponse>>('/auth/login', { userId, password })
      .then(unwrap),

  logout: () =>
    request.post<any, ApiResponse<void>>('/auth/logout').then(unwrap),

  validate: () =>
    request.get<any, ApiResponse<boolean>>('/auth/validate').then(unwrap),
};
