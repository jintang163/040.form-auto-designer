<template>
  <view class="voice-input-wrap">
    <view
      class="voice-btn"
      :class="{ recording: isRecording, disabled: disabled }"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
      @longpress="onLongPress"
    >
      <u-icon
        v-if="!isRecording"
        name="mic"
        size="36"
        :color="disabled ? '#c0c4cc' : '#409eff'"
      />
      <view v-else class="recording-icon">
        <view class="wave"></view>
        <view class="wave" style="animation-delay: 0.1s"></view>
        <view class="wave" style="animation-delay: 0.2s"></view>
      </view>
    </view>

    <u-modal
      v-model="showConfirm"
      :title="confirmTitle"
      :content="confirmContent"
      :show-cancel-button="true"
      :confirm-text="confirmButtonText"
      @confirm="onConfirmFill"
      @cancel="onCancelFill"
    >
      <view v-if="parsedResults.length > 0" class="parse-results">
        <view
          v-for="(result, index) in parsedResults"
          :key="index"
          class="result-item"
          :class="{ low-confidence: result.confidence < 0.6 }"
        >
          <view class="result-field">
            <text class="field-label">{{ result.matchedField.title }}</text>
            <text class="confidence" :class="getConfidenceClass(result.confidence)">
              {{ Math.round(result.confidence * 100) }}%
            </text>
          </view>
          <view class="result-value">{{ result.value }}</view>
          <view class="result-raw">原文: {{ result.rawText }}</view>
        </view>
      </view>
    </u-modal>

    <view v-if="showRecordingTip" class="recording-tip">
      <view class="tip-content">
        <view class="tip-icon">
          <view class="pulse"></view>
          <text class="mic-emoji">🎤</text>
        </view>
        <text class="tip-text">正在录音，上滑取消</text>
        <text class="duration">{{ formatDuration(currentDuration) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { voiceService, formatDuration } from '@/utils/voiceService'
import { parseVoiceToField, parseMultipleFields } from '@/utils/voiceParser'
import type { MobileField } from '@/types'
import type { ParsedVoiceResult } from '@/utils/voiceParser'

const props = defineProps<{
  fields: MobileField[]
  disabled?: boolean
  placeholder?: string
  enableMultiple?: boolean
  mockMode?: boolean
  mockText?: string
}>()

const emit = defineEmits<{
  (e: 'fill', results: ParsedVoiceResult[]): void
  (e: 'recognizeStart'): void
  (e: 'recognizeEnd', text: string): void
  (e: 'error', message: string): void
}>()

const isRecording = ref(false)
const showRecordingTip = ref(false)
const showConfirm = ref(false)
const currentDuration = ref(0)
const recognizedText = ref('')
const parsedResults = ref<ParsedVoiceResult[]>([])
const confirmTitle = ref('识别结果')
const confirmContent = ref('')
const confirmButtonText = ref('填入')

let durationTimer: ReturnType<typeof setInterval> | null = null
let touchStartTime = 0
let startY = 0

watch(
  () => props.disabled,
  (val) => {
    if (val && isRecording.value) {
      cancelRecording()
    }
  }
)

function onTouchStart(e: TouchEvent) {
  if (props.disabled) return
  touchStartTime = Date.now()
  startY = e.touches?.[0]?.clientY || 0
}

async function onLongPress() {
  if (props.disabled) return
  try {
    await voiceService.start()
    isRecording.value = true
    showRecordingTip.value = true
    currentDuration.value = 0

    durationTimer = setInterval(() => {
      currentDuration.value = voiceService.getRecordDuration()
    }, 500)

    emit('recognizeStart')
  } catch (err: any) {
    emit('error', err.message)
    uni.showToast({ title: err.message, icon: 'none' })
  }
}

async function onTouchEnd(e: TouchEvent) {
  if (!isRecording.value) return

  const endY = e.changedTouches?.[0]?.clientY || 0
  const moveY = startY - endY

  if (moveY > 50) {
    cancelRecording()
    return
  }

  const pressDuration = Date.now() - touchStartTime
  if (pressDuration < 500) {
    uni.showToast({ title: '说话时间太短', icon: 'none' })
    cancelRecording()
    return
  }

  await stopAndRecognize()
}

function onTouchCancel() {
  if (isRecording.value) {
    cancelRecording()
  }
}

async function stopAndRecognize() {
  if (!isRecording.value) return

  clearDurationTimer()

  try {
    const { tempFilePath, duration } = await voiceService.stop()
    isRecording.value = false
    showRecordingTip.value = false

    uni.showLoading({ title: '识别中...' })

    const mockText = props.mockMode ? props.mockText || getMockText() : undefined
    const result = await voiceService.recognizeVoice(tempFilePath, mockText)

    recognizedText.value = result.text
    emit('recognizeEnd', result.text)

    parseAndShowConfirm(result.text, duration)
  } catch (err: any) {
    isRecording.value = false
    showRecordingTip.value = false
    emit('error', err.message)
    uni.showToast({ title: err.message, icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function cancelRecording() {
  clearDurationTimer()
  voiceService.cancel()
  isRecording.value = false
  showRecordingTip.value = false
  uni.showToast({ title: '已取消', icon: 'none' })
}

function clearDurationTimer() {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

function parseAndShowConfirm(text: string, duration: number) {
  let results: ParsedVoiceResult[] = []

  if (props.enableMultiple) {
    results = parseMultipleFields(text, props.fields)
  } else {
    const singleResult = parseVoiceToField(text, props.fields)
    if (singleResult) {
      results = [singleResult]
    }
  }

  parsedResults.value = results

  if (results.length === 0) {
    confirmTitle.value = '未匹配到字段'
    confirmContent.value = `识别内容："${text}"\n\n未能识别出对应的表单字段，请尝试使用更清晰的表述，例如："姓名张三"`
    confirmButtonText.value = '我知道了'
  } else if (results.length === 1) {
    const result = results[0]
    confirmTitle.value = '确认填入'
    confirmContent.value = `字段：${result.matchedField.title}\n内容：${result.value}\n置信度：${Math.round(result.confidence * 100)}%`
    confirmButtonText.value = '填入'
  } else {
    confirmTitle.value = `识别到 ${results.length} 个字段`
    confirmContent.value = '以下是识别结果，请确认是否填入：'
    confirmButtonText.value = '全部填入'
  }

  showConfirm.value = true
}

function getMockText(): string {
  const examples = [
    '姓名张三，电话13812345678',
    '年龄25岁，性别男，地址北京市朝阳区',
    '身份证号110101199001011234，生日1990年1月1日',
    '公司科技有限公司，职位高级工程师'
  ]
  return examples[Math.floor(Math.random() * examples.length)]
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

function onConfirmFill() {
  showConfirm.value = false
  if (parsedResults.value.length > 0) {
    emit('fill', parsedResults.value)
    uni.showToast({ title: '已填入', icon: 'success' })
  }
}

function onCancelFill() {
  showConfirm.value = false
}

onUnmounted(() => {
  clearDurationTimer()
  voiceService.destroy()
})
</script>

<style lang="scss" scoped>
.voice-input-wrap {
  position: relative;
  display: inline-block;
}

.voice-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &.recording {
    background: #fef0f0;
    transform: scale(1.1);
  }

  &.disabled {
    opacity: 0.5;
  }
}

.recording-icon {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
  height: 36rpx;

  .wave {
    width: 6rpx;
    background: #f56c6c;
    border-radius: 3rpx;
    animation: wave 0.6s ease-in-out infinite;

    @keyframes wave {
      0%, 100% { height: 8rpx; }
      50% { height: 36rpx; }
    }
  }
}

.recording-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;

  .tip-content {
    background: rgba(0, 0, 0, 0.75);
    padding: 48rpx 64rpx;
    border-radius: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    min-width: 400rpx;

    .tip-icon {
      position: relative;
      width: 120rpx;
      height: 120rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        background: rgba(245, 108, 108, 0.3);
        border-radius: 50%;
        animation: pulse 1.2s ease-out infinite;

        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      }

      .mic-emoji {
        font-size: 64rpx;
        position: relative;
        z-index: 1;
      }
    }

    .tip-text {
      color: #fff;
      font-size: 28rpx;
    }

    .duration {
      color: #f56c6c;
      font-size: 32rpx;
      font-weight: bold;
    }
  }
}

.parse-results {
  max-height: 500rpx;
  overflow-y: auto;

  .result-item {
    padding: 20rpx;
    margin-bottom: 16rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
    border-left: 6rpx solid #409eff;

    &.low-confidence {
      border-left-color: #e6a23c;
      opacity: 0.8;
    }

    .result-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8rpx;

      .field-label {
        font-size: 28rpx;
        font-weight: bold;
        color: #333;
      }

      .confidence {
        font-size: 24rpx;
        padding: 4rpx 12rpx;
        border-radius: 20rpx;

        &.high {
          background: #f0f9eb;
          color: #67c23a;
        }

        &.medium {
          background: #fdf6ec;
          color: #e6a23c;
        }

        &.low {
          background: #fef0f0;
          color: #f56c6c;
        }
      }
    }

    .result-value {
      font-size: 30rpx;
      color: #409eff;
      margin-bottom: 4rpx;
    }

    .result-raw {
      font-size: 24rpx;
      color: #999;
    }
  }
}
</style>
