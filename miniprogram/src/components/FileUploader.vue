<template>
  <view class="file-uploader">
    <view class="file-list">
      <view v-for="(file, index) in fileList" :key="index" class="file-item">
        <image v-if="file.type === 'image'" :src="file.url" class="file-image" mode="aspectFill" @click="previewImage(file.url)" />
        <view v-else class="file-name">
          <u-icon name="file-text" size="40" />
          <text>{{ file.name }}</text>
        </view>
        <view v-if="!disabled" class="file-delete" @click="removeFile(index)">
          <u-icon name="close-circle-fill" size="36" color="#f56c6c" />
        </view>
      </view>
    </view>
    <view v-if="!disabled" class="upload-btn" @click="chooseImage">
      <u-icon name="plus" size="48" color="#999" />
      <text class="upload-text">上传图片</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface FileItem {
  url: string
  name: string
  type: 'image' | 'file'
}

const props = defineProps<{
  value?: string | string[]
  disabled?: boolean
  maxCount?: number
}>()

const emit = defineEmits<{
  (e: 'change', value: string[]): void
}>()

const fileList = ref<FileItem[]>([])

watch(
  () => props.value,
  (val) => {
    if (!val || (Array.isArray(val) && val.length === 0)) {
      fileList.value = []
      return
    }
    const urls = Array.isArray(val) ? val : [val]
    fileList.value = urls.map((url: string) => ({
      url,
      name: url.split('/').pop() || 'file',
      type: isImageUrl(url) ? 'image' : 'file'
    }))
  },
  { immediate: true }
)

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|bmp|webp)(\?.*)?$/i.test(url)
}

function chooseImage() {
  const max = props.maxCount || 9
  const remaining = max - fileList.value.length
  if (remaining <= 0) {
    uni.showToast({ title: `最多上传${max}张`, icon: 'none' })
    return
  }

  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      res.tempFilePaths.forEach((path) => {
        uploadFile(path)
      })
    }
  })
}

function uploadFile(filePath: string) {
  uni.showLoading({ title: '上传中...' })
  uni.uploadFile({
    url: '/api/file/upload',
    filePath,
    name: 'file',
    header: {
      Authorization: uni.getStorageSync('token') ? `Bearer ${uni.getStorageSync('token')}` : ''
    },
    success: (res) => {
      const data = JSON.parse(res.data)
      if (data.code === 200 || data.code === 0) {
        fileList.value.push({
          url: data.data.url || data.data,
          name: filePath.split('/').pop() || 'file',
          type: isImageUrl(filePath) ? 'image' : 'file'
        })
        emitChange()
      } else {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '上传失败', icon: 'none' })
    },
    complete: () => {
      uni.hideLoading()
    }
  })
}

function removeFile(index: number) {
  fileList.value.splice(index, 1)
  emitChange()
}

function previewImage(url: string) {
  const urls = fileList.value.filter((f) => f.type === 'image').map((f) => f.url)
  uni.previewImage({
    current: url,
    urls
  })
}

function emitChange() {
  const urls = fileList.value.map((f) => f.url)
  emit('change', urls)
}
</script>

<style lang="scss" scoped>
.file-uploader {
  width: 100%;
}

.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.file-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  overflow: hidden;
  border: 1rpx solid #eee;
}

.file-image {
  width: 100%;
  height: 100%;
}

.file-name {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  font-size: 20rpx;
  color: #666;
  padding: 8rpx;
  box-sizing: border-box;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-delete {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  z-index: 1;
}

.upload-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #dcdfe6;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.upload-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
</style>
