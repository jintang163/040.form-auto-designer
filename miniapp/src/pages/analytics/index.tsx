import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { formTracker } from '@/utils/formTracker';
import type { FormPerformanceStats, OptimizationSuggestion } from '@/types';

type TabType = 'overview' | 'templates' | 'suggestions' | 'sessions';

const AnalyticsPage: React.FC = () => {
  const {
    analyticsData,
    sessions,
    stats,
    suggestions,
    loading,
    fetchAnalytics,
    clearAllData,
    exportData
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useDidShow(() => {
    fetchAnalytics();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    try {
      const data = exportData();
      Taro.setClipboardData({
        data,
        success: () => {
          Taro.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    } catch (error) {
      console.error('[Analytics] Export error:', error);
      Taro.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  };

  const handleClearData = () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除所有统计数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          clearAllData();
          Taro.showToast({
            title: '数据已清除',
            icon: 'success'
          });
        }
      }
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#f53f3f';
      case 'medium': return '#ff7d00';
      case 'low': return '#14c9c9';
      default: return '#86909c';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      case 'low': return styles.low;
      default: return '';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const selectedTemplateStats = useMemo(() => {
    if (!selectedTemplate) return null;
    return stats.find(s => s.templateId === selectedTemplate) || null;
  }, [selectedTemplate, stats]);

  const renderOverview = () => {
    if (!analyticsData) {
      return (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📊</Text>
          <Text className={styles.emptyText}>暂无统计数据</Text>
          <Text className={styles.emptySubText}>填写表单后将自动生成统计</Text>
        </View>
      );
    }

    const { overview } = analyticsData;

    return (
      <View className={styles.overview}>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statIcon}>📝</Text>
            <Text className={styles.statValue}>{overview.totalForms}</Text>
            <Text className={styles.statLabel}>总填写次数</Text>
          </View>

          <View className={styles.statCard}>
            <Text className={styles.statIcon}>✅</Text>
            <Text className={styles.statValue}>{overview.completionRate}%</Text>
            <Text className={styles.statLabel}>完成率</Text>
          </View>

          <View className={styles.statCard}>
            <Text className={styles.statIcon}>⏱️</Text>
            <Text className={styles.statValue}>{formTracker.formatDuration(overview.avgTime)}</Text>
            <Text className={styles.statLabel}>平均耗时</Text>
          </View>

          <View className={styles.statCard}>
            <Text className={styles.statIcon}>{getTrendIcon(overview.trend)}</Text>
            <Text className={styles.statValue}>
              {overview.trend === 'up' ? '上升' : overview.trend === 'down' ? '下降' : '稳定'}
            </Text>
            <Text className={styles.statLabel}>趋势</Text>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>快速操作</Text>
          <View className={styles.actionRow}>
            <View className={styles.actionBtn} onClick={handleExport}>
              <Text className={styles.actionIcon}>📤</Text>
              <Text className={styles.actionText}>导出数据</Text>
            </View>
            <View className={classnames(styles.actionBtn, styles.danger)} onClick={handleClearData}>
              <Text className={styles.actionIcon}>🗑️</Text>
              <Text className={styles.actionText}>清除数据</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>表单排行榜</Text>
          {stats.length > 0 ? (
            <View className={styles.rankingList}>
              {[...stats]
                .sort((a, b) => b.totalForms - a.totalForms)
                .slice(0, 5)
                .map((item, index) => (
                  <View key={item.templateId} className={styles.rankingItem}>
                    <Text className={classnames(styles.rank, index < 3 && styles.topRank)}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </Text>
                    <View className={styles.rankInfo}>
                      <Text className={styles.rankName}>{item.templateName}</Text>
                      <Text className={styles.rankStats}>
                        {item.totalForms} 次填写 · {item.abandonmentRate}% 放弃率
                      </Text>
                    </View>
                    <View
                      className={classnames(
                        styles.rankBadge,
                        item.abandonmentRate > 30 ? styles.danger : styles.success
                      )}
                    >
                      <Text>{item.completedForms} 完成</Text>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <Text className={styles.noData}>暂无排名数据</Text>
          )}
        </View>
      </View>
    );
  };

  const renderTemplates = () => {
    if (selectedTemplateStats) {
      return renderTemplateDetail(selectedTemplateStats);
    }

    return (
      <View className={styles.templateList}>
        {stats.length > 0 ? (
          stats.map((item) => (
            <View
              key={item.templateId}
              className={styles.templateCard}
              onClick={() => setSelectedTemplate(item.templateId)}
            >
              <View className={styles.templateHeader}>
                <Text className={styles.templateName}>{item.templateName}</Text>
                <View
                  className={classnames(
                    styles.statusBadge,
                    item.abandonmentRate > 30 ? styles.danger : styles.success
                  )}
                >
                  <Text>{item.abandonmentRate}% 放弃</Text>
                </View>
              </View>

              <View className={styles.templateStats}>
                <View className={styles.templateStat}>
                  <Text className={styles.statNum}>{item.totalForms}</Text>
                  <Text className={styles.statName}>总填写</Text>
                </View>
                <View className={styles.templateStat}>
                  <Text className={styles.statNum}>{item.completedForms}</Text>
                  <Text className={styles.statName}>已完成</Text>
                </View>
                <View className={styles.templateStat}>
                  <Text className={styles.statNum}>
                    {formTracker.formatDuration(item.avgCompletionTime)}
                  </Text>
                  <Text className={styles.statName}>平均耗时</Text>
                </View>
                <View className={styles.templateStat}>
                  <Text className={styles.statNum}>
                    {formTracker.formatDuration(item.medianCompletionTime)}
                  </Text>
                  <Text className={styles.statName}>中位耗时</Text>
                </View>
              </View>

              <View className={styles.templateFooter}>
                <Text className={styles.arrowText}>查看详情</Text>
                <Text className={styles.arrowIcon}>›</Text>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无模板统计</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTemplateDetail = (templateStats: FormPerformanceStats) => {
    const fieldStatsList = Object.values(templateStats.fieldStats).sort(
      (a, b) => b.avgDuration - a.avgDuration
    );

    return (
      <View className={styles.templateDetail}>
        <View className={styles.backBtn} onClick={() => setSelectedTemplate(null)}>
          <Text className={styles.backIcon}>‹</Text>
          <Text className={styles.backText}>返回列表</Text>
        </View>

        <View className={styles.detailHeader}>
          <Text className={styles.detailTitle}>{templateStats.templateName}</Text>
          <Text className={styles.detailUpdate}>
            更新于 {templateStats.lastUpdated}
          </Text>
        </View>

        <View className={styles.detailStats}>
          <View className={styles.detailStatItem}>
            <Text className={styles.detailStatValue}>{templateStats.totalForms}</Text>
            <Text className={styles.detailStatLabel}>总填写次数</Text>
          </View>
          <View className={styles.detailStatItem}>
            <Text className={styles.detailStatValue}>{templateStats.completedForms}</Text>
            <Text className={styles.detailStatLabel}>已完成</Text>
          </View>
          <View className={styles.detailStatItem}>
            <Text className={styles.detailStatValue}>{templateStats.abandonedForms}</Text>
            <Text className={styles.detailStatLabel}>已放弃</Text>
          </View>
          <View className={styles.detailStatItem}>
            <Text className={styles.detailStatValue}>{templateStats.abandonmentRate}%</Text>
            <Text className={styles.detailStatLabel}>放弃率</Text>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>耗时分布</Text>
          <View className={styles.timeDistribution}>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>最短</Text>
              <Text className={styles.timeValue}>
                {formTracker.formatDuration(templateStats.minCompletionTime)}
              </Text>
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>平均</Text>
              <Text className={classnames(styles.timeValue, styles.highlight)}>
                {formTracker.formatDuration(templateStats.avgCompletionTime)}
              </Text>
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>中位</Text>
              <Text className={styles.timeValue}>
                {formTracker.formatDuration(templateStats.medianCompletionTime)}
              </Text>
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>最长</Text>
              <Text className={styles.timeValue}>
                {formTracker.formatDuration(templateStats.maxCompletionTime)}
              </Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>字段分析（按耗时排序）</Text>
          {fieldStatsList.length > 0 ? (
            <View className={styles.fieldList}>
              {fieldStatsList.map((fieldStat) => (
                <View key={fieldStat.fieldId} className={styles.fieldItem}>
                  <View className={styles.fieldHeader}>
                    <Text className={styles.fieldName}>{fieldStat.fieldLabel}</Text>
                    <Text className={styles.fieldType}>({fieldStat.fieldType})</Text>
                  </View>

                  <View className={styles.fieldStats}>
                    <View className={styles.fieldStatRow}>
                      <Text className={styles.fieldStatLabel}>平均耗时</Text>
                      <Text className={classnames(
                        styles.fieldStatValue,
                        fieldStat.avgDuration > 30000 && styles.dangerText
                      )}>
                        {formTracker.formatDuration(fieldStat.avgDuration)}
                      </Text>
                    </View>
                    <View className={styles.fieldStatRow}>
                      <Text className={styles.fieldStatLabel}>交互次数</Text>
                      <Text className={styles.fieldStatValue}>{fieldStat.totalInteractions}</Text>
                    </View>
                    <View className={styles.fieldStatRow}>
                      <Text className={styles.fieldStatLabel}>错误率</Text>
                      <Text className={classnames(
                        styles.fieldStatValue,
                        fieldStat.errorRate > 20 && styles.dangerText
                      )}>
                        {fieldStat.errorRate}%
                      </Text>
                    </View>
                    <View className={styles.fieldStatRow}>
                      <Text className={styles.fieldStatLabel}>平均编辑次数</Text>
                      <Text className={styles.fieldStatValue}>
                        {fieldStat.totalInteractions > 0
                          ? (fieldStat.editCount / fieldStat.totalInteractions).toFixed(1)
                          : 0}
                      </Text>
                    </View>
                  </View>

                  {fieldStat.avgDuration > 30000 && (
                    <View className={styles.fieldWarning}>
                      <Text className={styles.warningIcon}>⚠️</Text>
                      <Text className={styles.warningText}>此字段填写耗时较长，建议优化</Text>
                    </View>
                  )}

                  {fieldStat.errorRate > 20 && (
                    <View className={styles.fieldWarning}>
                      <Text className={styles.warningIcon}>❌</Text>
                      <Text className={styles.warningText}>此字段错误率较高，建议调整</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text className={styles.noData}>暂无字段数据</Text>
          )}
        </View>
      </View>
    );
  };

  const renderSuggestions = () => {
    const highPriority = suggestions.filter(s => s.severity === 'high');
    const mediumPriority = suggestions.filter(s => s.severity === 'medium');
    const lowPriority = suggestions.filter(s => s.severity === 'low');

    const renderSuggestionCard = (suggestion: OptimizationSuggestion) => (
      <View key={suggestion.id} className={styles.suggestionCard}>
        <View className={styles.suggestionHeader}>
          <View className={classnames(styles.severityBadge, getSeverityBg(suggestion.severity))}>
            <Text style={{ color: getSeverityColor(suggestion.severity) }}>
              {suggestion.severity === 'high' ? '高优先级' : suggestion.severity === 'medium' ? '中优先级' : '低优先级'}
            </Text>
          </View>
          <Text className={styles.suggestionType}>
            {suggestion.type === 'field' ? '字段问题' : suggestion.type === 'form' ? '表单问题' : '流程问题'}
          </Text>
        </View>

        <Text className={styles.suggestionTitle}>{suggestion.title}</Text>
        <Text className={styles.suggestionDesc}>{suggestion.description}</Text>

        <View className={styles.suggestionBox}>
          <Text className={styles.suggestionBoxTitle}>💡 优化建议</Text>
          <Text className={styles.suggestionBoxText}>{suggestion.suggestion}</Text>
        </View>

        <View className={styles.suggestionMetrics}>
          <View className={styles.metricItem}>
            <Text className={styles.metricLabel}>当前值</Text>
            <Text className={classnames(styles.metricValue, styles.dangerText)}>
              {suggestion.metricName === 'avgDuration' || suggestion.metricName === 'avgCompletionTime'
                ? formTracker.formatDuration(suggestion.currentValue)
                : `${suggestion.currentValue}%`}
            </Text>
          </View>
          <View className={styles.metricItem}>
            <Text className={styles.metricLabel}>阈值</Text>
            <Text className={styles.metricValue}>
              {suggestion.metricName === 'avgDuration' || suggestion.metricName === 'avgCompletionTime'
                ? formTracker.formatDuration(suggestion.threshold)
                : `${suggestion.threshold}%`}
            </Text>
          </View>
        </View>
      </View>
    );

    return (
      <View className={styles.suggestions}>
        {suggestions.length > 0 ? (
          <ScrollView scrollY>
            {highPriority.length > 0 && (
              <View className={styles.suggestionSection}>
                <Text className={styles.suggestionSectionTitle}>
                  🔴 高优先级 ({highPriority.length})
                </Text>
                {highPriority.map(renderSuggestionCard)}
              </View>
            )}

            {mediumPriority.length > 0 && (
              <View className={styles.suggestionSection}>
                <Text className={styles.suggestionSectionTitle}>
                  🟠 中优先级 ({mediumPriority.length})
                </Text>
                {mediumPriority.map(renderSuggestionCard)}
              </View>
            )}

            {lowPriority.length > 0 && (
              <View className={styles.suggestionSection}>
                <Text className={styles.suggestionSectionTitle}>
                  🟢 低优先级 ({lowPriority.length})
                </Text>
                {lowPriority.map(renderSuggestionCard)}
              </View>
            )}
          </ScrollView>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✨</Text>
            <Text className={styles.emptyText}>表现优秀</Text>
            <Text className={styles.emptySubText}>暂未发现需要优化的问题</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSessions = () => {
    const recentSessions = [...sessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <View className={styles.sessions}>
        {recentSessions.length > 0 ? (
          <ScrollView scrollY>
            {recentSessions.map((session) => (
              <View key={session.id} className={styles.sessionCard}>
                <View className={styles.sessionHeader}>
                  <Text className={styles.sessionTemplate}>{session.templateName}</Text>
                  <View className={classnames(
                    styles.sessionStatus,
                    session.status === 'completed' ? styles.success : styles.danger
                  )}>
                    <Text>{session.status === 'completed' ? '已完成' : '已放弃'}</Text>
                  </View>
                </View>

                <View className={styles.sessionInfo}>
                  <View className={styles.sessionInfoItem}>
                    <Text className={styles.sessionInfoLabel}>开始时间</Text>
                    <Text className={styles.sessionInfoValue}>
                      {new Date(session.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </View>
                  {session.totalDuration && (
                    <View className={styles.sessionInfoItem}>
                      <Text className={styles.sessionInfoLabel}>耗时</Text>
                      <Text className={styles.sessionInfoValue}>
                        {formTracker.formatDuration(session.totalDuration)}
                      </Text>
                    </View>
                  )}
                  <View className={styles.sessionInfoItem}>
                    <Text className={styles.sessionInfoLabel}>字段数</Text>
                    <Text className={styles.sessionInfoValue}>{session.fieldEvents.length}</Text>
                  </View>
                  <View className={styles.sessionInfoItem}>
                    <Text className={styles.sessionInfoLabel}>网络状态</Text>
                    <Text className={styles.sessionInfoValue}>
                      {session.networkStatus === 'online' ? '在线' : '离线'}
                    </Text>
                  </View>
                </View>

                {session.fieldEvents.length > 0 && (
                  <View className={styles.sessionFields}>
                    <Text className={styles.sessionFieldsTitle}>字段明细</Text>
                    <View className={styles.sessionFieldsList}>
                      {session.fieldEvents.map((event) => (
                        <View key={event.fieldId} className={styles.sessionFieldItem}>
                          <Text className={styles.sessionFieldName}>{event.fieldLabel}</Text>
                          <Text className={styles.sessionFieldStats}>
                            {event.duration ? formTracker.formatDuration(event.duration) : '--'}
                            {event.editCount ? ` · ${event.editCount}次编辑` : ''}
                            {event.hasError ? ' · ⚠️错误' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📜</Text>
            <Text className={styles.emptyText}>暂无会话记录</Text>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'templates': return renderTemplates();
      case 'suggestions': return renderSuggestions();
      case 'sessions': return renderSessions();
      default: return renderOverview();
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: '概览', icon: '📊' },
    { key: 'templates', label: '模板', icon: '📋' },
    { key: 'suggestions', label: '建议', icon: '💡' },
    { key: 'sessions', label: '记录', icon: '📜' }
  ];

  return (
    <View className={styles.analyticsPage}>
      <View className={styles.pageHeader}>
        <Text className={styles.pageTitle}>表单分析</Text>
        <Text className={styles.pageSubTitle}>性能监控与优化建议</Text>
      </View>

      <View className={styles.tabBar}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.activeTab)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabIcon}>{tab.icon}</Text>
            <Text className={styles.tabLabel}>{tab.label}</Text>
            {activeTab === tab.key && <View className={styles.tabIndicator} />}
          </View>
        ))}
      </View>

      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        className={styles.contentScroll}
      >
        {loading && !refreshing ? (
          <View className={styles.loadingState}>
            <Text className={styles.loadingText}>加载中...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>
    </View>
  );
};

export default AnalyticsPage;
