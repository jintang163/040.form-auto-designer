import axios from 'axios';
import type {
  PrintTemplate,
  PrintTemplateDTO,
  PrintRecord,
  PdfExportRequest,
  BatchPdfExportRequest,
} from '../types/print';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const printTemplateApi = {
  create: (data: PrintTemplateDTO): Promise<PrintTemplate> =>
    api.post('/print-templates', data).then((res) => res.data.data),

  update: (id: number, data: PrintTemplateDTO): Promise<PrintTemplate> =>
    api.put(`/print-templates/${id}`, data).then((res) => res.data.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/print-templates/${id}`).then((res) => res.data.data),

  getById: (id: number): Promise<PrintTemplate> =>
    api.get(`/print-templates/${id}`).then((res) => res.data.data),

  getByCode: (code: string): Promise<PrintTemplate> =>
    api.get(`/print-templates/code/${code}`).then((res) => res.data.data),

  listByTemplateId: (templateId: number): Promise<PrintTemplate[]> =>
    api.get(`/print-templates/template/${templateId}`).then((res) => res.data.data),

  listAll: (): Promise<PrintTemplate[]> =>
    api.get('/print-templates').then((res) => res.data.data),

  getDefault: (templateId: number): Promise<PrintTemplate> =>
    api.get(`/print-templates/default/${templateId}`).then((res) => res.data.data),

  setDefault: (id: number): Promise<PrintTemplate> =>
    api.put(`/print-templates/${id}/set-default`).then((res) => res.data.data),

  generateDefaultContent: (templateId: number): Promise<{ templateContent: string }> =>
    api.post(`/print-templates/${templateId}/generate-default-content`).then((res) => res.data.data),
};

export const printApi = {
  exportPdf: (data: PdfExportRequest): Promise<Blob> =>
    api.post('/print/export-pdf', data, { responseType: 'blob' }),

  batchExportPdf: (data: BatchPdfExportRequest): Promise<Blob> =>
    api.post('/print/batch-export-pdf', data, { responseType: 'blob' }),

  generatePreview: (formDataId: number, printTemplateId?: number): Promise<{ previewUrl: string }> =>
    api
      .post('/print/generate-preview', null, {
        params: { formDataId, printTemplateId },
      })
      .then((res) => res.data.data),

  savePdf: (
    formDataId: number,
    printTemplateId?: number,
    fileName?: string
  ): Promise<PrintRecord> =>
    api
      .post(`/print/${formDataId}/save-pdf`, null, {
        params: { printTemplateId, fileName },
      })
      .then((res) => res.data.data),

  getRecordsByFormDataId: (formDataId: number): Promise<PrintRecord[]> =>
    api.get(`/print/records/form-data/${formDataId}`).then((res) => res.data.data),

  getRecordsByTemplateId: (templateId: number): Promise<PrintRecord[]> =>
    api.get(`/print/records/template/${templateId}`).then((res) => res.data.data),

  getRecordById: (id: number): Promise<PrintRecord> =>
    api.get(`/print/records/${id}`).then((res) => res.data.data),

  incrementPrintCount: (id: number): Promise<void> =>
    api.put(`/print/records/${id}/increment-count`).then((res) => res.data.data),
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
