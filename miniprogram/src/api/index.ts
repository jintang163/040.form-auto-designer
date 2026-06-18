import type {
  ApiResponse,
  FormTemplate,
  FormSchema,
  FormSubmitData,
  DraftData,
  FieldValidationResult,
  FormValidationResult,
  FieldValidateRequest,
  FormValidateRequest,
  ValidationRule
} from '@/types'

const BASE_URL = ''

function getToken(): string {
  return uni.getStorageSync('token') || ''
}

function request<T>(options: UniApp.RequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      url: BASE_URL + options.url,
      header: {
        'Content-Type': 'application/json',
        Authorization: getToken() ? `Bearer ${getToken()}` : '',
        ...options.header
      },
      success: (res) => {
        const data = res.data as ApiResponse<T>
        if (data.code === 200 || data.code === 0) {
          resolve(data)
        } else if (data.code === 401) {
          uni.removeStorageSync('token')
          uni.showToast({ title: '登录已过期', icon: 'none' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' })
          }, 1500)
          reject(data)
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(data)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function getTemplateList(params?: { keyword?: string }) {
  return request<FormTemplate[]>({
    url: '/api/template/list',
    method: 'GET',
    data: params
  })
}

export function getTemplateDetail(id: string) {
  return request<FormSchema>({
    url: `/api/template/${id}`,
    method: 'GET'
  })
}

export function submitFormData(data: FormSubmitData) {
  return request<{ submitNo: string }>({
    url: '/api/form/submit',
    method: 'POST',
    data
  })
}

export function getFormDataList(params?: { templateId?: string; page?: number; size?: number }) {
  return request<{ list: FormSubmitData[]; total: number }>({
    url: '/api/form/list',
    method: 'GET',
    data: params
  })
}

export function saveDraft(data: DraftData) {
  return request<DraftData>({
    url: '/api/draft/save',
    method: 'POST',
    data
  })
}

export function getDraftList() {
  return request<DraftData[]>({
    url: '/api/draft/list',
    method: 'GET'
  })
}

export function deleteDraft(id: string) {
  return request<void>({
    url: `/api/draft/${id}`,
    method: 'DELETE'
  })
}

export function speechToText(filePath: string) {
  return new Promise<{ text: string; confidence: number }>((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/voice/speechToText',
      filePath,
      name: 'file',
      header: {
        Authorization: getToken() ? `Bearer ${getToken()}` : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data) as ApiResponse<{ text: string; confidence: number }>
          if (data.code === 200 || data.code === 0) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '语音识别失败'))
          }
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export function validateField(params: FieldValidateRequest) {
  return request<FieldValidationResult>({
    url: '/api/validation/field',
    method: 'POST',
    data: params
  })
}

export function validateForm(params: FormValidateRequest) {
  return request<FormValidationResult>({
    url: '/api/validation/form',
    method: 'POST',
    data: params
  })
}

export function getBuiltinValidationRules() {
  return request<ValidationRule[]>({
    url: '/api/validation/rules/builtin',
    method: 'GET'
  })
}

export function getFieldValidationRules(templateId: number, fieldName: string) {
  return request<ValidationRule[]>({
    url: '/api/validation/rules/field',
    method: 'GET',
    data: { templateId, fieldName }
  })
}

export function autoCorrectValue(templateId: number, fieldName: string, value: any) {
  return request<{ correctedValue?: string }>({
    url: `/api/validation/auto-correct?templateId=${templateId}&fieldName=${fieldName}`,
    method: 'POST',
    data: { value }
  })
}

export function getWorkflowProcess(templateId: number) {
  return request<any>({
    url: `/api/workflow/process/template/${templateId}`,
    method: 'GET'
  })
}

export function startWorkflow(data: {
  formDataId: number
  templateId: number
  submitterId?: string
  variables?: Record<string, any>
}) {
  return request<any>({
    url: '/api/workflow/start',
    method: 'POST',
    data
  })
}

export function approveWorkflow(data: {
  taskId: string
  action: 'APPROVE'
  comment?: string
}) {
  return request<any>({
    url: '/api/workflow/approve',
    method: 'POST',
    data
  })
}

export function rejectWorkflow(data: {
  taskId: string
  action: 'REJECT'
  comment?: string
}) {
  return request<any>({
    url: '/api/workflow/reject',
    method: 'POST',
    data
  })
}

export function getWorkflowInstanceByFormDataId(formDataId: number) {
  return request<any>({
    url: `/api/workflow/instance/form-data/${formDataId}`,
    method: 'GET'
  })
}

export function getMyPendingTasks(assignee: string) {
  return request<any[]>({
    url: '/api/workflow/my-pending',
    method: 'GET',
    data: { assignee }
  })
}

export function getMySubmitted(submitterId: string) {
  return request<any[]>({
    url: '/api/workflow/my-submitted',
    method: 'GET',
    data: { submitterId }
  })
}

export function deployWorkflow(data: {
  templateId: number
  processKey: string
  processName: string
  assignees: string[]
  multiInstanceType?: number
  formVariableMapping?: string
  approvalLevels?: number
}) {
  return request<any>({
    url: '/api/workflow/deploy',
    method: 'POST',
    data
  })
}

// ==================== 打印与PDF导出接口 ====================

export interface PrintTemplate {
  id: number
  templateId: number
  templateName: string
  templateCode: string
  templateType: 'NORMAL' | 'PREPRINT'
  paperSize: string
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  isDefault: boolean
  watermarkEnabled: boolean
  headerEnabled: boolean
  footerEnabled: boolean
  backgroundImageUrl?: string
}

export interface PdfExportRequest {
  formDataId: number
  printTemplateId?: number
  printTemplateCode?: string
  saveToServer?: boolean
  customFileName?: string
  excludeFields?: string[]
  watermarkText?: string
}

export function listPrintTemplates(templateId: number | string) {
  return request<PrintTemplate[]>({
    url: `/api/print-templates/template/${templateId}`,
    method: 'GET'
  })
}

export function getDefaultPrintTemplate(templateId: number | string) {
  return request<PrintTemplate>({
    url: `/api/print-templates/default/${templateId}`,
    method: 'GET'
  })
}

/**
 * 下载PDF文件，返回本地临时文件路径
 */
export function exportPdfDownload(params: PdfExportRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.downloadFile({
      url: BASE_URL + '/api/print/export-pdf',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      filePath: `${uni.env.USER_DATA_PATH}/form_${params.formDataId}_${Date.now()}.pdf`,
      formData: params as any,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error(`下载失败(${res.statusCode})`))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

/**
 * 以POST JSON方式请求并下载PDF（后端使用@RequestBody）
 */
export function exportPdf(params: PdfExportRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : String(v))}`)
      .join('&')
    uni.downloadFile({
      url: BASE_URL + `/api/print/export-pdf?${query}`,
      method: 'GET',
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error(`下载失败(${res.statusCode})`))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

/**
 * 打开PDF预览
 */
export function openPdfDocument(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => resolve(),
      fail: (err) => reject(err)
    })
  })
}

/**
 * 分享PDF文件给好友（微信）
 */
export function sharePdfFile(filePath: string, title?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.shareFileMessage({
      filePath,
      title: title || '表单数据PDF',
      success: () => resolve(),
      fail: (err) => reject(err)
    })
    // #endif
    // #ifndef MP-WEIXIN
    uni.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => resolve(),
      fail: (err) => reject(err)
    })
    // #endif
  })
}

/**
 * 保存PDF到服务器并返回文件信息
 */
export function savePdfToServer(
  formDataId: number | string,
  printTemplateId?: number,
  fileName?: string
) {
  return request<any>({
    url: `/api/print/${formDataId}/save-pdf`,
    method: 'POST',
    data: { printTemplateId, fileName }
  })
}

/**
 * 获取某条表单数据的打印/导出历史
 */
export function listPrintRecords(formDataId: number | string) {
  return request<any[]>({
    url: `/api/print/records/form-data/${formDataId}`,
    method: 'GET'
  })
}
