export type NetworkStatus = 'online' | 'offline' | 'unknown';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'syncing' | 'failed';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'image' | 'location';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  downloaded?: boolean;
  downloadAt?: string;
  icon?: string;
}

export interface FormImage {
  id: string;
  localPath: string;
  remoteUrl?: string;
  name: string;
  size: number;
  uploaded: boolean;
  createdAt: string;
  fieldId: string;
}

export interface FormData {
  id: string;
  templateId: string;
  templateName: string;
  fields: Record<string, string | string[] | number>;
  images: FormImage[];
  status: TaskStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  syncedAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  errorMessage?: string;
  retryCount: number;
}

export interface SyncTask {
  id: string;
  formDataId: string;
  type: 'form' | 'image';
  status: SyncStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface SyncStats {
  total: number;
  pending: number;
  syncing: number;
  completed: number;
  failed: number;
}

export interface UserInfo {
  id: string;
  name: string;
  department: string;
  avatar?: string;
  lastLoginAt: string;
}

export interface StorageInfo {
  totalSize: number;
  usedSize: number;
  formCount: number;
  imageCount: number;
  templateCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
