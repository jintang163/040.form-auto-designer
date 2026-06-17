import Taro from '@tarojs/taro';
import type { FormTrackSession, FormPerformanceStats } from '@/types';

const STORAGE_KEY_SESSIONS = 'form_track_sessions';
const STORAGE_KEY_STATS = 'form_performance_stats';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const initializeMockAnalytics = (): void => {
  try {
    const existingSessions = Taro.getStorageSync(STORAGE_KEY_SESSIONS) || [];
    if (existingSessions.length > 0) {
      return;
    }

    const mockSessions: FormTrackSession[] = generateMockSessions();
    const mockStats: FormPerformanceStats[] = generateMockStats();

    Taro.setStorageSync(STORAGE_KEY_SESSIONS, mockSessions);
    Taro.setStorageSync(STORAGE_KEY_STATS, mockStats);

    console.log('[MockAnalytics] Mock analytics data initialized');
  } catch (error) {
    console.error('[MockAnalytics] Init error:', error);
  }
};

const generateMockSessions = (): FormTrackSession[] => {
  const templates = [
    { id: 'template_1', name: '设备巡检表' },
    { id: 'template_2', name: '安全检查表' },
    { id: 'template_3', name: '工地质量验收表' }
  ];

  const sessions: FormTrackSession[] = [];
  const now = Date.now();

  for (let i = 0; i < 30; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const isCompleted = Math.random() > 0.25;
    const duration = isCompleted
      ? Math.floor(60000 + Math.random() * 240000)
      : Math.floor(30000 + Math.random() * 120000);
    const startTime = now - (i * 3600000) - Math.random() * 1800000;

    const fieldEvents = generateMockFieldEvents(template.id);

    sessions.push({
      id: generateId(),
      formId: `form_${i}`,
      templateId: template.id,
      templateName: template.name,
      startTime,
      endTime: startTime + duration,
      totalDuration: duration,
      status: isCompleted ? 'completed' : 'abandoned',
      fieldEvents,
      networkStatus: Math.random() > 0.2 ? 'online' : 'offline',
      createdAt: new Date(startTime).toISOString(),
      updatedAt: new Date(startTime + duration).toISOString()
    });
  }

  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const generateMockFieldEvents = (templateId: string) => {
  const fieldConfigs: Record<string, Array<{ id: string; label: string; type: string }>> = {
    template_1: [
      { id: 'device_name', label: '设备名称', type: 'text' },
      { id: 'device_code', label: '设备编号', type: 'text' },
      { id: 'check_date', label: '检查日期', type: 'date' },
      { id: 'device_status', label: '设备状态', type: 'radio' },
      { id: 'issue_description', label: '问题描述', type: 'textarea' },
      { id: 'check_photos', label: '现场照片', type: 'image' }
    ],
    template_2: [
      { id: 'location', label: '检查地点', type: 'text' },
      { id: 'checker', label: '检查人员', type: 'text' },
      { id: 'safety_score', label: '安全评分', type: 'number' },
      { id: 'hazards', label: '安全隐患', type: 'checkbox' },
      { id: 'suggestions', label: '整改建议', type: 'textarea' }
    ],
    template_3: [
      { id: 'project_name', label: '工程名称', type: 'text' },
      { id: 'construction_team', label: '施工班组', type: 'text' },
      { id: 'inspection_items', label: '验收项目', type: 'checkbox' },
      { id: 'quality_level', label: '质量等级', type: 'select' },
      { id: 'inspection_photos', label: '验收照片', type: 'image' },
      { id: 'remarks', label: '备注', type: 'textarea' }
    ]
  };

  const fields = fieldConfigs[templateId] || [];
  const events = [];

  for (const field of fields) {
    const hasError = Math.random() > 0.85;
    const editCount = Math.floor(Math.random() * 5);
    const duration = Math.floor(5000 + Math.random() * 60000);

    events.push({
      fieldId: field.id,
      fieldLabel: field.label,
      fieldType: field.type as any,
      focusAt: Date.now(),
      blurAt: Date.now() + duration,
      duration,
      editCount,
      hasError,
      errorMessage: hasError ? '请输入正确的格式' : undefined,
      value: field.type === 'checkbox' ? ['选项1'] : '测试值'
    });
  }

  return events;
};

const generateMockStats = (): FormPerformanceStats[] => {
  return [
    {
      templateId: 'template_1',
      templateName: '设备巡检表',
      totalForms: 12,
      completedForms: 9,
      abandonedForms: 3,
      abandonmentRate: 25,
      avgCompletionTime: 180000,
      medianCompletionTime: 165000,
      minCompletionTime: 90000,
      maxCompletionTime: 320000,
      fieldStats: {
        device_name: {
          fieldId: 'device_name',
          fieldLabel: '设备名称',
          fieldType: 'text',
          totalInteractions: 12,
          avgDuration: 8000,
          medianDuration: 7500,
          errorRate: 0,
          totalErrors: 0,
          editCount: 15,
          abandonmentCount: 0
        },
        device_code: {
          fieldId: 'device_code',
          fieldLabel: '设备编号',
          fieldType: 'text',
          totalInteractions: 12,
          avgDuration: 12000,
          medianDuration: 10000,
          errorRate: 8,
          totalErrors: 1,
          editCount: 18,
          abandonmentCount: 1
        },
        issue_description: {
          fieldId: 'issue_description',
          fieldLabel: '问题描述',
          fieldType: 'textarea',
          totalInteractions: 10,
          avgDuration: 45000,
          medianDuration: 42000,
          errorRate: 0,
          totalErrors: 0,
          editCount: 25,
          abandonmentCount: 2
        },
        check_photos: {
          fieldId: 'check_photos',
          fieldLabel: '现场照片',
          fieldType: 'image',
          totalInteractions: 8,
          avgDuration: 35000,
          medianDuration: 32000,
          errorRate: 12,
          totalErrors: 1,
          editCount: 12,
          abandonmentCount: 2
        }
      },
      lastUpdated: new Date().toISOString()
    },
    {
      templateId: 'template_2',
      templateName: '安全检查表',
      totalForms: 10,
      completedForms: 6,
      abandonedForms: 4,
      abandonmentRate: 40,
      avgCompletionTime: 210000,
      medianCompletionTime: 195000,
      minCompletionTime: 120000,
      maxCompletionTime: 380000,
      fieldStats: {
        location: {
          fieldId: 'location',
          fieldLabel: '检查地点',
          fieldType: 'text',
          totalInteractions: 10,
          avgDuration: 10000,
          medianDuration: 9000,
          errorRate: 10,
          totalErrors: 1,
          editCount: 12,
          abandonmentCount: 1
        },
        safety_score: {
          fieldId: 'safety_score',
          fieldLabel: '安全评分',
          fieldType: 'number',
          totalInteractions: 8,
          avgDuration: 15000,
          medianDuration: 14000,
          errorRate: 25,
          totalErrors: 2,
          editCount: 20,
          abandonmentCount: 2
        },
        hazards: {
          fieldId: 'hazards',
          fieldLabel: '安全隐患',
          fieldType: 'checkbox',
          totalInteractions: 7,
          avgDuration: 28000,
          medianDuration: 25000,
          errorRate: 14,
          totalErrors: 1,
          editCount: 15,
          abandonmentCount: 3
        },
        suggestions: {
          fieldId: 'suggestions',
          fieldLabel: '整改建议',
          fieldType: 'textarea',
          totalInteractions: 6,
          avgDuration: 52000,
          medianDuration: 48000,
          errorRate: 0,
          totalErrors: 0,
          editCount: 18,
          abandonmentCount: 3
        }
      },
      lastUpdated: new Date().toISOString()
    },
    {
      templateId: 'template_3',
      templateName: '工地质量验收表',
      totalForms: 8,
      completedForms: 7,
      abandonedForms: 1,
      abandonmentRate: 12,
      avgCompletionTime: 150000,
      medianCompletionTime: 140000,
      minCompletionTime: 85000,
      maxCompletionTime: 260000,
      fieldStats: {
        project_name: {
          fieldId: 'project_name',
          fieldLabel: '工程名称',
          fieldType: 'text',
          totalInteractions: 8,
          avgDuration: 7000,
          medianDuration: 6500,
          errorRate: 0,
          totalErrors: 0,
          editCount: 9,
          abandonmentCount: 0
        },
        quality_level: {
          fieldId: 'quality_level',
          fieldLabel: '质量等级',
          fieldType: 'select',
          totalInteractions: 8,
          avgDuration: 12000,
          medianDuration: 11000,
          errorRate: 0,
          totalErrors: 0,
          editCount: 10,
          abandonmentCount: 0
        },
        inspection_photos: {
          fieldId: 'inspection_photos',
          fieldLabel: '验收照片',
          fieldType: 'image',
          totalInteractions: 7,
          avgDuration: 28000,
          medianDuration: 26000,
          errorRate: 14,
          totalErrors: 1,
          editCount: 11,
          abandonmentCount: 1
        }
      },
      lastUpdated: new Date().toISOString()
    }
  ];
};

export default initializeMockAnalytics;
