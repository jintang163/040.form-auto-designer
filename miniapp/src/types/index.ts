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

export type TrackEventType = 
  | 'form_start' 
  | 'form_complete' 
  | 'form_abandon' 
  | 'field_focus' 
  | 'field_blur' 
  | 'field_edit' 
  | 'field_error' 
  | 'save_draft' 
  | 'submit_form';

export interface FieldTrackEvent {
  fieldId: string;
  fieldLabel: string;
  fieldType: FieldType;
  focusAt?: number;
  blurAt?: number;
  duration?: number;
  editCount?: number;
  hasError?: boolean;
  errorMessage?: string;
  value?: string | string[] | number;
}

export interface FormTrackSession {
  id: string;
  formId: string;
  templateId: string;
  templateName: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  fieldEvents: FieldTrackEvent[];
  networkStatus: NetworkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FormPerformanceStats {
  templateId: string;
  templateName: string;
  totalForms: number;
  completedForms: number;
  abandonedForms: number;
  abandonmentRate: number;
  avgCompletionTime: number;
  medianCompletionTime: number;
  minCompletionTime: number;
  maxCompletionTime: number;
  fieldStats: Record<string, FieldPerformanceStats>;
  lastUpdated: string;
}

export interface FieldPerformanceStats {
  fieldId: string;
  fieldLabel: string;
  fieldType: FieldType;
  totalInteractions: number;
  avgDuration: number;
  medianDuration: number;
  errorRate: number;
  totalErrors: number;
  editCount: number;
  abandonmentCount: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'field' | 'form' | 'flow';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion: string;
  affectedFields?: string[];
  metricName: string;
  currentValue: number;
  threshold: number;
  createdAt: string;
}

export interface FormAnalyticsData {
  overview: {
    totalForms: number;
    completionRate: number;
    avgTime: number;
    trend: 'up' | 'down' | 'stable';
  };
  templateStats: FormPerformanceStats[];
  suggestions: OptimizationSuggestion[];
}
