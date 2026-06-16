<template>
  <view class="dynamic-form">
    <template v-for="field in visibleFields" :key="field.key">
      <view
        class="form-field"
        :class="{ 'field-highlight': highlightFieldKey === field.key }"
      >
        <view class="field-label">
          <text v-if="field.required" class="required">*</text>
          <text>{{ field.title }}</text>
        </view>
        <view v-if="field.description" class="field-desc">{{ field.description }}</view>

        <view class="field-content">
          <view v-if="field.componentType === 'u-input' || field.componentType === 'u-textarea'" class="input-wrap">
            <u-input
              v-if="field.componentType === 'u-input' && field.type === 'number'"
              v-model="formValues[field.key]"
              type="number"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              border="surround"
              @change="onFieldChange(field.key, $event)"
            />
            <u-input
              v-else-if="field.componentType === 'u-input'"
              v-model="formValues[field.key]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              border="surround"
              @change="onFieldChange(field.key, $event)"
            />

            <u-textarea
              v-else-if="field.componentType === 'u-textarea'"
              v-model="formValues[field.key]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              auto-height
              @change="onFieldChange(field.key, $event)"
            />

            <VoiceInput
              v-if="!field.disabled && enableVoice"
              class="field-voice-btn"
              :fields="[field]"
              :mock-mode="voiceMockMode"
              :mock-text="`${field.title}示例内容`"
              @fill="(results) => onVoiceFillSingle(field, results)"
              @error="onVoiceError"
            />
          </view>

          <u-datetime-picker
            v-else-if="field.componentType === 'u-datetime-picker'"
            :modelValue="formValues[field.key] ? new Date(formValues[field.key]).getTime() : Date.now()"
            mode="date"
            @confirm="onDateConfirm(field.key, $event)"
          >
            <view class="date-display" :class="{ placeholder: !formValues[field.key] }">
              {{ formValues[field.key] || field.placeholder }}
            </view>
          </u-datetime-picker>

          <u-picker
            v-else-if="field.componentType === 'u-picker'"
            :columns="field.options.map(o => o.label)"
            @confirm="onPickerConfirm(field.key, field.options, $event)"
            @cancel="showPicker = false"
          >
            <view class="picker-display" :class="{ placeholder: !formValues[field.key] }">
              {{ getPickerLabel(field) || field.placeholder }}
              <u-icon name="arrow-down" size="24" />
            </view>
          </u-picker>

          <view v-else-if="field.componentType === 'u-checkbox-group'" class="checkbox-group">
            <u-checkbox-group v-model="checkboxValues[field.key]" @change="onCheckboxChange(field.key, $event)">
              <u-checkbox
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :name="opt.value"
                :disabled="field.disabled"
              />
            </u-checkbox-group>
          </view>

          <view v-else-if="field.componentType === 'u-switch'" class="switch-field">
            <u-switch
              :modelValue="!!formValues[field.key]"
              :disabled="field.disabled"
              @change="onSwitchChange(field.key, $event)"
            />
          </view>

          <FileUploader
            v-else-if="field.componentType === 'FileUploader'"
            :value="formValues[field.key]"
            :disabled="field.disabled"
            @change="onFieldChange(field.key, $event)"
          />
        </view>

        <view v-if="errors[field.key]" class="field-error">
          <text>{{ errors[field.key] }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { MobileField } from '@/types'
import FileUploader from './FileUploader.vue'
import VoiceInput from './VoiceInput.vue'
import type { ParsedVoiceResult } from '@/utils/voiceParser'

const props = defineProps<{
  fields: MobileField[]
  modelValue: Record<string, any>
  errors?: Record<string, string>
  enableVoice?: boolean
  voiceMockMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'fieldChange', key: string, value: any): void
  (e: 'voiceFill', results: ParsedVoiceResult[]): void
  (e: 'voiceError', message: string): void
}>()

const formValues = ref<Record<string, any>>({ ...props.modelValue })
const checkboxValues = ref<Record<string, any[]>>({})
const showPicker = ref(false)
const highlightFieldKey = ref<string | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    formValues.value = { ...val }
    Object.keys(val).forEach((key) => {
      if (Array.isArray(val[key])) {
        checkboxValues.value[key] = val[key]
      }
    })
  },
  { deep: true }
)

const visibleFields = computed(() => {
  return props.fields.filter((field) => {
    if (!field.condition) return field.visible !== false
    const condValue = formValues.value[field.condition.field]
    switch (field.condition.operator) {
      case 'eq': return condValue === field.condition.value
      case 'neq': return condValue !== field.condition.value
      case 'contains': return String(condValue).includes(String(field.condition.value))
      case 'gt': return Number(condValue) > Number(field.condition.value)
      case 'lt': return Number(condValue) < Number(field.condition.value)
      default: return true
    }
  })
})

function onFieldChange(key: string, value: any) {
  formValues.value[key] = value
  emit('update:modelValue', { ...formValues.value })
  emit('fieldChange', key, value)
}

function onDateConfirm(key: string, e: any) {
  const date = new Date(e.value)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  onFieldChange(key, dateStr)
}

function onPickerConfirm(key: string, options: any[], e: any) {
  const idx = e.indexs?.[0] ?? e.index?.[0] ?? 0
  const selectedValue = options[idx]?.value
  onFieldChange(key, selectedValue)
}

function onCheckboxChange(key: string, values: any[]) {
  checkboxValues.value[key] = values
  onFieldChange(key, values)
}

function onSwitchChange(key: string, value: any) {
  onFieldChange(key, !!value)
}

function getPickerLabel(field: MobileField): string {
  const val = formValues.value[field.key]
  const opt = field.options.find((o) => o.value === val)
  return opt ? opt.label : ''
}

function onVoiceFillSingle(field: MobileField, results: ParsedVoiceResult[]) {
  if (results.length > 0) {
    const result = results[0]
    onFieldChange(field.key, result.value)
    highlightField(field.key)
    emit('voiceFill', results)
  }
}

function onVoiceFillMultiple(results: ParsedVoiceResult[]) {
  for (const result of results) {
    onFieldChange(result.fieldKey, result.value)
  }
  if (results.length > 0) {
    highlightField(results[0].fieldKey)
  }
  emit('voiceFill', results)
}

function onVoiceError(message: string) {
  emit('voiceError', message)
}

function highlightField(fieldKey: string) {
  highlightFieldKey.value = fieldKey
  nextTick(() => {
    setTimeout(() => {
      highlightFieldKey.value = null
    }, 2000)
  })
}

defineExpose({
  onVoiceFillMultiple,
  highlightField
})
</script>

<style lang="scss" scoped>
.dynamic-form {
  padding: 20rpx 0;
}

.form-field {
  margin-bottom: 24rpx;
  padding: 0 32rpx;
}

.field-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;

  .required {
    color: #f56c6c;
    margin-right: 6rpx;
  }
}

.field-desc {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.field-content {
  width: 100%;
}

.input-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
}

.field-voice-btn {
  flex-shrink: 0;
  margin-bottom: 4rpx;
}

.form-field.field-highlight {
  animation: highlightPulse 0.6s ease-in-out 3;
  background: linear-gradient(90deg, #e6f4ff, transparent);
  border-radius: 12rpx;

  @keyframes highlightPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.01);
    }
  }
}

.date-display,
.picker-display {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &.placeholder {
    color: #c0c4cc;
  }
}

.checkbox-group {
  padding: 12rpx 0;
}

.switch-field {
  padding: 12rpx 0;
}

.field-error {
  margin-top: 8rpx;

  text {
    font-size: 24rpx;
    color: #f56c6c;
  }
}
</style>
