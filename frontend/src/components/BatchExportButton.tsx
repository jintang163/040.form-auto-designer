import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Select,
  Checkbox,
  Input,
  message,
  Space,
  Form,
} from 'antd';
import { ExportOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { PrintTemplate } from '../types/print';
import { printTemplateApi, printApi, downloadBlob } from '../services/printApi';

interface BatchExportButtonProps {
  formDataIds: number[];
  templateId: number;
  disabled?: boolean;
  buttonText?: string;
  onSuccess?: () => void;
}

const BatchExportButton: React.FC<BatchExportButtonProps> = ({
  formDataIds,
  templateId,
  disabled = false,
  buttonText = '批量导出',
  onSuccess,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (modalVisible) {
      loadTemplates();
    }
  }, [modalVisible, templateId]);

  const loadTemplates = async () => {
    try {
      const data = await printTemplateApi.listByTemplateId(templateId);
      setTemplates(data);
      const defaultTemplate = data.find((t) => t.isDefault);
      if (defaultTemplate) {
        form.setFieldsValue({ printTemplateId: defaultTemplate.id });
      } else if (data.length > 0) {
        form.setFieldsValue({ printTemplateId: data[0].id });
      }
    } catch (error) {
      console.error('加载打印模板失败:', error);
    }
  };

  const handleExport = async () => {
    if (formDataIds.length === 0) {
      message.warning('请先选择要导出的数据');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const blob = await printApi.batchExportPdf({
        formDataIds,
        printTemplateId: values.printTemplateId,
        mergeIntoSingleFile: values.mergeIntoSingleFile,
        customFileName: values.customFileName,
      });

      const fileName = values.customFileName || `批量导出_${formDataIds.length}条.pdf`;
      downloadBlob(blob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);

      message.success(`成功导出 ${formDataIds.length} 条数据`);
      onSuccess?.();
      setModalVisible(false);
    } catch (error) {
      console.error('批量导出失败:', error);
      message.error('批量导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<ExportOutlined />}
        disabled={disabled || formDataIds.length === 0}
        onClick={() => setModalVisible(true)}
      >
        {buttonText}
        {formDataIds.length > 0 && ` (${formDataIds.length})`}
      </Button>

      <Modal
        title="批量导出PDF"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<FilePdfOutlined />}
            loading={loading}
            onClick={handleExport}
          >
            导出
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="printTemplateId"
            label="选择打印模板"
            rules={[{ required: true, message: '请选择打印模板' }]}
          >
            <Select placeholder="请选择打印模板">
              {templates.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.templateName}
                  {t.isDefault && ' (默认)'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mergeIntoSingleFile"
            label="导出方式"
            initialValue={true}
            valuePropName="checked"
          >
            <Checkbox>合并为单个PDF文件</Checkbox>
          </Form.Item>

          <Form.Item name="customFileName" label="自定义文件名">
            <Input placeholder="可选，不填则使用默认名称" />
          </Form.Item>

          <div style={{ color: '#666', fontSize: '13px' }}>
            已选择 {formDataIds.length} 条数据进行导出
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default BatchExportButton;
