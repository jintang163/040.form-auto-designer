<template>
  <view class="draft-page">
    <view v-if="draftList.length === 0" class="empty-wrap">
      <u-empty text="暂无草稿" mode="data" />
    </view>

    <view v-else class="draft-list">
      <u-swipe-action
        v-for="item in draftList"
        :key="item.id"
        :options="swipeOptions"
        @click="onSwipeClick($event, item)"
      >
        <view class="draft-item" @click="onDraftClick(item)">
          <view class="item-info">
            <text class="item-name">{{ item.templateName }}</text>
            <text class="item-time">保存于 {{ formatTime(item.savedAt) }}</text>
          </view>
          <u-icon name="arrow-right" size="28" color="#999" />
        </view>
      </u-swipe-action>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { DraftData } from '@/types'
import { getDraftList, removeDraft } from '@/utils/draftManager'

const draftList = ref<DraftData[]>([])

const swipeOptions = [
  {
    text: '删除',
    style: {
      backgroundColor: '#f56c6c'
    }
  }
]

onShow(() => {
  loadDrafts()
})

function loadDrafts() {
  draftList.value = getDraftList()
}

function onDraftClick(item: DraftData) {
  uni.navigateTo({ url: `/pages/fill/index?templateId=${item.templateId}` })
}

function onSwipeClick(event: any, item: DraftData) {
  const index = event.index
  if (index === 0) {
    uni.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除此草稿吗？',
      success: (res) => {
        if (res.confirm) {
          removeDraft(item.templateId)
          loadDrafts()
          uni.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
}

function formatTime(time: string): string {
  if (!time) return '--'
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.draft-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.draft-list {
  padding: 24rpx 32rpx;
}

.draft-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
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

.item-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}
</style>
