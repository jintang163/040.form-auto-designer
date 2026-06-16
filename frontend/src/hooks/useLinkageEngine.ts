import { useCallback, useRef } from 'react';
import { linkageApi } from '@/services/api';
import type { LinkageEvaluateResult } from '@/types';

interface FieldLinkageState {
  visible: boolean;
  computedValue?: any;
  dynamicOptions?: { label: string; value: string }[];
  required: boolean;
  disabled: boolean;
}

const defaultState: FieldLinkageState = {
  visible: true,
  required: false,
  disabled: false,
};

export function useLinkageEngine(templateId: string | undefined) {
  const cacheRef = useRef<Record<string, FieldLinkageState>>({});
  const pendingRef = useRef<Promise<void> | null>(null);

  const evaluate = useCallback(
    async (sourceField: string, fieldValues: Record<string, any>) => {
      if (!templateId) return {};
      try {
        const results = await linkageApi.evaluate(templateId, sourceField, fieldValues);
        const map: Record<string, FieldLinkageState> = {};
        for (const r of results) {
          map[r.targetField] = {
            visible: r.visible,
            computedValue: r.computedValue,
            dynamicOptions: r.dynamicOptions,
            required: r.required,
            disabled: r.disabled,
          };
        }
        cacheRef.current = { ...cacheRef.current, ...map };
        return map;
      } catch {
        return {};
      }
    },
    [templateId],
  );

  const evaluateAll = useCallback(
    async (fieldValues: Record<string, any>) => {
      if (!templateId) return {};
      if (pendingRef.current) await pendingRef.current;
      const p = linkageApi.evaluateAll(templateId, fieldValues)
        .then((results) => {
          const map: Record<string, FieldLinkageState> = {};
          for (const r of results) {
            map[r.targetField] = {
              visible: r.visible,
              computedValue: r.computedValue,
              dynamicOptions: r.dynamicOptions,
              required: r.required,
              disabled: r.disabled,
            };
          }
          cacheRef.current = map;
          pendingRef.current = null;
          return map;
        })
        .catch(() => {
          pendingRef.current = null;
          return {};
        });
      pendingRef.current = p;
      return p;
    },
    [templateId],
  );

  const getFieldState = useCallback((fieldName: string): FieldLinkageState => {
    return cacheRef.current[fieldName] || { ...defaultState };
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return { evaluate, evaluateAll, getFieldState, clearCache };
}

export function computeLocal(
  expression: string,
  fieldValues: Record<string, any>,
): any {
  try {
    const keys = Object.keys(fieldValues);
    const vals = Object.values(fieldValues);
    const fn = new Function(...keys, `return (${expression});`);
    return fn(...vals);
  } catch {
    return undefined;
  }
}

export function evaluateConditionLocal(
  conditionExpr: string,
  fieldValues: Record<string, any>,
): boolean {
  try {
    const keys = Object.keys(fieldValues);
    const vals = Object.values(fieldValues);
    const fn = new Function(...keys, `return !!(${conditionExpr});`);
    return fn(...vals);
  } catch {
    return false;
  }
}
