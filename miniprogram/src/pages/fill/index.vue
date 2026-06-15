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
          :fields="currentPageFields"
          v-model="formData"
          :errors="fieldErrors"
          @field-change="onFieldChange"
        />
      </FormPaginator>

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
import { submitFormData } from '@/api'
import DynamicForm from '@/components/DynamicForm.vue'
import FormPaginator from '@/components/FormPaginator.vue'

const store = useFormStore()
const loading = ref(false)
const currentPage = ref(0)
const fieldErrors = ref<Record<string, string>>({})

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
</style>
