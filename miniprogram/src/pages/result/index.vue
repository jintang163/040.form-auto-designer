<template>
  <view class="result-page">
    <view v-if="status === 'success'" class="result-success">
      <u-icon name="checkmark-circle-fill" size="120" color="#19be6b" />
      <text class="result-title">提交成功</text>
      <view class="result-info">
        <view class="info-row">
          <text class="info-label">提交编号</text>
          <text class="info-value">{{ submitNo || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ currentTime }}</text>
        </view>
      </view>
      <view class="result-actions">
        <u-button type="primary" text="继续填报" @click="continueFill" />
        <u-button type="info" :plain="true" text="返回首页" @click="goHome" />
      </view>
    </view>

    <view v-else class="result-fail">
      <u-icon name="close-circle-fill" size="120" color="#f56c6c" />
      <text class="result-title">提交失败</text>
      <text class="result-message">{{ errorMessage }}</text>
      <view class="result-actions">
        <u-button type="primary" text="重试" @click="retry" />
        <u-button type="info" :plain="true" text="返回首页" @click="goHome" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const status = ref<'success' | 'failed'>('success')
const submitNo = ref('')
const errorMessage = ref('')
const currentTime = ref('')

let templateId = ''

onLoad((options) => {
  status.value = (options?.status as 'success' | 'failed') || 'success'
  submitNo.value = options?.submitNo || ''
  errorMessage.value = options?.message ? decodeURIComponent(options.message) : '网络异常，请稍后重试'
  templateId = options?.templateId || ''

  const now = new Date()
  currentTime.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
})

function continueFill() {
  if (templateId) {
    uni.redirectTo({ url: `/pages/fill/index?templateId=${templateId}` })
  } else {
    goHome()
  }
}

function retry() {
  uni.navigateBack()
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.result-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-success,
.result-fail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 64rpx;
  width: 100%;
}

.result-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-top: 32rpx;
  margin-bottom: 40rpx;
}

.result-info {
  width: 100%;
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 48rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;

  .info-label {
    font-size: 28rpx;
    color: #999;
  }
  .info-value {
    font-size: 28rpx;
    color: #333;
  }
}

.result-message {
  font-size: 28rpx;
  color: #999;
  text-align: center;
  margin-bottom: 48rpx;
}

.result-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
</style>
