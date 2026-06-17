<template>
  <view v-if="visible" class="suggestion-panel">
    <view v-if="errors && errors.length > 0" class="error-section">
      <view class="section-header">
        <u-icon name="info-circle" color="#f56c6c" size="28" />
        <text class="section-title error-title">校验错误</text>
      </view>
      <view
        v-for="(error, idx) in errors.slice(0, 3)"
        :key="'err-' + idx"
        class="error-item"
      >
        <text class="error-dot" :class="{ 'warn-dot': error.severity === 1 }">●</text>
        <text class="error-text">{{ error.errorMessage }}</text>
      </view>

      <view
        v-if="autoCorrectedValue"
        class="autocorrect-row"
        @click="onApplyAutoCorrect"
      >
        <u-icon name="reload" color="#409eff" size="24" />
        <text class="autocorrect-text">
          自动修正为: <text class="autocorrect-value">{{ autoCorrectedValue }}</text>
        </text>
        <u-tag text="应用" type="primary" size="mini" plain />
      </view>
    </view>

    <view v-if="suggestions && suggestions.length > 0" class="suggestion-section">
      <view class="section-header">
        <u-icon name="lightbulb" color="#e6a23c" size="28" />
        <text class="section-title suggest-title">智能建议</text>
      </view>
      <view
        v-for="(suggestion, idx) in suggestions.slice(0, 5)"
        :key="'sug-' + idx"
        class="suggestion-item"
        @click="onApplySuggestion(suggestion)"
      >
        <view class="suggestion-main">
          <view class="suggestion-icon-wrap">
            <text class="suggestion-icon">{{ getSuggestionIcon(suggestion.suggestionType) }}</text>
          </view>
          <view class="suggestion-content">
            <text class="suggestion-message">{{ suggestion.suggestionMessage }}</text>
            <view v-if="suggestion.suggestedValue" class="suggestion-value-wrap">
              <text class="suggestion-value">{{ suggestion.suggestedValue }}</text>
              <view
                class="confidence-bar"
                :style="{ width: (suggestion.confidence * 100).toFixed(0) + '%' }"
              />
            </view>
          </view>
        </view>
        <view class="suggestion-action">
          <u-tag
            :text="getSuggestionTag(suggestion.source)"
            :type="getSuggestionTagType(suggestion.source)"
            size="mini"
          />
          <u-icon name="arrow-right" color="#909399" size="24" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ServerValidationError, ValidationSuggestion } from '@/types'

const props = defineProps<{
  visible: boolean
  errors?: ServerValidationError[]
  suggestions?: ValidationSuggestion[]
  autoCorrectedValue?: string
}>()

const emit = defineEmits<{
  (e: 'applySuggestion', suggestion: ValidationSuggestion): void
  (e: 'applyAutoCorrect', value: string): void
}>()

const sortedErrors = computed(() =>
  [...(props.errors || [])].sort((a, b) => (b.severity || 0) - (a.severity || 0))
)

function onApplySuggestion(suggestion: ValidationSuggestion) {
  emit('applySuggestion', suggestion)
}

function onApplyAutoCorrect() {
  if (props.autoCorrectedValue) {
    emit('applyAutoCorrect', props.autoCorrectedValue)
  }
}

function getSuggestionIcon(type: string): string {
  const iconMap: Record<string, string> = {
    HISTORICAL: '📜',
    TYPO_CORRECTION: '✏️',
    ADDRESS_AUTOCOMPLETE: '📍',
    PATTERN_MATCH: '🔍',
    AI_CONTEXT_INFERENCE: '🤖'
  }
  return iconMap[type] || '💡'
}

function getSuggestionTag(source: string): string {
  const tagMap: Record<string, string> = {
    HISTORY_USER_HISTORY: '历史记录',
    HISTORY_COLLABORATIVE: '相似用户',
    HISTORY_GLOBAL: '热门选择',
    SIMILARITY_MATCH: '相似匹配',
    RULE_BASED: '规则推荐',
    AI_ID_CARD_PARSE: '身份证解析',
    AI_PHONE_PREFIX: '手机号分析',
    AI_NAME_PATTERN: '姓名推断',
    AI_COMPANY_KEYWORD: '公司识别',
    AI_PROVINCE_CAPITAL: '省份关联',
    AI_ADDRESS_COMPLETE: 'AI地址补全',
    AI_CONTEXT_INFERENCE: 'AI关联推理'
  }
  return tagMap[source] || 'AI推荐'
}

function getSuggestionTagType(source: string): string {
  if (source?.includes('HISTORY')) return 'success'
  if (source === 'SIMILARITY_MATCH') return 'warning'
  return 'info'
}
</script>

<style lang="scss" scoped>
.suggestion-panel {
  margin-top: 16rpx;
  padding: 20rpx;
  background: #fafbfc;
  border-radius: 12rpx;
  border: 1rpx solid #ebeef5;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #303133;
}

.error-title {
  color: #f56c6c;
}

.suggest-title {
  color: #e6a23c;
}

.error-section {
  margin-bottom: 16rpx;
}

.error-section:not(:last-child)::after {
  content: '';
  display: block;
  height: 1rpx;
  background: #ebeef5;
  margin-top: 16rpx;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 8rpx 0;
}

.error-dot {
  color: #f56c6c;
  font-size: 16rpx;
  margin-top: 8rpx;
  flex-shrink: 0;
}

.warn-dot {
  color: #e6a23c;
}

.error-text {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
}

.autocorrect-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  background: #ecf5ff;
  border-radius: 8rpx;
  border: 1rpx solid #d9ecff;
}

.autocorrect-text {
  flex: 1;
  font-size: 26rpx;
  color: #409eff;
}

.autocorrect-value {
  font-weight: 600;
  color: #303133;
}

.suggestion-section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #ebeef5;
}

.suggestion-main {
  flex: 1;
  display: flex;
  gap: 12rpx;
  min-width: 0;
}

.suggestion-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf6ec;
  border-radius: 50%;
  flex-shrink: 0;
}

.suggestion-icon {
  font-size: 28rpx;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-message {
  display: block;
  font-size: 26rpx;
  color: #303133;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.suggestion-value-wrap {
  position: relative;
  padding: 8rpx 12rpx;
  background: #f4f4f5;
  border-radius: 6rpx;
  overflow: hidden;
}

.suggestion-value {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 24rpx;
  color: #606266;
  font-family: monospace;
}

.confidence-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.15), rgba(103, 194, 58, 0.15));
  border-radius: 6rpx;
}

.suggestion-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}
</style>
