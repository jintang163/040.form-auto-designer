import { create } from 'zustand';
import type { FormTemplate, FormData, FormImage, TaskStatus, SyncStatus } from '@/types';
import { formDataStorage, templateStorage } from '@/utils/storage';

interface FormState {
  templates: FormTemplate[];
  formDataList: FormData[];
  currentForm: FormData | null;
  currentTemplate: FormTemplate | null;
  loading: boolean;

  loadTemplates: () => void;
  loadFormData: () => void;
  setCurrentTemplate: (template: FormTemplate | null) => void;
  createNewForm: (templateId: string) => FormData | null;
  updateCurrentForm: (updates: Partial<FormData>) => void;
  updateField: (fieldId: string, value: string | string[] | number) => void;
  addImage: (fieldId: string, image: FormImage) => void;
  removeImage: (imageId: string) => void;
  saveDraft: () => boolean;
  submitForm: () => boolean;
  deleteForm: (formId: string) => void;
  getFormById: (formId: string) => FormData | undefined;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useFormStore = create<FormState>((set, get) => ({
  templates: [],
  formDataList: [],
  currentForm: null,
  currentTemplate: null,
  loading: false,

  loadTemplates: () => {
    const templates = templateStorage.getAll();
    set({ templates });
    console.log('[FormStore] Templates loaded:', templates.length);
  },

  loadFormData: () => {
    const formDataList = formDataStorage.getAll();
    set({ formDataList });
    console.log('[FormStore] Form data loaded:', formDataList.length);
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template });
  },

  createNewForm: (templateId) => {
    const { templates } = get();
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      console.error('[FormStore] Template not found:', templateId);
      return null;
    }

    const now = new Date().toISOString();
    const newForm: FormData = {
      id: generateId(),
      templateId: template.id,
      templateName: template.name,
      fields: {},
      images: [],
      status: 'in_progress',
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      retryCount: 0
    };

    template.fields.forEach((field) => {
      if (field.type === 'checkbox') {
        newForm.fields[field.id] = [];
      } else if (field.type === 'number') {
        newForm.fields[field.id] = '';
      } else {
        newForm.fields[field.id] = '';
      }
    });

    set({ currentForm: newForm, currentTemplate: template });
    console.log('[FormStore] New form created:', newForm.id);
    return newForm;
  },

  updateCurrentForm: (updates) => {
    const { currentForm } = get();
    if (!currentForm) return;

    const updated: FormData = {
      ...currentForm,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    set({ currentForm: updated });
  },

  updateField: (fieldId, value) => {
    const { currentForm } = get();
    if (!currentForm) return;

    const updated: FormData = {
      ...currentForm,
      fields: {
        ...currentForm.fields,
        [fieldId]: value
      },
      updatedAt: new Date().toISOString()
    };

    set({ currentForm: updated });
  },

  addImage: (fieldId, image) => {
    const { currentForm } = get();
    if (!currentForm) return;

    const updated: FormData = {
      ...currentForm,
      images: [...currentForm.images, image],
      updatedAt: new Date().toISOString()
    };

    set({ currentForm: updated });
  },

  removeImage: (imageId) => {
    const { currentForm } = get();
    if (!currentForm) return;

    const updated: FormData = {
      ...currentForm,
      images: currentForm.images.filter((img) => img.id !== imageId),
      updatedAt: new Date().toISOString()
    };

    set({ currentForm: updated });
  },

  saveDraft: () => {
    const { currentForm } = get();
    if (!currentForm) return false;

    const updated: FormData = {
      ...currentForm,
      status: 'pending' as TaskStatus,
      syncStatus: 'pending' as SyncStatus,
      updatedAt: new Date().toISOString()
    };

    formDataStorage.add(updated);
    set({
      currentForm: null,
      currentTemplate: null,
      formDataList: formDataStorage.getAll()
    });

    console.log('[FormStore] Draft saved:', updated.id);
    return true;
  },

  submitForm: () => {
    const { currentForm } = get();
    if (!currentForm) return false;

    const updated: FormData = {
      ...currentForm,
      status: 'pending' as TaskStatus,
      syncStatus: 'pending' as SyncStatus,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    formDataStorage.add(updated);
    set({
      currentForm: null,
      currentTemplate: null,
      formDataList: formDataStorage.getAll()
    });

    console.log('[FormStore] Form submitted:', updated.id);
    return true;
  },

  deleteForm: (formId) => {
    formDataStorage.remove(formId);
    set({
      formDataList: formDataStorage.getAll()
    });
    console.log('[FormStore] Form deleted:', formId);
  },

  getFormById: (formId) => {
    return get().formDataList.find((f) => f.id === formId);
  }
}));
