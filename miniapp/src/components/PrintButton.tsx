import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Button, Text } from '@tarojs/components';
import PrintActionSheet from './PrintActionSheet';
import BluetoothPrint from './BluetoothPrint';
import { printTemplateApi } from '../services/printApi';
import type { PrintTemplate } from '../types/print';

interface PrintButtonProps {
  formDataId: number;
  templateId: number;
  formData?: Record<string, any>;
  fields?: Array<{ label: string; name: string }>;
  className?: string;
}

export default function PrintButton({
  formDataId,
  templateId,
  formData,
  fields,
  className,
}: PrintButtonProps) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBluetoothPrint, setShowBluetoothPrint] = useState(false);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await printTemplateApi.listByTemplateId(templateId);
      setTemplates(data);
    } catch (error) {
      Taro.showToast({ title: '加载模板失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (templates.length === 0) {
      await loadTemplates();
    }
    if (templates.length === 0) {
      Taro.showToast({ title: '暂无打印模板', icon: 'none' });
      return;
    }
    setShowActionSheet(true);
  };

  const handleBluetoothPrint = () => {
    if (!formData) {
      Taro.showToast({ title: '缺少表单数据', icon: 'none' });
      return;
    }
    setShowActionSheet(false);
    setTimeout(() => {
      setShowBluetoothPrint(true);
    }, 300);
  };

  return (
    <View className={className}>
      <Button
        className="print-btn"
        onClick={handlePress}
        loading={loading}
        size="small"
      >
        打印 / 导出
      </Button>

      <PrintActionSheet
        visible={showActionSheet}
        formDataId={formDataId}
        templateId={templateId}
        templates={templates}
        onClose={() => setShowActionSheet(false)}
      />

      <BluetoothPrint
        visible={showBluetoothPrint}
        onClose={() => setShowBluetoothPrint(false)}
        formData={formData}
        fields={fields}
      />

      {showActionSheet && formData && (
        <View className="bluetooth-entry" onClick={handleBluetoothPrint}>
          <Text className="bluetooth-text">📡 蓝牙打印</Text>
        </View>
      )}
    </View>
  );
}
