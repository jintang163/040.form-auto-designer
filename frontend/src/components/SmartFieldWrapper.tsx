import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Spin, Alert } from 'antd';
import FieldSuggestion from './FieldSuggestion';
import { validationApi, aiRecommendApi } from '@/services/api';
import type {
  FieldValidationResult,
  ValidationSuggestion,
  ContextRecommendation,
} from '@/types';

interface SmartFieldWrapperProps {
  fieldName: string;
  fieldLabel?: string;
  templateId: string;
  submitterId: string;
  value?: any;
  allValues: Record<string, any>;
  isAddressField?: boolean;
  children: React.ReactNode;
  onValueChange?: (value: any) => void;
  debounceMs?: number;
  enableSuggestions?: boolean;
  enableAutoCorrect?: boolean;
}

export const SmartFieldWrapper: React.FC<SmartFieldWrapperProps> = ({
  fieldName,
  fieldLabel,
  templateId,
  submitterId,
  value,
  allValues,
  isAddressField,
  children,
  onValueChange,
  debounceMs = 500,
  enableSuggestions = true,
  enableAutoCorrect = true,
}) => {
  const [validationResult, setValidationResult] = useState<FieldValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<any>(value);

  const validateField = useCallback(async () => {
    if (!templateId) return;

    setValidating(true);
    try {
      const res = await validationApi.validateField({
        templateId: Number(templateId),
        fieldName,
        fieldValue: value,
        contextData: allValues,
        submitterId,
        enableSuggestions,
        enableAutoCorrect,
      });
      setValidationResult(res);
    } catch (err) {
      console.debug(`字段 ${fieldName} 服务端校验失败:`, err);
    } finally {
      setValidating(false);
    }
  }, [fieldName, value, allValues, templateId, submitterId, enableSuggestions, enableAutoCorrect]);

  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (touched) {
      debounceRef.current = setTimeout(() => {
        validateField();
      }, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, touched, debounceMs, validateField]);

  const handleBlur = useCallback(() => {
    if (!touched) {
      setTouched(true);
      validateField();
    }
  }, [touched, validateField]);

  const handleApplySuggestion = useCallback(
    (suggestion: ValidationSuggestion) => {
      onValueChange?.(suggestion.suggestedValue);
      setValidationResult(null);
    },
    [onValueChange]
  );

  const handleApplyAutoCorrect = useCallback(
    (correctedValue: string) => {
      onValueChange?.(correctedValue);
      setValidationResult(null);
    },
    [onValueChange]
  );

  const showSuggestions = useMemo(() => {
    if (!touched || !validationResult) return false;
    return !validationResult.valid || (validationResult.suggestions?.length ?? 0) > 0;
  }, [touched, validationResult]);

  return (
    <div
      style={{
        position: 'relative',
        transition: 'all 0.2s',
        padding: validating ? '4px 0' : '0',
      }}
      onBlur={handleBlur}
    >
      <div style={{ position: 'relative' }}>
        {children}
        {validating && (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: '#e6f4ff',
              borderRadius: 12,
              fontSize: 12,
              color: '#1677ff',
            }}
          >
            <Spin size="small" />
            <span>校验中</span>
          </div>
        )}
      </div>

      <FieldSuggestion
        visible={showSuggestions}
        errors={validationResult?.errors || []}
        suggestions={validationResult?.suggestions || []}
        autoCorrectedValue={validationResult?.autoCorrectedValue}
        onApplySuggestion={handleApplySuggestion}
        onApplyAutoCorrect={handleApplyAutoCorrect}
      />
    </div>
  );
};

export default SmartFieldWrapper;
