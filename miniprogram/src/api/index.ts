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
