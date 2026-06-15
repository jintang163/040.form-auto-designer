import { create } from 'zustand';
import { templateApi, fieldApi } from '@/services/api';
import type { FormTemplate, FormField, FieldConfig, RecognitionResult } from '@/types';

interface FormStore {
  templates: FormTemplate[];
  templatesTotal: number;
  templatesLoading: boolean;
  currentTemplate: FormTemplate | null;
  fields: FormField[];
  fieldsLoading: boolean;
  recognition: RecognitionResult | null;
  recognitionLoading: boolean;
  selectedFieldId: string | null;

  fetchTemplates: (page?: number, pageSize?: number, keyword?: string) => Promise<void>;
  setCurrentTemplate: (template: FormTemplate | null) => void;
  fetchFields: (templateId: string) => Promise<void>;
  updateField: (templateId: string, fieldId: string, data: Partial<FieldConfig>) => Promise<void>;
  batchUpdateFields: (templateId: string, fields: Partial<FieldConfig>[]) => Promise<void>;
  deleteField: (templateId: string, fieldId: string) => Promise<void>;
  reorderFields: (templateId: string, reordered: FormField[]) => Promise<void>;
  setRecognition: (result: RecognitionResult | null) => void;
  setRecognitionLoading: (loading: boolean) => void;
  setSelectedFieldId: (id: string | null) => void;
  addFieldLocal: (field: FormField) => void;
  updateFieldLocal: (fieldId: string, data: Partial<FieldConfig>) => void;
  removeFieldLocal: (fieldId: string) => void;
}

export const useFormStore = create<FormStore>((set, get) => ({
  templates: [],
  templatesTotal: 0,
  templatesLoading: false,
  currentTemplate: null,
  fields: [],
  fieldsLoading: false,
  recognition: null,
  recognitionLoading: false,
  selectedFieldId: null,

  fetchTemplates: async (page = 1, pageSize = 10, keyword?) => {
    set({ templatesLoading: true });
    try {
      const result = await templateApi.getTemplates({ page, pageSize, keyword });
      set({ templates: result.list, templatesTotal: result.total });
    } finally {
      set({ templatesLoading: false });
    }
  },

  setCurrentTemplate: (template) => set({ currentTemplate: template }),

  fetchFields: async (templateId) => {
    set({ fieldsLoading: true });
    try {
      const fields = await fieldApi.getFields(templateId);
      set({ fields });
    } finally {
      set({ fieldsLoading: false });
    }
  },

  updateField: async (templateId, fieldId, data) => {
    const updated = await fieldApi.updateField(templateId, fieldId, data);
    set((s) => ({
      fields: s.fields.map((f) => (f.id === fieldId ? updated : f)),
    }));
  },

  batchUpdateFields: async (templateId, fields) => {
    const updated = await fieldApi.batchUpdateFields(templateId, fields);
    set({ fields: updated });
  },

  deleteField: async (templateId, fieldId) => {
    await fieldApi.deleteField(templateId, fieldId);
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== fieldId),
      selectedFieldId: s.selectedFieldId === fieldId ? null : s.selectedFieldId,
    }));
  },

  reorderFields: async (templateId, reordered) => {
    set({ fields: reordered });
    const updates = reordered.map((f, i) => ({ ...f, sortOrder: i }));
    await fieldApi.batchUpdateFields(templateId, updates).catch(() => {
      const oldFields = get().fields;
      set({ fields: oldFields });
    });
  },

  setRecognition: (result) => set({ recognition: result }),
  setRecognitionLoading: (loading) => set({ recognitionLoading: loading }),
  setSelectedFieldId: (id) => set({ selectedFieldId: id }),

  addFieldLocal: (field) => set((s) => ({ fields: [...s.fields, field] })),

  updateFieldLocal: (fieldId, data) =>
    set((s) => ({
      fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...data } : f)),
    })),

  removeFieldLocal: (fieldId) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== fieldId),
      selectedFieldId: s.selectedFieldId === fieldId ? null : s.selectedFieldId,
    })),
}));
