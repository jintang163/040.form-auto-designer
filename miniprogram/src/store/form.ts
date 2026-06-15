import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FormSchema, MobileSchema, DraftData } from '@/types'
import { getTemplateDetail } from '@/api'
import { adaptToMobileSchema } from '@/utils/schemaAdapter'

export const useFormStore = defineStore('form', () => {
  const currentSchema = ref<FormSchema | null>(null)
  const mobileSchema = ref<MobileSchema | null>(null)
  const formData = ref<Record<string, any>>({})
  const draftList = ref<DraftData[]>([])
  const submitLoading = ref(false)
  const currentPage = ref(0)

  async function loadTemplate(templateId: string) {
    const res = await getTemplateDetail(templateId)
    currentSchema.value = res.data
    mobileSchema.value = adaptToMobileSchema(res.data)
    const initialData: Record<string, any> = {}
    res.data.fields.forEach((f) => {
      initialData[f.key] = f.defaultValue ?? null
    })
    formData.value = initialData
    currentPage.value = 0
  }

  function updateFieldValue(key: string, value: any) {
    formData.value[key] = value
  }

  function resetForm() {
    currentSchema.value = null
    mobileSchema.value = null
    formData.value = {}
    currentPage.value = 0
  }

  function setDraftList(list: DraftData[]) {
    draftList.value = list
  }

  return {
    currentSchema,
    mobileSchema,
    formData,
    draftList,
    submitLoading,
    currentPage,
    loadTemplate,
    updateFieldValue,
    resetForm,
    setDraftList
  }
})
