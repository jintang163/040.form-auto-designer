<template>
  <view class="fill-page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon size="48" />
      <text class="loading-text">加载表单中...</text>
    </view>

    <template v-else-if="mobileSchema">
      <FormPaginator
        :pages="mobileSchema.pages"
        :current-page="currentPage"
        @update:current-page="onPageChange"
      >
        <DynamicForm
          ref="dynamicFormRef"
          :fields="currentPageFields"
          v-model="formData"
          :errors="fieldErrors"
          :enable-voice="true"
          :voice-mock-mode="voiceMockMode"
          :enable-smart-validation="true"
          :template-id="templateId"
          :submitter-id="submitterId"
          @field-change="onFieldChange"
          @field-validated="onFieldValidated"
          @voice-fill="onVoiceFill"
          @voice-error="onVoiceError"
        />
      </FormPaginator>

      <view class="voice-fab">
        <VoiceInput
          :fields="allFields"
          :enable-multiple="true"
          :mock-mode="voiceMockMode"
          @fill="onGlobalVoiceFill"
          @error="onVoiceError"
        />
        <text class="voice-fab-tip">语音填充</text>
      </view>

      <view class="bottom-bar">
        <u-button
          v-if="mobileSchema.pages.length > 1 && currentPage > 0"
          type="info"
          :plain="true"
          text="上一页"
          size="large"
          @click="currentPage--"
        />
        <u-button
          type="warning"
          :plain="true"
          text="保存草稿"
          size="large"
          @click="onSaveDraft"
        />
        <u-button
          v-if="currentPage === mobileSchema.pages.length - 1"
          type="primary"
          text="提交"
          size="large"
          :loading="submitLoading"
          @click="onSubmit"
        />
        <u-button
          v-else
          type="primary"
          text="下一页"
          size="large"
          @click="currentPage++"
        />
      </view>
    </template>

    <view v-else class="empty-wrap">
      <u-empty text="表单加载失败" mode="error" />
      <u-button type="primary" text="返回首页" @click="goBack" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { useFormStore } from '@/store/form'
import { validateForm } from '@/utils/validator'
import { saveDraft } from '@/utils/draftManager'
import { submitFormData, validateForm as validateFormServer } from '@/api'
import DynamicForm from '@/components/DynamicForm.vue'
import FormPaginator from '@/components/FormPaginator.vue'
import VoiceInput from '@/components/VoiceInput.vue'
import type { ParsedVoiceResult } from '@/utils/voiceParser'
import type { FieldValidationResult } from '@/types'
import { getSubmitterId } from '@/utils/submitterId'

const store = useFormStore()
const loading = ref(false)
const currentPage = ref(0)
const fieldErrors = ref<Record<string, string>>({})
const dynamicFormRef = ref<InstanceType<typeof DynamicForm> | null>(null)
const showVoiceTip = ref(true)
const submitterId = ref(getSubmitterId())

const voiceMockMode = false

let templateId = ''
let templateName = ''

onLoad((options) => {
  templateId = options?.templateId || ''
  if (!templateId) {
    uni.showToast({ title: '缺少表单ID', icon: 'none' })
    setTimeout(goBack, 1500)
    return
  }
  loadForm()
})

onShareAppMessage(() => {
  return {
    title: templateName || '表单填报',
    path: `/pages/fill/index?templateId=${templateId}`
  }
})

async function loadForm() {
  loading.value = true
  try {
    await store.loadTemplate(templateId)
    templateName = store.currentSchema?.name || ''
    uni.setNavigationBarTitle({ title: templateName || '表单填报' })
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const mobileSchema = computed(() => store.mobileSchema)
const formData = computed({
  get: () => store.formData,
  set: (val) => {
    for (const [k, v] of Object.entries(val)) {
      store.updateFieldValue(k, v)
    }
  }
})
const submitLoading = computed(() => store.submitLoading)

const currentPageFields = computed(() => {
  if (!mobileSchema.value) return []
  return mobileSchema.value.pages[currentPage.value]?.fields || []
})

const allFields = computed(() => {
  if (!mobileSchema.value) return []
  return mobileSchema.value.pages.flatMap((page) => page.fields)
})

function onPageChange(page: number) {
  currentPage.value = page
}

function onFieldChange(key: string, value: any) {
  store.updateFieldValue(key, value)
  if (fieldErrors.value[key]) {
    const newErrors = { ...fieldErrors.value }
    delete newErrors[key]
    fieldErrors.value = newErrors
  }
}

function onFieldValidated(key: string, result: FieldValidationResult) {
  if (!result.valid && result.errors?.length > 0) {
    const firstError = result.errors.find(e => e.severity === 2) || result.errors[0]
    fieldErrors.value = {
      ...fieldErrors.value,
      [key]: firstError.errorMessage
    }
  } else if (fieldErrors.value[key]) {
    const newErrors = { ...fieldErrors.value }
    delete newErrors[key]
    fieldErrors.value = newErrors
  }

  if (result.suggestions?.length > 0 && result.valid) {
    const hasHighConfidence = result.suggestions.some(s => s.confidence >= 0.9)
    if (hasHighConfidence) {
      uni.vibrateShort({ type: 'light' })
    }
  }
}

function onVoiceFill(results: ParsedVoiceResult[]) {
  if (results.length > 0) {
    const fieldNames = results.map((r) => r.matchedField.title).join('、')
    uni.showToast({
      title: `已填充: ${fieldNames}`,
      icon: 'none',
      duration: 2000
    })
    saveDraft(templateId, templateName, store.formData)
  }
}

function onGlobalVoiceFill(results: ParsedVoiceResult[]) {
  if (results.length > 0 && dynamicFormRef.value) {
    dynamicFormRef.value.onVoiceFillMultiple(results)

    const firstResult = results[0]
    const targetPageIdx = mobileSchema.value?.pages.findIndex((page) =>
      page.fields.some((f) => f.key === firstResult.fieldKey)
    )
    if (targetPageIdx !== undefined && targetPageIdx >= 0 && targetPageIdx !== currentPage.value) {
      currentPage.value = targetPageIdx
      dynamicFormRef.value?.highlightField(firstResult.fieldKey)
    }

    const fieldNames = results.map((r) => r.matchedField.title).join('、')
    uni.showToast({
      title: `已填充 ${results.length} 个字段: ${fieldNames}`,
      icon: 'none',
      duration: 2500
    })
    saveDraft(templateId, templateName, store.formData)
  }
}

function onVoiceError(message: string) {
  uni.showToast({ title: message, icon: 'none' })
}

async function onSubmit() {
  if (!mobileSchema.value) return

  const errors = validateForm(store.formData, mobileSchema.value.validationMap)
  if (errors.length > 0) {
    const errMap: Record<string, string> = {}
    errors.forEach((e) => {
      errMap[e.key] = e.message
    })
    fieldErrors.value = errMap

    const errorPageIdx = mobileSchema.value.pages.findIndex((page) =>
      page.fields.some((f) => errMap[f.key])
    )
    if (errorPageIdx >= 0) {
      currentPage.value = errorPageIdx
    }

    uni.showToast({ title: '请完善表单信息', icon: 'none' })
    return
  }

  let hasServerErrors = false
  try {
    const serverValidation = await validateFormServer({
      templateId: Number(templateId),
      fieldValues: store.formData,
      submitterId: submitterId.value,
      enableSuggestions: false,
      enableAutoCorrect: false,
      partialValidation: false
    })

    if (serverValidation.data && !serverValidation.data.overallValid) {
      hasServerErrors = true
      const errMap: Record<string, string> = {}
      for (const fieldResult of serverValidation.data.fieldResults) {
        if (!fieldResult.valid && fieldResult.errors?.length) {
          const criticalError = fieldResult.errors.find(e => e.severity === 2) || fieldResult.errors[0]
          if (criticalError) {
            errMap[fieldResult.fieldName] = criticalError.errorMessage
          }
        }
      }

      if (Object.keys(errMap).length > 0) {
        fieldErrors.value = errMap

        const errorPageIdx = mobileSchema.value.pages.findIndex((page) =>
          page.fields.some((f) => errMap[f.key])
        )
        if (errorPageIdx >= 0) {
          currentPage.value = errorPageIdx
        }

        uni.showModal({
          title: '表单校验未通过',
          content: `发现 ${Object.keys(errMap).length} 个字段需要修正，请检查后重新提交`,
          showCancel: false,
          confirmText: '我知道了'
        })
        return
      }
    }
  } catch (e) {
    console.debug('服务端校验异常，跳过继续提交:', e)
  }

  fieldErrors.value = {}
  store.submitLoading = true

  try {
    const res = await submitFormData({
      templateId,
      templateName,
      data: store.formData
    })
    uni.redirectTo({
      url: `/pages/result/index?status=success&submitNo=${res.data.submitNo || ''}`
    })
  } catch (err: any) {
    uni.redirectTo({
      url: `/pages/result/index?status=failed&message=${encodeURIComponent(err.message || '提交失败')}`
    })
  } finally {
    store.submitLoading = false
  }
}

function onSaveDraft() {
  if (!templateId) return
  saveDraft(templateId, templateName, store.formData)
  uni.showToast({ title: '草稿已保存', icon: 'success' })
}

function goBack() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.fill-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 180rpx;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 300rpx;
}

.loading-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #999;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 300rpx;
  gap: 32rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.voice-fab {
  position: fixed;
  right: 32rpx;
  bottom: 180rpx;
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  .voice-fab-tip {
    font-size: 20rpx;
    color: #999;
    background: rgba(255, 255, 255, 0.9);
    padding: 4rpx 12rpx;
    border-radius: 16rpx;
    white-space: nowrap;
  }
}
</style>
