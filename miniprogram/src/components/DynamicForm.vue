<template>
  <view class="dynamic-form">
    <template v-for="field in visibleFields" :key="field.key">
      <view
        class="form-field"
        :class="{
          'field-highlight': highlightFieldKey === field.key,
          'field-validating': validatingFields[field.key],
          'field-invalid': !isFieldValid(field.key)
        }"
      >
        <view class="field-label">
          <text v-if="field.required" class="required">*</text>
          <text>{{ field.title }}</text>
          <view v-if="validatingFields[field.key]" class="validating-indicator">
            <u-loading-icon size="24" mode="spinner" />
            <text class="validating-text">校验中...</text>
          </view>
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
              :border="getInputBorder(field.key)"
              @change="onFieldChange(field.key, $event)"
              @blur="onFieldBlur(field.key)"
            />
            <u-input
              v-else-if="field.componentType === 'u-input'"
              v-model="formValues[field.key]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :border="getInputBorder(field.key)"
              @change="onFieldChange(field.key, $event)"
              @blur="onFieldBlur(field.key)"
            />

            <u-textarea
              v-else-if="field.componentType === 'u-textarea'"
              v-model="formValues[field.key]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              auto-height
              :border="getInputBorder(field.key)"
              @change="onFieldChange(field.key, $event)"
              @blur="onFieldBlur(field.key)"
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
            <view
              class="date-display picker-display"
              :class="{
                placeholder: !formValues[field.key],
                'border-invalid': !isFieldValid(field.key)
              }"
            >
              {{ formValues[field.key] || field.placeholder }}
            </view>
          </u-datetime-picker>

          <u-picker
            v-else-if="field.componentType === 'u-picker'"
            :columns="field.options.map(o => o.label)"
            @confirm="onPickerConfirm(field.key, field.options, $event)"
          >
            <view
              class="picker-display"
              :class="{
                placeholder: !formValues[field.key],
                'border-invalid': !isFieldValid(field.key)
              }"
            >
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
          <u-icon name="info-circle" size="24" color="#f56c6c" />
          <text>{{ errors[field.key] }}</text>
        </view>

        <FieldSuggestion
          v-if="enableSmartValidation"
          :visible="showSuggestionFor(field.key)"
          :errors="serverValidationResults[field.key]?.errors"
          :suggestions="serverValidationResults[field.key]?.suggestions"
          :auto-corrected-value="serverValidationResults[field.key]?.autoCorrectedValue"
          @apply-suggestion="onApplySuggestion(field.key, $event)"
          @apply-auto-correct="onApplyAutoCorrect(field.key, $event)"
        />
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { MobileField, ValidationSuggestion, FieldValidationResult, ServerValidationError } from '@/types'
import { validateField as validateFieldApi } from '@/api'
import FileUploader from './FileUploader.vue'
import VoiceInput from './VoiceInput.vue'
import FieldSuggestion from './FieldSuggestion.vue'
import { validateField as validateFieldLocal } from '@/utils/validator'
import type { ParsedVoiceResult } from '@/utils/voiceParser'

interface Props {
  fields: MobileField[]
  modelValue: Record<string, any>
  errors?: Record<string, string>
  enableVoice?: boolean
  voiceMockMode?: boolean
  enableSmartValidation?: boolean
  templateId?: string
  submitterId?: string
}

const props = withDefaults(defineProps<Props>(), {
  enableVoice: false,
  voiceMockMode: false,
  enableSmartValidation: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'fieldChange', key: string, value: any): void
  (e: 'fieldValidated', key: string, result: FieldValidationResult): void
  (e: 'voiceFill', results: ParsedVoiceResult[]): void
  (e: 'voiceError', message: string): void
}>()

const formValues = ref<Record<string, any>>({ ...props.modelValue })
const checkboxValues = ref<Record<string, any[]>>({})
const highlightFieldKey = ref<string | null>(null)
const validatingFields = ref<Record<string, boolean>>({})
const serverValidationResults = ref<Record<string, FieldValidationResult>>({})
const blurredFields = ref<Record<string, boolean>>({})
const debounceTimers = ref<Record<string, any>>({})

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

function isFieldValid(key: string): boolean {
  if (props.errors?.[key]) return false
  const result = serverValidationResults.value[key]
  if (result && !result.valid) return false
  return true
}

function getInputBorder(key: string): string {
  if (!isFieldValid(key) && blurredFields.value[key]) return 'surround'
  return 'surround'
}

function showSuggestionFor(key: string): boolean {
  const result = serverValidationResults.value[key]
  if (!result) return false
  if (!blurredFields.value[key]) return false
  return !result.valid || (result.suggestions?.length ?? 0) > 0
}

function onFieldChange(key: string, value: any) {
  formValues.value[key] = value
  emit('update:modelValue', { ...formValues.value })
  emit('fieldChange', key, value)

  if (debounceTimers.value[key]) {
    clearTimeout(debounceTimers.value[key])
  }

  const field = visibleFields.value.find((f) => f.key === key)
  if (field?.validation) {
    const localError = validateFieldLocal(key, value, field.validation)
    if (localError) {
      serverValidationResults.value[key] = {
        fieldName: key,
        valid: false,
        errors: [{
          errorCode: 'LOCAL_VALIDATION',
          errorMessage: localError.message,
          ruleType: 'local',
          severity: 2
        }] as ServerValidationError[],
        suggestions: []
      }
      return
    }
  }

  if (props.enableSmartValidation && props.templateId) {
    debounceTimers.value[key] = setTimeout(() => {
      runServerValidation(key, value)
    }, 500)
  }
}

async function runServerValidation(key: string, value: any) {
  if (!props.templateId) return

  validatingFields.value[key] = true
  try {
    const res = await validateFieldApi({
      templateId: Number(props.templateId),
      fieldName: key,
      fieldValue: value,
      contextData: { ...formValues.value },
      submitterId: props.submitterId,
      enableSuggestions: true,
      enableAutoCorrect: true
    })

    if (res.data) {
      serverValidationResults.value[key] = res.data
      emit('fieldValidated', key, res.data)

      if (res.data.autoCorrectedValue && res.data.autoCorrectedValue !== String(value ?? '')) {
        uni.vibrateShort({ type: 'light' })
      }
    }
  } catch (err) {
    console.debug('服务端校验失败, 使用本地校验:', err)
  } finally {
    validatingFields.value[key] = false
  }
}

function onFieldBlur(key: string) {
  blurredFields.value[key] = true
  const value = formValues.value[key]

  if (!serverValidationResults.value[key] && props.enableSmartValidation && props.templateId) {
    runServerValidation(key, value)
  }
}

function onApplySuggestion(key: string, suggestion: ValidationSuggestion) {
  formValues.value[key] = suggestion.suggestedValue
  emit('update:modelValue', { ...formValues.value })
  emit('fieldChange', key, suggestion.suggestedValue)

  delete serverValidationResults.value[key]

  uni.showToast({
    title: '已应用建议',
    icon: 'success',
    duration: 1000
  })
}

function onApplyAutoCorrect(key: string, correctedValue: string) {
  formValues.value[key] = correctedValue
  emit('update:modelValue', { ...formValues.value })
  emit('fieldChange', key, correctedValue)

  delete serverValidationResults.value[key]

  uni.showToast({
    title: '已自动修正',
    icon: 'success',
    duration: 1000
  })
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

function clearValidationResults() {
  serverValidationResults.value = {}
  blurredFields.value = {}
}

function getFieldValidationResult(key: string): FieldValidationResult | undefined {
  return serverValidationResults.value[key]
}

defineExpose({
  onVoiceFillMultiple,
  highlightField,
  clearValidationResults,
  getFieldValidationResult
})
</script>

<style lang="scss" scoped>
.dynamic-form {
  padding: 20rpx 0;
}

.form-field {
  margin-bottom: 24rpx;
  padding: 0 32rpx;
  padding-top: 16rpx;
  padding-bottom: 16rpx;
  border-radius: 12rpx;
  transition: background 0.3s ease;

  &.field-invalid {
    background: linear-gradient(180deg, rgba(245, 108, 108, 0.05), transparent);
  }

  &.field-validating {
    background: linear-gradient(180deg, rgba(64, 158, 255, 0.05), transparent);
  }
}

.field-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;

  .required {
    color: #f56c6c;
  }
}

.validating-indicator {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-left: auto;
  padding: 4rpx 12rpx;
  background: #ecf5ff;
  border-radius: 16rpx;
}

.validating-text {
  font-size: 22rpx;
  color: #409eff;
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

  &.border-invalid {
    border-color: #f56c6c;
    background: #fef0f0;
  }
}

.checkbox-group {
  padding: 12rpx 0;
}

.switch-field {
  padding: 12rpx 0;
}

.field-error {
  margin-top: 12rpx;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background: #fef0f0;
  border-radius: 8rpx;
  border: 1rpx solid #fde2e2;

  text {
    font-size: 24rpx;
    color: #f56c6c;
    line-height: 1.4;
  }
}
</style>
