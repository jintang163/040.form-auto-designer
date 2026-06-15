import type { ApiResponse, FormTemplate, FormSchema, FormSubmitData, DraftData } from '@/types'

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
