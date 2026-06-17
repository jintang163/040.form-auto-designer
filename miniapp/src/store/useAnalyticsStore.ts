import { create } from 'zustand';
import { formTracker } from '@/utils/formTracker';
import type {
  FormAnalyticsData,
  FormTrackSession,
  FormPerformanceStats,
  OptimizationSuggestion
} from '@/types';

interface AnalyticsState {
  analyticsData: FormAnalyticsData | null;
  sessions: FormTrackSession[];
  stats: FormPerformanceStats[];
  suggestions: OptimizationSuggestion[];
  loading: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
  fetchSessions: () => void;
  fetchStats: () => void;
  fetchSuggestions: () => void;
  clearAllData: () => void;
  exportData: () => string;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analyticsData: null,
  sessions: [],
  stats: [],
  suggestions: [],
  loading: false,
  error: null,

  fetchAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const data = formTracker.getAnalyticsData();
      set({
        analyticsData: data,
        sessions: formTracker.getSessions(),
        stats: formTracker.getAllStats(),
        suggestions: data.suggestions,
        loading: false
      });
    } catch (error) {
      set({ error: '加载统计数据失败', loading: false });
      console.error('[Analytics] Fetch error:', error);
    }
  },

  fetchSessions: () => {
    try {
      const sessions = formTracker.getSessions();
      set({ sessions });
    } catch (error) {
      console.error('[Analytics] Fetch sessions error:', error);
    }
  },

  fetchStats: () => {
    try {
      const stats = formTracker.getAllStats();
      set({ stats });
    } catch (error) {
      console.error('[Analytics] Fetch stats error:', error);
    }
  },

  fetchSuggestions: () => {
    try {
      const suggestions = formTracker.getSuggestions();
      set({ suggestions });
    } catch (error) {
      console.error('[Analytics] Fetch suggestions error:', error);
    }
  },

  clearAllData: () => {
    try {
      formTracker.clearAllData();
      set({
        analyticsData: null,
        sessions: [],
        stats: [],
        suggestions: []
      });
    } catch (error) {
      console.error('[Analytics] Clear data error:', error);
    }
  },

  exportData: () => {
    const { sessions, stats } = get();
    const exportObj = {
      exportTime: new Date().toISOString(),
      version: '1.0.0',
      sessions,
      performanceStats: stats,
      summary: {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        abandonedSessions: sessions.filter(s => s.status === 'abandoned').length,
        totalTemplates: stats.length
      }
    };
    return JSON.stringify(exportObj, null, 2);
  }
}));
