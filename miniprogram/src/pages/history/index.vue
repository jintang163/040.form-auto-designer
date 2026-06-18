<template>
  <view class="history-page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon size="48" />
    </view>

    <view v-else-if="historyList.length === 0" class="empty-wrap">
      <u-empty text="暂无填报记录" mode="history" />
    </view>

    <view v-else class="history-list">
      <view v-for="group in groupedHistory" :key="group.templateName" class="history-group">
        <view class="group-title">{{ group.templateName }}</view>
        <view
          v-for="item in group.items"
          :key="item.submitNo || item.submitTime"
          class="history-item"
          @click="onItemClick(item)"
        >
          <view class="item-info">
            <text class="item-no">{{ item.submitNo || '--' }}</text>
            <text class="item-time">{{ formatTime(item.submitTime) }}</text>
          </view>
          <view class="item-right">
            <u-tag
              :text="statusText(item.status)"
              :type="statusType(item.status)"
              size="mini"
              style="margin-right: 16rpx;"
            />
            <view class="action-btn" @click.stop="onActionClick(item)">
              <text class="action-icon">⋯</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { FormSubmitData } from '@/types'
import {
  getFormDataList,
  exportPdf,
  openPdfDocument,
  sharePdfFile,
  savePdfToServer,
  type PdfExportRequest
} from '@/api'

const loading = ref(false)
const historyList = ref<FormSubmitData[]>([])
const exporting = ref(false)

interface HistoryGroup {
  templateName: string
  items: FormSubmitData[]
}

const groupedHistory = computed<HistoryGroup[]>(() => {
  const map = new Map<string, FormSubmitData[]>()
  historyList.value.forEach((item) => {
    const key = item.templateName || '未知表单'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  })
  return Array.from(map.entries()).map(([templateName, items]) => ({
    templateName,
    items: items.sort((a, b) => new Date(b.submitTime!).getTime() - new Date(a.submitTime!).getTime())
  }))
})

onShow(() => {
  loadHistory()
})

async function loadHistory() {
  loading.value = true
  try {
    const res = await getFormDataList()
    historyList.value = res.data?.list || []
  } catch {
    historyList.value = []
  } finally {
    loading.value = false
  }
}

function onItemClick(item: FormSubmitData) {
  onActionClick(item)
}

function onActionClick(item: FormSubmitData) {
  uni.showActionSheet({
    itemList: ['预览PDF', '导出PDF到好友', '保存PDF到服务器'],
    success: async (res) => {
      const formDataId = Number((item as any).id || item.submitNo)
      if (!formDataId || isNaN(formDataId)) {
        uni.showToast({ title: '数据ID无效', icon: 'none' })
        return
      }
      switch (res.tapIndex) {
        case 0:
          await handlePreviewPdf(item, formDataId)
          break
        case 1:
          await handleSharePdf(item, formDataId)
          break
        case 2:
          await handleSavePdf(item, formDataId)
          break
      }
    }
  })
}

async function handlePreviewPdf(item: FormSubmitData, formDataId: number) {
  if (exporting.value) return
  exporting.value = true
  uni.showLoading({ title: '生成PDF中...', mask: true })
  try {
    const params: PdfExportRequest = {
      formDataId,
      customFileName: `${item.templateName || '表单'}_${formatFileDate(item.submitTime)}`
    }
    const filePath = await exportPdf(params)
    uni.hideLoading()
    await openPdfDocument(filePath)
  } catch (e) {
    uni.hideLoading()
    console.error('预览PDF失败', e)
    uni.showToast({ title: `预览失败: ${(e as Error).message || '请重试'}`, icon: 'none', duration: 3000 })
  } finally {
    exporting.value = false
  }
}

async function handleSharePdf(item: FormSubmitData, formDataId: number) {
  if (exporting.value) return
  exporting.value = true
  uni.showLoading({ title: '生成PDF中...', mask: true })
  try {
    const params: PdfExportRequest = {
      formDataId,
      customFileName: `${item.templateName || '表单'}_${formatFileDate(item.submitTime)}`
    }
    const filePath = await exportPdf(params)
    uni.hideLoading()
    const title = `${item.templateName || '表单数据'}_${formatFileDate(item.submitTime)}`
    await sharePdfFile(filePath, title)
  } catch (e) {
    uni.hideLoading()
    console.error('分享PDF失败', e)
    uni.showToast({ title: `分享失败: ${(e as Error).message || '请重试'}`, icon: 'none', duration: 3000 })
  } finally {
    exporting.value = false
  }
}

async function handleSavePdf(item: FormSubmitData, formDataId: number) {
  uni.showLoading({ title: '保存中...', mask: true })
  try {
    const fileName = `${item.templateName || '表单'}_${formatFileDate(item.submitTime)}.pdf`
    const res = await savePdfToServer(formDataId, undefined, fileName)
    uni.hideLoading()
    if (res.code === 200 || res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('保存PDF失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function formatFileDate(time?: string): string {
  if (!time) return String(Date.now())
  const d = new Date(time)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function statusText(status?: string): string {
  const map: Record<string, string> = {
    success: '已提交',
    failed: '提交失败',
    pending: '待处理'
  }
  return map[status || ''] || '未知'
}

function statusType(status?: string): 'success' | 'error' | 'warning' {
  const map: Record<string, 'success' | 'error' | 'warning'> = {
    success: 'success',
    failed: 'error',
    pending: 'warning'
  }
  return map[status || ''] || 'warning'
}

function formatTime(time?: string): string {
  if (!time) return '--'
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.history-list {
  padding: 24rpx 32rpx;
}

.history-group {
  margin-bottom: 32rpx;
}

.group-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.history-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.item-right {
  display: flex;
  align-items: center;
}

.action-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;
}

.action-icon {
  font-size: 36rpx;
  color: #999;
  line-height: 1;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-no {
  font-size: 28rpx;
  color: #333;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}
</style>
