import Taro from '@tarojs/taro';
import type {
  FormTrackSession,
  FieldTrackEvent,
  FormPerformanceStats,
  FieldPerformanceStats,
  OptimizationSuggestion,
  FormAnalyticsData,
  NetworkStatus,
  FieldType
} from '@/types';

const STORAGE_KEY_SESSIONS = 'form_track_sessions';
const STORAGE_KEY_STATS = 'form_performance_stats';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

class FormTracker {
  private currentSession: FormTrackSession | null = null;
  private currentFieldId: string | null = null;
  private fieldStartTime: number = 0;

  startForm(
    formId: string,
    templateId: string,
    templateName: string,
    networkStatus: NetworkStatus
  ): FormTrackSession {
    if (this.currentSession) {
      this.endSession('abandoned');
    }

    const now = Date.now();
    this.currentSession = {
      id: generateId(),
      formId,
      templateId,
      templateName,
      startTime: now,
      status: 'in_progress',
      fieldEvents: [],
      networkStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveSession();
    console.log('[FormTracker] Form started:', this.currentSession.id);
    return this.currentSession;
  }

  trackFieldFocus(fieldId: string, fieldLabel: string, fieldType: FieldType): void {
    if (!this.currentSession) return;

    if (this.currentFieldId && this.currentFieldId !== fieldId) {
      this.trackFieldBlur();
    }

    this.currentFieldId = fieldId;
    this.fieldStartTime = Date.now();

    const existingEvent = this.currentSession.fieldEvents.find(e => e.fieldId === fieldId);
    if (!existingEvent) {
      this.currentSession.fieldEvents.push({
        fieldId,
        fieldLabel,
        fieldType,
        focusAt: this.fieldStartTime,
        editCount: 0,
        hasError: false
      });
    } else {
      existingEvent.focusAt = this.fieldStartTime;
    }

    this.currentSession.updatedAt = new Date().toISOString();
    console.log('[FormTracker] Field focus:', fieldId);
  }

  trackFieldBlur(): void {
    if (!this.currentSession || !this.currentFieldId) return;

    const now = Date.now();
    const duration = now - this.fieldStartTime;

    const event = this.currentSession.fieldEvents.find(e => e.fieldId === this.currentFieldId);
    if (event) {
      event.blurAt = now;
      event.duration = (event.duration || 0) + duration;
    }

    this.currentFieldId = null;
    this.fieldStartTime = 0;
    this.currentSession.updatedAt = new Date().toISOString();
    this.saveSession();

    console.log('[FormTracker] Field blur:', event?.fieldId, 'duration:', duration, 'ms');
  }

  trackFieldEdit(fieldId: string, value: string | string[] | number): void {
    if (!this.currentSession) return;

    const event = this.currentSession.fieldEvents.find(e => e.fieldId === fieldId);
    if (event) {
      event.editCount = (event.editCount || 0) + 1;
      event.value = value;
      this.currentSession.updatedAt = new Date().toISOString();
      console.log('[FormTracker] Field edit:', fieldId, 'editCount:', event.editCount);
    }
  }

  trackFieldError(fieldId: string, errorMessage: string): void {
    if (!this.currentSession) return;

    const event = this.currentSession.fieldEvents.find(e => e.fieldId === fieldId);
    if (event) {
      event.hasError = true;
      event.errorMessage = errorMessage;
      this.currentSession.updatedAt = new Date().toISOString();
      console.log('[FormTracker] Field error:', fieldId, errorMessage);
    }
  }

  completeForm(): FormTrackSession | null {
    return this.endSession('completed');
  }

  abandonForm(): FormTrackSession | null {
    return this.endSession('abandoned');
  }

  private endSession(status: 'completed' | 'abandoned'): FormTrackSession | null {
    if (!this.currentSession) return null;

    if (this.currentFieldId) {
      this.trackFieldBlur();
    }

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.totalDuration = now - this.currentSession.startTime;
    this.currentSession.status = status;
    this.currentSession.updatedAt = new Date().toISOString();

    this.saveSession();
    this.saveToHistory();
    this.updatePerformanceStats();
    this.generateSuggestions();

    const session = { ...this.currentSession };
    console.log('[FormTracker] Form', status + ':', session.id, 'duration:', session.totalDuration, 'ms');

    this.currentSession = null;
    this.currentFieldId = null;
    this.fieldStartTime = 0;

    return session;
  }

  private saveSession(): void {
    if (!this.currentSession) return;
    Taro.setStorageSync('current_form_session', this.currentSession);
  }

  private saveToHistory(): void {
    if (!this.currentSession) return;

    try {
      const sessions = this.getSessions();
      sessions.push(this.currentSession);
      if (sessions.length > 1000) {
        sessions.shift();
      }
      Taro.setStorageSync(STORAGE_KEY_SESSIONS, sessions);
    } catch (error) {
      console.error('[FormTracker] Save history error:', error);
    }
  }

  getSessions(): FormTrackSession[] {
    try {
      return Taro.getStorageSync(STORAGE_KEY_SESSIONS) || [];
    } catch (error) {
      console.error('[FormTracker] Get sessions error:', error);
      return [];
    }
  }

  getCurrentSession(): FormTrackSession | null {
    if (this.currentSession) return this.currentSession;
    try {
      return Taro.getStorageSync('current_form_session') || null;
    } catch (error) {
      return null;
    }
  }

  getElapsedTime(): number {
    if (!this.currentSession) return 0;
    return Date.now() - this.currentSession.startTime;
  }

  private updatePerformanceStats(): void {
    if (!this.currentSession) return;

    try {
      const allStats = this.getAllStats();
      const { templateId, templateName } = this.currentSession;

      let stats = allStats.find(s => s.templateId === templateId);
      if (!stats) {
        stats = {
          templateId,
          templateName,
          totalForms: 0,
          completedForms: 0,
          abandonedForms: 0,
          abandonmentRate: 0,
          avgCompletionTime: 0,
          medianCompletionTime: 0,
          minCompletionTime: 0,
          maxCompletionTime: 0,
          fieldStats: {},
          lastUpdated: new Date().toISOString()
        };
        allStats.push(stats);
      }

      stats.totalForms++;
      if (this.currentSession.status === 'completed') {
        stats.completedForms++;
      } else {
        stats.abandonedForms++;
      }

      stats.abandonmentRate = stats.totalForms > 0
        ? Math.round((stats.abandonedForms / stats.totalForms) * 100)
        : 0;

      const completedSessions = this.getSessions()
        .filter(s => s.templateId === templateId && s.status === 'completed' && s.totalDuration);

      if (completedSessions.length > 0) {
        const durations = completedSessions.map(s => s.totalDuration!);
        durations.sort((a, b) => a - b);

        stats.avgCompletionTime = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        stats.medianCompletionTime = Math.round(durations[Math.floor(durations.length / 2)]);
        stats.minCompletionTime = durations[0];
        stats.maxCompletionTime = durations[durations.length - 1];
      }

      this.currentSession.fieldEvents.forEach(fieldEvent => {
        if (!stats!.fieldStats[fieldEvent.fieldId]) {
          stats!.fieldStats[fieldEvent.fieldId] = {
            fieldId: fieldEvent.fieldId,
            fieldLabel: fieldEvent.fieldLabel,
            fieldType: fieldEvent.fieldType,
            totalInteractions: 0,
            avgDuration: 0,
            medianDuration: 0,
            errorRate: 0,
            totalErrors: 0,
            editCount: 0,
            abandonmentCount: 0
          };
        }

        const fieldStat = stats!.fieldStats[fieldEvent.fieldId];
        fieldStat.totalInteractions++;
        fieldStat.editCount += fieldEvent.editCount || 0;
        if (fieldEvent.hasError) fieldStat.totalErrors++;

        const fieldDurations = this.getSessions()
          .flatMap(s => s.fieldEvents)
          .filter(e => e.fieldId === fieldEvent.fieldId && e.duration)
          .map(e => e.duration!);

        if (fieldDurations.length > 0) {
          fieldDurations.sort((a, b) => a - b);
          fieldStat.avgDuration = Math.round(fieldDurations.reduce((a, b) => a + b, 0) / fieldDurations.length);
          fieldStat.medianDuration = Math.round(fieldDurations[Math.floor(fieldDurations.length / 2)]);
        }

        fieldStat.errorRate = fieldStat.totalInteractions > 0
          ? Math.round((fieldStat.totalErrors / fieldStat.totalInteractions) * 100)
          : 0;

        if (this.currentSession!.status === 'abandoned') {
          fieldStat.abandonmentCount++;
        }
      });

      stats.lastUpdated = new Date().toISOString();
      Taro.setStorageSync(STORAGE_KEY_STATS, allStats);
      console.log('[FormTracker] Performance stats updated for:', templateName);
    } catch (error) {
      console.error('[FormTracker] Update stats error:', error);
    }
  }

  getAllStats(): FormPerformanceStats[] {
    try {
      return Taro.getStorageSync(STORAGE_KEY_STATS) || [];
    } catch (error) {
      console.error('[FormTracker] Get stats error:', error);
      return [];
    }
  }

  private generateSuggestions(): OptimizationSuggestion[] {
    const allStats = this.getAllStats();
    const suggestions: OptimizationSuggestion[] = [];

    allStats.forEach(stats => {
      if (stats.abandonmentRate > 30) {
        suggestions.push({
          id: generateId(),
          type: 'form',
          severity: 'high',
          title: '表单放弃率过高',
          description: `「${stats.templateName}」的放弃率为 ${stats.abandonmentRate}%，超过了 30% 的警戒线。`,
          suggestion: '建议简化表单字段，优化填写流程，或将长表单拆分为多个步骤。',
          metricName: 'abandonmentRate',
          currentValue: stats.abandonmentRate,
          threshold: 30,
          createdAt: new Date().toISOString()
        });
      }

      if (stats.avgCompletionTime > 180000) {
        suggestions.push({
          id: generateId(),
          type: 'form',
          severity: 'medium',
          title: '平均填写时间过长',
          description: `「${stats.templateName}」的平均填写时间为 ${Math.round(stats.avgCompletionTime / 1000)} 秒，超过了 3 分钟。`,
          suggestion: '建议分析各字段停留时间，优化耗时较长的字段，或添加进度提示。',
          metricName: 'avgCompletionTime',
          currentValue: stats.avgCompletionTime,
          threshold: 180000,
          createdAt: new Date().toISOString()
        });
      }

      Object.values(stats.fieldStats).forEach(fieldStat => {
        if (fieldStat.avgDuration > 30000) {
          suggestions.push({
            id: generateId(),
            type: 'field',
            severity: 'medium',
            title: '字段填写耗时过长',
            description: `字段「${fieldStat.fieldLabel}」平均耗时 ${Math.round(fieldStat.avgDuration / 1000)} 秒，超过了 30 秒。`,
            suggestion: '建议优化字段类型或提供更清晰的填写说明。',
            affectedFields: [fieldStat.fieldId],
            metricName: 'avgDuration',
            currentValue: fieldStat.avgDuration,
            threshold: 30000,
            createdAt: new Date().toISOString()
          });
        }

        if (fieldStat.errorRate > 20) {
          suggestions.push({
            id: generateId(),
            type: 'field',
            severity: 'high',
            title: '字段错误率过高',
            description: `字段「${fieldStat.fieldLabel}」的错误率为 ${fieldStat.errorRate}%，超过了 20%。`,
            suggestion: '建议添加实时校验提示，优化输入格式说明，或调整字段类型。',
            affectedFields: [fieldStat.fieldId],
            metricName: 'errorRate',
            currentValue: fieldStat.errorRate,
            threshold: 20,
            createdAt: new Date().toISOString()
          });
        }

        if (fieldStat.abandonmentCount > 5 && fieldStat.totalInteractions > 10) {
          const abandonmentRate = Math.round((fieldStat.abandonmentCount / fieldStat.totalInteractions) * 100);
          if (abandonmentRate > 20) {
            suggestions.push({
              id: generateId(),
              type: 'field',
              severity: 'high',
              title: '字段放弃率高',
              description: `字段「${fieldStat.fieldLabel}」处的放弃率为 ${abandonmentRate}%，许多用户在此处停止填写。`,
              suggestion: '建议简化此字段，或移至非必填项，或提供智能填充功能。',
              affectedFields: [fieldStat.fieldId],
              metricName: 'abandonmentCount',
              currentValue: abandonmentRate,
              threshold: 20,
              createdAt: new Date().toISOString()
            });
          }
        }
      });
    });

    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    console.log('[FormTracker] Generated', uniqueSuggestions.length, 'optimization suggestions');
    return uniqueSuggestions;
  }

  private deduplicateSuggestions(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = `${s.type}-${s.metricName}-${s.affectedFields?.join(',') || 'global'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getSuggestions(): OptimizationSuggestion[] {
    return this.generateSuggestions();
  }

  getAnalyticsData(): FormAnalyticsData {
    const allStats = this.getAllStats();
    const sessions = this.getSessions();

    const totalForms = sessions.length;
    const completedForms = sessions.filter(s => s.status === 'completed').length;
    const completionRate = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

    const completedDurations = sessions
      .filter(s => s.status === 'completed' && s.totalDuration)
      .map(s => s.totalDuration!);

    const avgTime = completedDurations.length > 0
      ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length)
      : 0;

    const recentSessions = sessions.slice(-20);
    const olderSessions = sessions.slice(-40, -20);
    const recentCompletion = recentSessions.filter(s => s.status === 'completed').length / Math.max(recentSessions.length, 1);
    const olderCompletion = olderSessions.filter(s => s.status === 'completed').length / Math.max(olderSessions.length, 1);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentCompletion > olderCompletion + 0.1) trend = 'up';
    else if (recentCompletion < olderCompletion - 0.1) trend = 'down';

    return {
      overview: {
        totalForms,
        completionRate,
        avgTime,
        trend
      },
      templateStats: allStats,
      suggestions: this.getSuggestions()
    };
  }

  clearAllData(): void {
    try {
      Taro.removeStorageSync(STORAGE_KEY_SESSIONS);
      Taro.removeStorageSync(STORAGE_KEY_STATS);
      Taro.removeStorageSync('current_form_session');
      console.log('[FormTracker] All tracking data cleared');
    } catch (error) {
      console.error('[FormTracker] Clear data error:', error);
    }
  }

  formatDuration(ms: number): string {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)} 秒`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes} 分 ${seconds} 秒`;
  }
}

export const formTracker = new FormTracker();
export default formTracker;
