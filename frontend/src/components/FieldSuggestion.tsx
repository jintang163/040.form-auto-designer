import React, { useMemo } from 'react';
import { Alert, Tag, Space, Button, Progress } from 'antd';
import {
  BulbOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { ServerValidationError, ValidationSuggestion } from '@/types';

interface FieldSuggestionProps {
  visible: boolean;
  errors?: ServerValidationError[];
  suggestions?: ValidationSuggestion[];
  autoCorrectedValue?: string;
  fillHint?: string;
  exampleValues?: string[];
  explanation?: string;
  onApplySuggestion?: (suggestion: ValidationSuggestion) => void;
  onApplyAutoCorrect?: (value: string) => void;
  onApplyExample?: (value: string) => void;
}

const suggestionIconMap: Record<string, string> = {
  HISTORICAL: '📜',
  TYPO_CORRECTION: '✏️',
  ADDRESS_AUTOCOMPLETE: '📍',
  PATTERN_MATCH: '🔍',
};

const suggestionTagMap: Record<string, { label: string; color: string }> = {
  HISTORY_USER_HISTORY: { label: '历史记录', color: 'green' },
  HISTORY_COLLABORATIVE: { label: '相似用户', color: 'cyan' },
  HISTORY_GLOBAL: { label: '热门选择', color: 'orange' },
  HISTORY: { label: '历史推荐', color: 'green' },
  USER_HISTORY: { label: '您的历史', color: 'green' },
  COLLABORATIVE: { label: '相似用户', color: 'cyan' },
  GLOBAL: { label: '热门选择', color: 'orange' },
  SIMILARITY_MATCH: { label: '相似匹配', color: 'gold' },
  RULE_BASED: { label: '规则推荐', color: 'blue' },
  SEMANTIC_MATCH: { label: '语义识别', color: 'purple' },
  TYPE_BASED: { label: '类型默认', color: 'geekblue' },
  ID_CARD_PARSE: { label: '身份证解析', color: 'magenta' },
  ID_CARD_REGION: { label: '地区识别', color: 'magenta' },
  PHONE_PREFIX: { label: '手机号段', color: 'magenta' },
  NAME_PATTERN: { label: '姓名推断', color: 'magenta' },
  PROVINCE_CAPITAL: { label: '省会推断', color: 'magenta' },
  ADDRESS_ZIPCODE: { label: '邮编推断', color: 'magenta' },
  COMPANY_KEYWORD: { label: '公司分析', color: 'magenta' },
  EMAIL_PREFIX: { label: '邮箱前缀', color: 'magenta' },
};

export const FieldSuggestion: React.FC<FieldSuggestionProps> = ({
  visible,
  errors = [],
  suggestions = [],
  autoCorrectedValue,
  fillHint,
  exampleValues = [],
  explanation,
  onApplySuggestion,
  onApplyAutoCorrect,
  onApplyExample,
}) => {
  const sortedErrors = useMemo(
    () => [...errors].sort((a, b) => (b.severity || 0) - (a.severity || 0)),
    [errors]
  );

  if (!visible) return null;

  const showErrors = sortedErrors.length > 0;
  const showSuggestions = suggestions.length > 0;

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      {showErrors && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
          message={
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              {sortedErrors.slice(0, 3).map((err, idx) => (
                <div
                  key={`err-${idx}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
                >
                  <span
                    style={{
                      color: err.severity === 1 ? '#faad14' : '#ff4d4f',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    ●
                  </span>
                  <span style={{ fontSize: 13, color: '#606266' }}>
                    {err.errorMessage}
                  </span>
                </div>
              ))}
              {autoCorrectedValue && (
                <div
                  onClick={() => onApplyAutoCorrect?.(autoCorrectedValue)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#e6f4ff',
                    border: '1px solid #91caff',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  <ReloadOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontSize: 13, color: '#1677ff', flex: 1 }}>
                    自动修正为：
                    <strong style={{ color: '#000' }}>{autoCorrectedValue}</strong>
                  </span>
                  <Button size="small" type="primary" ghost>
                    应用
                  </Button>
                </div>
              )}
            </Space>
          }
        />
      )}

      {(fillHint || exampleValues.length > 0 || explanation) && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 8 }}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {explanation && (
                <div style={{ fontSize: 13, color: '#606266' }}>
                  <span style={{ color: '#1677ff', fontWeight: 500 }}>💡 提示：</span>
                  {explanation}
                </div>
              )}
              {fillHint && (
                <div style={{ fontSize: 12, color: '#909399' }}>
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  {fillHint}
                </div>
              )}
              {exampleValues.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#909399', marginBottom: 4 }}>
                    📝 填写示例：
                  </div>
                  <Space wrap size={4}>
                    {exampleValues.slice(0, 5).map((example, idx) => (
                      <Tag
                        key={`example-${idx}`}
                        color="blue"
                        style={{
                          cursor: 'pointer',
                          margin: 0,
                        }}
                        onClick={() => onApplyExample?.(example)}
                      >
                        {example}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          }
        />
      )}

      {showSuggestions && (
        <Alert
          type="warning"
          showIcon
          icon={<BulbOutlined />}
          message={
            <div>
              <div style={{ marginBottom: 6 }}>
                <Space size={4}>
                  <BulbOutlined style={{ color: '#faad14' }} />
                  <strong style={{ fontSize: 13, color: '#d48806' }}>智能建议</strong>
                </Space>
              </div>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {suggestions.slice(0, 5).map((suggestion, idx) => {
                  const icon = suggestionIconMap[suggestion.suggestionType] || '💡';
                  const tag = suggestionTagMap[suggestion.source] || {
                    label: 'AI推荐',
                    color: 'purple',
                  };

                  return (
                    <div
                      key={`sug-${idx}`}
                      onClick={() => onApplySuggestion?.(suggestion)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fff1b8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fffbe6';
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#fff7e6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: '#303133',
                              marginBottom: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            {suggestion.suggestionMessage}
                          </div>
                          {suggestion.suggestedValue && (
                            <div
                              style={{
                                position: 'relative',
                                padding: '4px 8px',
                                background: '#f0f2f5',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${(suggestion.confidence * 100).toFixed(0)}%`,
                                  background:
                                    'linear-gradient(90deg, rgba(22, 119, 255, 0.15), rgba(82, 196, 26, 0.15))',
                                  borderRadius: 4,
                                  transition: 'width 0.3s',
                                }}
                              />
                              <div
                                style={{
                                  position: 'relative',
                                  zIndex: 1,
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  color: '#606266',
                                }}
                              >
                                {suggestion.suggestedValue}
                              </div>
                              <Progress
                                percent={Math.round(suggestion.confidence * 100)}
                                size="small"
                                showInfo={false}
                                style={{ marginTop: 4 }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <Space size={4}>
                        <Tag color={tag.color as any} size="small">
                          {tag.label}
                        </Tag>
                        <ArrowRightOutlined style={{ color: '#909399', fontSize: 12 }} />
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </div>
          }
        />
      )}
    </div>
  );
};

export default FieldSuggestion;
