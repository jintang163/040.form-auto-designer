export interface PrintTemplate {
  id: number;
  templateId: number;
  templateName: string;
  templateCode: string;
  templateType: 'NORMAL' | 'PREPRINT';
  templateContent?: string;
  paperSize: string;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  watermarkEnabled: boolean;
  watermarkText?: string;
  watermarkOpacity: number;
  watermarkRotation: number;
  watermarkFontSize: number;
  watermarkColor: string;
  headerEnabled: boolean;
  headerContent?: string;
  footerEnabled: boolean;
  footerContent?: string;
  backgroundImageUrl?: string;
  backgroundFixed: boolean;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrintTemplateDTO {
  id?: number;
  templateId: number;
  templateName: string;
  templateCode: string;
  templateType?: 'NORMAL' | 'PREPRINT';
  templateContent?: string;
  paperSize?: string;
  orientation?: 'PORTRAIT' | 'LANDSCAPE';
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  watermarkFontSize?: number;
  watermarkColor?: string;
  headerEnabled?: boolean;
  headerContent?: string;
  footerEnabled?: boolean;
  footerContent?: string;
  backgroundImageUrl?: string;
  backgroundFixed?: boolean;
  isDefault?: boolean;
  status?: string;
}

export interface PrintRecord {
  id: number;
  printTemplateId: number;
  formDataId: number;
  templateId: number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  printType: string;
  printCount: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PdfExportRequest {
  formDataId: number;
  printTemplateId?: number;
  printTemplateCode?: string;
  saveToServer?: boolean;
  customFileName?: string;
  excludeFields?: string[];
  watermarkText?: string;
}

export interface BatchPdfExportRequest {
  formDataIds: number[];
  printTemplateId?: number;
  printTemplateCode?: string;
  mergeIntoSingleFile: boolean;
  customFileName?: string;
}
