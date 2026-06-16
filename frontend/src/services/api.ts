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
} from '@/types';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
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
