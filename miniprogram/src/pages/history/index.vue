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
          <u-tag
            :text="statusText(item.status)"
            :type="statusType(item.status)"
            size="mini"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { FormSubmitData } from '@/types'
import { getFormDataList } from '@/api'

const loading = ref(false)
const historyList = ref<FormSubmitData[]>([])

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
  uni.showToast({ title: '查看详情功能开发中', icon: 'none' })
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
