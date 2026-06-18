import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Modal, Select, message, Spin, Space } from 'antd';
import {
  PrinterOutlined,
  DownloadOutlined,
  EyeOutlined,
  SettingOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import type { PrintTemplate } from '../types/print';
import { printTemplateApi, printApi, downloadBlob } from '../services/printApi';

interface PrintButtonProps {
  formDataId: number;
  templateId: number;
  type?: 'button' | 'dropdown';
  buttonText?: string;
  onSuccess?: () => void;
}

const PrintButton: React.FC<PrintButtonProps> = ({
  formDataId,
  templateId,
  type = 'dropdown',
  buttonText = '打印/导出',
  onSuccess,
}) => {
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [watermarkText, setWatermarkText] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [templateId]);

  const loadTemplates = async () => {
    try {
      const data = await printTemplateApi.listByTemplateId(templateId);
      setTemplates(data);
      const defaultTemplate = data.find((t) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      } else if (data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error('加载打印模板失败:', error);
    }
  };

  const handleExportPdf = async (saveToServer: boolean = false) => {
    if (!formDataId) {
      message.error('请先保存表单数据');
      return;
    }

    setLoading(true);
    try {
      const blob = await printApi.exportPdf({
        formDataId,
        printTemplateId: selectedTemplate,
        saveToServer,
        customFileName: customFileName || undefined,
        watermarkText: watermarkText || undefined,
      });

      const fileName = customFileName || `表单_${formDataId}.pdf`;
      downloadBlob(blob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);

      message.success('PDF导出成功');
      onSuccess?.();
    } catch (error) {
      console.error('PDF导出失败:', error);
      message.error('PDF导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!formDataId) {
      message.error('请先保存表单数据');
      return;
    }
    handlePreview();
  };

  const handlePreview = async () => {
    if (!formDataId) {
      message.error('请先保存表单数据');
      return;
    }

    setLoading(true);
    try {
      const result = await printApi.generatePreview(formDataId, selectedTemplate);
      setPreviewUrl(result.previewUrl);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('生成预览失败:', error);
      message.error('生成预览失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open(previewUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }
  };

  const dropdownItems = [
    {
      key: 'exportPdf',
      label: '导出PDF',
      icon: <FilePdfOutlined />,
      onClick: () => handleExportPdf(false),
    },
    {
      key: 'exportAndSave',
      label: '导出并保存到服务器',
      icon: <DownloadOutlined />,
      onClick: () => handleExportPdf(true),
    },
    {
      key: 'preview',
      label: '打印预览',
      icon: <EyeOutlined />,
      onClick: handlePrint,
    },
    {
      key: 'settings',
      label: '打印设置',
      icon: <SettingOutlined />,
      onClick: () => setTemplateModalVisible(true),
    },
  ];

  const renderButton = () => {
    if (type === 'button') {
      return (
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          loading={loading}
        >
          {buttonText}
        </Button>
      );
    }

    return (
      <Dropdown.Button
        type="primary"
        icon={<PrinterOutlined />}
        menu={{ items: dropdownItems }}
        onClick={handlePrint}
        loading={loading}
      >
        {buttonText}
      </Dropdown.Button>
    );
  };

  return (
    <>
      {renderButton()}

      <Modal
        title="打印预览"
        open={previewModalVisible}
        width={900}
        footer={[
          <Button key="back" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button key="print" type="primary" onClick={handleBrowserPrint}>
            <PrinterOutlined /> 打印
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => {
              handleExportPdf(false);
            }}
          >
            <DownloadOutlined /> 下载PDF
          </Button>,
        ]}
        onCancel={() => setPreviewModalVisible(false)}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="正在生成预览..." />
          </div>
        ) : (
          previewUrl && (
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title="PDF预览"
            />
          )
        )}
      </Modal>

      <Modal
        title="打印设置"
        open={templateModalVisible}
        width={600}
        footer={[
          <Button key="back" onClick={() => setTemplateModalVisible(false)}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={() => setTemplateModalVisible(false)}>
            确定
          </Button>,
        ]}
        onCancel={() => setTemplateModalVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>选择打印模板</label>
            <Select
              style={{ width: '100%' }}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder="请选择打印模板"
              options={templates.map((t) => ({
                label: `${t.templateName}${t.isDefault ? ' (默认)' : ''}`,
                value: t.id,
              }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>自定义文件名</label>
            <input
              type="text"
              className="ant-input"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="可选，不填则使用默认名称"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>水印文字</label>
            <input
              type="text"
              className="ant-input"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="可选，临时水印文字"
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default PrintButton;
