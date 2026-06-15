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
  if (res.code !== 0) throw new Error(res.message);
  return res.data;
}

export const templateApi = {
  getTemplates: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    request.get<any, ApiResponse<PaginatedResult<FormTemplate>>>('/templates', { params }).then(unwrap),

  getTemplate: (id: string) =>
    request.get<any, ApiResponse<FormTemplate>>(`/templates/${id}`).then(unwrap),

  createTemplate: (data: Partial<FormTemplate>) =>
    request.post<any, ApiResponse<FormTemplate>>('/templates', data).then(unwrap),

  updateTemplate: (id: string, data: Partial<FormTemplate>) =>
    request.put<any, ApiResponse<FormTemplate>>(`/templates/${id}`, data).then(unwrap),

  deleteTemplate: (id: string) =>
    request.delete<any, ApiResponse<void>>(`/templates/${id}`).then(unwrap),

  publishTemplate: (id: string) =>
    request.post<any, ApiResponse<FormTemplate>>(`/templates/${id}/publish`).then(unwrap),

  copyTemplate: (id: string) =>
    request.post<any, ApiResponse<FormTemplate>>(`/templates/${id}/copy`).then(unwrap),
};

export const fieldApi = {
  getFields: (templateId: string) =>
    request.get<any, ApiResponse<FormField[]>>(`/templates/${templateId}/fields`).then(unwrap),

  updateField: (templateId: string, fieldId: string, data: Partial<FieldConfig>) =>
    request.put<any, ApiResponse<FormField>>(`/templates/${templateId}/fields/${fieldId}`, data).then(unwrap),

  batchUpdateFields: (templateId: string, fields: Partial<FieldConfig>[]) =>
    request.put<any, ApiResponse<FormField[]>>(`/templates/${templateId}/fields/batch`, { fields }).then(unwrap),

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
  submitFormData: (templateId: string, data: Record<string, any>) =>
    request.post<any, ApiResponse<FormData>>(`/form-data/${templateId}`, data).then(unwrap),

  getFormDataList: (templateId: string, params?: { page?: number; pageSize?: number }) =>
    request.get<any, ApiResponse<PaginatedResult<FormData>>>(`/form-data/${templateId}/list`, { params }).then(unwrap),

  getFormDataDetail: (formDataId: string) =>
    request.get<any, ApiResponse<FormData>>(`/form-data/${formDataId}`).then(unwrap),
};

export const versionApi = {
  getVersions: (templateId: string) =>
    request.get<any, ApiResponse<FormVersion[]>>(`/templates/${templateId}/versions`).then(unwrap),

  createVersion: (templateId: string, changelog?: string) =>
    request.post<any, ApiResponse<FormVersion>>(`/templates/${templateId}/versions`, { changelog }).then(unwrap),

  getVersion: (templateId: string, versionId: string) =>
    request.get<any, ApiResponse<FormVersion>>(`/templates/${templateId}/versions/${versionId}`).then(unwrap),
};
