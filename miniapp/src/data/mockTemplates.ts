import type { FormTemplate } from '@/types';

export const mockTemplates: FormTemplate[] = [
  {
    id: 'template_001',
    name: '设备巡检表',
    description: '用于日常设备巡检，记录设备运行状态、异常情况等',
    category: '设备管理',
    version: 'v1.2',
    icon: '🔧',
    fields: [
      {
        id: 'field_001',
        type: 'text',
        label: '设备编号',
        placeholder: '请输入设备编号',
        required: true,
        maxLength: 50
      },
      {
        id: 'field_002',
        type: 'text',
        label: '设备名称',
        placeholder: '请输入设备名称',
        required: true,
        maxLength: 100
      },
      {
        id: 'field_003',
        type: 'select',
        label: '设备类型',
        required: true,
        options: ['变压器', '发电机', '电动机', '控制柜', '其他']
      },
      {
        id: 'field_004',
        type: 'select',
        label: '运行状态',
        required: true,
        options: ['正常运行', '待机', '停机', '故障']
      },
      {
        id: 'field_005',
        type: 'textarea',
        label: '巡检记录',
        placeholder: '请详细描述巡检情况',
        required: true,
        maxLength: 500
      },
      {
        id: 'field_006',
        type: 'image',
        label: '现场照片',
        required: false
      },
      {
        id: 'field_007',
        type: 'date',
        label: '巡检日期',
        required: true
      },
      {
        id: 'field_008',
        type: 'text',
        label: '巡检人员',
        placeholder: '请输入巡检人员姓名',
        required: true
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-01T14:30:00Z'
  },
  {
    id: 'template_002',
    name: '安全检查表',
    description: '用于安全检查，记录安全隐患、防护措施等',
    category: '安全管理',
    version: 'v1.0',
    icon: '🛡️',
    fields: [
      {
        id: 'field_101',
        type: 'text',
        label: '检查地点',
        placeholder: '请输入检查地点',
        required: true
      },
      {
        id: 'field_102',
        type: 'checkbox',
        label: '检查项目',
        required: true,
        options: ['消防设施', '用电安全', '防护用品', '安全通道', '警示标识', '应急设备']
      },
      {
        id: 'field_103',
        type: 'radio',
        label: '整体安全等级',
        required: true,
        options: ['优秀', '良好', '一般', '较差']
      },
      {
        id: 'field_104',
        type: 'textarea',
        label: '隐患描述',
        placeholder: '请描述发现的安全隐患',
        required: false,
        maxLength: 500
      },
      {
        id: 'field_105',
        type: 'image',
        label: '隐患照片',
        required: false
      },
      {
        id: 'field_106',
        type: 'textarea',
        label: '整改建议',
        placeholder: '请输入整改建议',
        required: false,
        maxLength: 300
      },
      {
        id: 'field_107',
        type: 'date',
        label: '检查日期',
        required: true
      }
    ],
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-15T11:20:00Z'
  },
  {
    id: 'template_003',
    name: '工地质量验收表',
    description: '用于施工现场质量验收，记录各分项工程质量情况',
    category: '工程管理',
    version: 'v2.1',
    icon: '🏗️',
    fields: [
      {
        id: 'field_201',
        type: 'text',
        label: '工程名称',
        placeholder: '请输入工程名称',
        required: true
      },
      {
        id: 'field_202',
        type: 'text',
        label: '分项工程',
        placeholder: '请输入分项工程名称',
        required: true
      },
      {
        id: 'field_203',
        type: 'select',
        label: '验收部位',
        required: true,
        options: ['地基基础', '主体结构', '装饰装修', '屋面工程', '给排水', '电气工程', '其他']
      },
      {
        id: 'field_204',
        type: 'radio',
        label: '质量评定',
        required: true,
        options: ['合格', '优良', '不合格']
      },
      {
        id: 'field_205',
        type: 'textarea',
        label: '质量问题描述',
        placeholder: '请描述发现的质量问题',
        required: false,
        maxLength: 500
      },
      {
        id: 'field_206',
        type: 'image',
        label: '验收照片',
        required: false
      },
      {
        id: 'field_207',
        type: 'number',
        label: '验收工程量',
        placeholder: '请输入工程量',
        required: false,
        min: 0
      },
      {
        id: 'field_208',
        type: 'text',
        label: '验收人员',
        placeholder: '请输入验收人员姓名',
        required: true
      }
    ],
    createdAt: '2024-01-20T10:30:00Z',
    updatedAt: '2024-03-10T15:45:00Z'
  },
  {
    id: 'template_004',
    name: '环境监测记录表',
    description: '用于环境监测，记录温度、湿度、噪声等环境参数',
    category: '环境管理',
    version: 'v1.1',
    icon: '🌿',
    fields: [
      {
        id: 'field_301',
        type: 'text',
        label: '监测点名称',
        placeholder: '请输入监测点名称',
        required: true
      },
      {
        id: 'field_302',
        type: 'number',
        label: '温度(°C)',
        placeholder: '请输入温度值',
        required: true,
        min: -50,
        max: 100
      },
      {
        id: 'field_303',
        type: 'number',
        label: '湿度(%)',
        placeholder: '请输入湿度值',
        required: true,
        min: 0,
        max: 100
      },
      {
        id: 'field_304',
        type: 'number',
        label: '噪声(dB)',
        placeholder: '请输入噪声值',
        required: false,
        min: 0,
        max: 200
      },
      {
        id: 'field_305',
        type: 'select',
        label: '空气质量',
        required: false,
        options: ['优', '良', '轻度污染', '中度污染', '重度污染']
      },
      {
        id: 'field_306',
        type: 'textarea',
        label: '备注',
        placeholder: '请输入其他监测信息',
        required: false,
        maxLength: 300
      },
      {
        id: 'field_307',
        type: 'date',
        label: '监测日期',
        required: true
      },
      {
        id: 'field_308',
        type: 'time',
        label: '监测时间',
        required: true
      }
    ],
    createdAt: '2024-02-10T08:00:00Z',
    updatedAt: '2024-02-28T16:30:00Z'
  },
  {
    id: 'template_005',
    name: '物资盘点表',
    description: '用于仓库物资盘点，记录库存数量、状态等',
    category: '物资管理',
    version: 'v1.0',
    icon: '📦',
    fields: [
      {
        id: 'field_401',
        type: 'text',
        label: '物资编码',
        placeholder: '请输入物资编码',
        required: true
      },
      {
        id: 'field_402',
        type: 'text',
        label: '物资名称',
        placeholder: '请输入物资名称',
        required: true
      },
      {
        id: 'field_403',
        type: 'text',
        label: '规格型号',
        placeholder: '请输入规格型号',
        required: false
      },
      {
        id: 'field_404',
        type: 'number',
        label: '账面数量',
        placeholder: '请输入账面数量',
        required: true,
        min: 0
      },
      {
        id: 'field_405',
        type: 'number',
        label: '实际数量',
        placeholder: '请输入实际盘点数量',
        required: true,
        min: 0
      },
      {
        id: 'field_406',
        type: 'select',
        label: '物资状态',
        required: true,
        options: ['完好', '损坏', '过期', '丢失']
      },
      {
        id: 'field_407',
        type: 'textarea',
        label: '差异说明',
        placeholder: '请说明数量差异原因',
        required: false,
        maxLength: 300
      },
      {
        id: 'field_408',
        type: 'image',
        label: '物资照片',
        required: false
      }
    ],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z'
  }
];

export const initializeTemplates = () => {
  return mockTemplates.map((template) => ({
    ...template,
    downloaded: false
  }));
};
