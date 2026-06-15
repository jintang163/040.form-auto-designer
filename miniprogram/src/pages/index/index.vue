<template>
  <view class="index-page">
    <view class="search-bar">
      <u-search
        v-model="keyword"
        placeholder="搜索表单模板"
        :show-action="false"
        @search="onSearch"
        @clear="onClear"
      />
    </view>

    <view class="scan-btn" @click="onScan">
      <u-icon name="scan" size="40" color="#2979ff" />
      <text>扫码填报</text>
    </view>

    <view v-if="loading" class="loading-wrap">
      <u-loading-icon size="48" />
    </view>

    <view v-else-if="templateList.length === 0" class="empty-wrap">
      <u-empty text="暂无表单模板" mode="data" />
    </view>

    <view v-else class="template-list">
      <view
        v-for="item in filteredList"
        :key="item.id"
        class="template-card"
        @click="onTemplateClick(item)"
      >
        <view class="card-header">
          <text class="card-title">{{ item.name }}</text>
          <u-tag :text="`v${item.version}`" type="primary" size="mini" plain />
        </view>
        <view v-if="item.description" class="card-desc">{{ item.description }}</view>
        <view class="card-footer">
          <text class="card-time">更新于 {{ formatTime(item.updatedAt) }}</text>
          <u-icon name="arrow-right" size="28" color="#999" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { FormTemplate } from '@/types'
import { getTemplateList } from '@/api'

const keyword = ref('')
const loading = ref(false)
const templateList = ref<FormTemplate[]>([])

const filteredList = computed(() => {
  if (!keyword.value) return templateList.value
  const kw = keyword.value.toLowerCase()
  return templateList.value.filter((t) => t.name.toLowerCase().includes(kw))
})

onShow(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    const res = await getTemplateList()
    templateList.value = res.data || []
  } catch {
    templateList.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  // filteredList is computed, auto-updates
}

function onClear() {
  keyword.value = ''
}

function onTemplateClick(item: FormTemplate) {
  uni.navigateTo({ url: `/pages/fill/index?templateId=${item.id}` })
}

function onScan() {
  uni.scanCode({
    onlyFromCamera: false,
    success: (res) => {
      const result = res.result
      if (result) {
        const url = new URL(result)
        const templateId = url.searchParams.get('templateId')
        if (templateId) {
          uni.navigateTo({ url: `/pages/fill/index?templateId=${templateId}` })
        } else {
          uni.showToast({ title: '无效的表单链接', icon: 'none' })
        }
      }
    },
    fail: () => {
      uni.showToast({ title: '扫码取消', icon: 'none' })
    }
  })
}

function formatTime(time: string): string {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  padding: 20rpx 32rpx;
  background: #fff;
}

.scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx 0;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  font-size: 28rpx;
  color: #2979ff;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.template-list {
  padding: 24rpx 32rpx;
}

.template-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.card-desc {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-time {
  font-size: 24rpx;
  color: #bbb;
}
</style>
