import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AutoComplete, Input, Tag } from 'antd';
import type { InputProps } from 'antd/es/input';
import { EnvironmentOutlined } from '@ant-design/icons';
import { aiRecommendApi } from '@/services/api';
import type { AddressSuggestion } from '@/types';

interface AddressCompleteProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  province?: string;
  city?: string;
  showIcon?: boolean;
  placeholder?: string;
  onAddressSelect?: (suggestion: AddressSuggestion) => void;
}

export const AddressComplete: React.FC<AddressCompleteProps> = ({
  value,
  onChange,
  province,
  city,
  showIcon = true,
  placeholder = '请输入地址，支持智能补全',
  onAddressSelect,
  ...restProps
}) => {
  const [options, setOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  const fetchSuggestions = useCallback(
    async (keyword: string) => {
      if (!keyword || keyword.length < 2) {
        setOptions([]);
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const res = await aiRecommendApi.completeAddress({
          partialAddress: keyword,
          province,
          city,
          limit: 10,
        });

        if (res && res.suggestions) {
          setSuggestions(res.suggestions);
          const newOptions = res.suggestions.map((s) => ({
            value: s.fullAddress,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#333' }}>{s.fullAddress}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {s.district && `${s.province} ${s.city} ${s.district}`}
                  </div>
                </div>
                <Tag
                  color="blue"
                  style={{ flexShrink: 0 }}
                >
                  {Math.round(s.confidence * 100)}% 匹配
                </Tag>
              </div>
            ),
          }));
          setOptions(newOptions);
        }
      } catch (err) {
        console.debug('地址补全失败:', err);
        setOptions([]);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [province, city]
  );

  const handleSearch = useCallback(
    (text: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(text);
      }, 300);
    },
    [fetchSuggestions]
  );

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onChange?.(selectedValue);
      const suggestion = suggestions.find((s) => s.fullAddress === selectedValue);
      if (suggestion) {
        onAddressSelect?.(suggestion);
      }
      setOptions([]);
    },
    [onChange, onAddressSelect, suggestions]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const prefix = useMemo(
    () => (showIcon ? <EnvironmentOutlined style={{ color: '#1677ff' }} /> : undefined),
    [showIcon]
  );

  return (
    <AutoComplete
      value={value}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={(val) => onChange?.(val)}
      notFoundContent={loading ? '加载中...' : null}
      backfill
    >
      <Input
        placeholder={placeholder}
        allowClear
        prefix={prefix}
        {...restProps}
      />
    </AutoComplete>
  );
};

export default AddressComplete;
