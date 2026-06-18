import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Button, Text, Loading } from '@tarojs/components';
import { printApi, sharePdf, openPdf } from '../services/printApi';
import type { PrintTemplate } from '../types/print';

interface PrintActionSheetProps {
  visible: boolean;
  formDataId: number;
  templateId: number;
  templates: PrintTemplate[];
  onClose: () => void;
}

export default function PrintActionSheet({
  visible,
  formDataId,
  templates,
  onClose,
}: PrintActionSheetProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id
  );
  const [customFileName, setCustomFileName] = useState('');

  if (!visible) return null;

  const handleExportAndShare = async () => {
    try {
      setLoading(true);
      const filePath = await printApi.exportPdf({
        formDataId,
        printTemplateId: selectedTemplateId,
        customFileName: customFileName || undefined,
      });

      await sharePdf(filePath, customFileName || '表单数据');
    } catch (error) {
      Taro.showToast({ title: '分享失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportAndOpen = async () => {
    try {
      setLoading(true);
      const filePath = await printApi.exportPdf({
        formDataId,
        printTemplateId: selectedTemplateId,
        customFileName: customFileName || undefined,
      });

      await openPdf(filePath);
    } catch (error) {
      Taro.showToast({ title: '打开失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToServer = async () => {
    try {
      setLoading(true);
      await printApi.savePdf(formDataId, selectedTemplateId, customFileName || undefined);
      Taro.showToast({ title: '保存成功' });
      onClose();
    } catch (error) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="print-action-sheet">
      <View className="mask" onClick={onClose} />
      <View className="content">
        <View className="header">
          <Text className="title">打印与导出</Text>
          <Text className="close" onClick={onClose}>关闭</Text>
        </View>

        <View className="section">
          <Text className="label">选择打印模板</Text>
          <View className="template-list">
            {templates.map((template) => (
              <View
                key={template.id}
                className={`template-item ${selectedTemplateId === template.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <Text>{template.templateName}</Text>
                {template.isDefault && <Text className="default-tag">默认</Text>}
              </View>
            ))}
          </View>
        </View>

        <View className="section">
          <Text className="label">文件名称（可选）</Text>
          <input
            className="input"
            placeholder="请输入文件名称"
            value={customFileName}
            onInput={(e) => setCustomFileName(e.detail.value)}
          />
        </View>

        <View className="actions">
          <Button
            className="action-btn"
            onClick={handleExportAndShare}
            disabled={loading}
          >
            {loading ? <Loading /> : '导出并分享'}
          </Button>
          <Button
            className="action-btn"
            onClick={handleExportAndOpen}
            disabled={loading}
          >
            {loading ? <Loading /> : '导出并预览'}
          </Button>
          <Button
            className="action-btn"
            onClick={handleSaveToServer}
            disabled={loading}
          >
            {loading ? <Loading /> : '保存到服务器'}
          </Button>
          <Button
            className="action-btn outline"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </Button>
        </View>
      </View>
    </View>
  );
}
