<template>
  <view class="form-paginator">
    <view v-if="pages.length > 1" class="step-bar">
      <view
        v-for="(page, index) in pages"
        :key="index"
        class="step-item"
        :class="{ active: index === currentPage, done: index < currentPage }"
        @click="onStepClick(index)"
      >
        <view class="step-dot">
          <u-icon v-if="index < currentPage" name="checkmark" size="24" color="#fff" />
          <text v-else>{{ index + 1 }}</text>
        </view>
        <text class="step-label">{{ page.title }}</text>
      </view>
    </view>

    <view class="page-content">
      <slot />
    </view>

    <view v-if="pages.length > 1" class="page-actions">
      <u-button
        v-if="currentPage > 0"
        type="info"
        :plain="true"
        text="上一页"
        @click="onPrev"
      />
      <u-button
        v-if="currentPage < pages.length - 1"
        type="primary"
        text="下一页"
        @click="onNext"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { MobileSchemaPage } from '@/types'

const props = defineProps<{
  pages: MobileSchemaPage[]
  currentPage: number
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'prev'): void
  (e: 'next'): void
}>()

function onStepClick(index: number) {
  emit('update:currentPage', index)
}

function onPrev() {
  if (props.currentPage > 0) {
    emit('update:currentPage', props.currentPage - 1)
    emit('prev')
  }
}

function onNext() {
  if (props.currentPage < props.pages.length - 1) {
    emit('update:currentPage', props.currentPage + 1)
    emit('next')
  }
}
</script>

<style lang="scss" scoped>
.form-paginator {
  width: 100%;
}

.step-bar {
  display: flex;
  padding: 24rpx 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  overflow-x: auto;
  white-space: nowrap;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 100rpx;

  .step-dot {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: #e0e0e0;
    color: #999;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }

  .step-label {
    font-size: 22rpx;
    color: #999;
    margin-top: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140rpx;
  }

  &.active {
    .step-dot {
      background: #2979ff;
      color: #fff;
    }
    .step-label {
      color: #2979ff;
      font-weight: bold;
    }
  }

  &.done {
    .step-dot {
      background: #19be6b;
    }
    .step-label {
      color: #19be6b;
    }
  }
}

.page-content {
  flex: 1;
}

.page-actions {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}
</style>
