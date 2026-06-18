import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Tabs,
  Card,
  Row,
  Col,
  message,
  Space,
  Divider,
} from 'antd';
import { PlusOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import type { PrintTemplate, PrintTemplateDTO } from '../types/print';
import { printTemplateApi } from '../services/printApi';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

interface PrintTemplateEditorProps {
  open: boolean;
  templateId: number;
  editTemplate?: PrintTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PrintTemplateEditor: React.FC<PrintTemplateEditorProps> = ({
  open,
  templateId,
  editTemplate,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<PrintTemplateDTO>();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        form.setFieldsValue(editTemplate);
      } else {
        form.resetFields();
        form.setFieldsValue({
          templateId,
          templateType: 'NORMAL',
          paperSize: 'A4',
          orientation: 'PORTRAIT',
          marginTop: 2.54,
          marginBottom: 2.54,
          marginLeft: 2.54,
          marginRight: 2.54,
          watermarkEnabled: false,
          watermarkOpacity: 0.3,
          watermarkRotation: 30,
          watermarkFontSize: 50,
          watermarkColor: '#CCCCCC',
          headerEnabled: false,
          footerEnabled: false,
          backgroundFixed: true,
          isDefault: false,
          status: 'ACTIVE',
        });
      }
    }
  }, [open, editTemplate, templateId, form]);

  const handleGenerateDefaultContent = async () => {
    try {
      const result = await printTemplateApi.generateDefaultContent(templateId);
      form.setFieldsValue({ templateContent: result.templateContent });
      message.success('已生成默认模板内容');
    } catch (error) {
      message.error('生成默认模板失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editTemplate) {
        await printTemplateApi.update(editTemplate.id, values);
        message.success('模板更新成功');
      } else {
        await printTemplateApi.create(values);
        message.success('模板创建成功');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setPreviewVisible(true);
  };

  const basicInfoForm = (
    <Card title="基本信息">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="templateName"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="templateCode"
            label="模板编码"
            rules={[{ required: true, message: '请输入模板编码' }]}
          >
            <Input placeholder="请输入模板编码" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="templateType" label="模板类型">
            <Select>
              <Option value="NORMAL">普通模板</Option>
              <Option value="PREPRINT">套打模板</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="状态">
            <Select>
              <Option value="ACTIVE">激活</Option>
              <Option value="INACTIVE">禁用</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="isDefault" label="设为默认模板" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Card>
  );

  const pageSettingsForm = (
    <Card title="页面设置">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="paperSize" label="纸张大小">
            <Select>
              <Option value="A3">A3</Option>
              <Option value="A4">A4</Option>
              <Option value="A5">A5</Option>
              <Option value="LETTER">Letter</Option>
              <Option value="LEGAL">Legal</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="orientation" label="打印方向">
            <Select>
              <Option value="PORTRAIT">纵向</Option>
              <Option value="LANDSCAPE">横向</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Divider orientation="left">页边距 (cm)</Divider>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item name="marginTop" label="上边距">
            <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="marginBottom" label="下边距">
            <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="marginLeft" label="左边距">
            <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="marginRight" label="右边距">
            <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const watermarkForm = (
    <Card title="水印设置">
      <Form.Item name="watermarkEnabled" label="启用水印" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.watermarkEnabled !== curr.watermarkEnabled}>
        {({ getFieldValue }) =>
          getFieldValue('watermarkEnabled') ? (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="watermarkText"
                  label="水印文字"
                  rules={[{ required: true, message: '请输入水印文字' }]}
                >
                  <Input placeholder="请输入水印文字" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="watermarkOpacity" label="透明度">
                  <InputNumber min={0.1} max={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="watermarkRotation" label="旋转角度">
                  <InputNumber min={0} max={360} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="watermarkFontSize" label="字体大小">
                  <InputNumber min={10} max={200} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="watermarkColor" label="水印颜色">
                  <Input type="color" style={{ width: '100%', height: '40px' }} />
                </Form.Item>
              </Col>
            </Row>
          ) : null
        }
      </Form.Item>
    </Card>
  );

  const headerFooterForm = (
    <Card title="页眉页脚">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="headerEnabled" label="启用页眉" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.headerEnabled !== curr.headerEnabled}>
            {({ getFieldValue }) =>
              getFieldValue('headerEnabled') ? (
                <Form.Item name="headerContent" label="页眉内容">
                  <TextArea rows={3} placeholder="支持HTML标签" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="footerEnabled" label="启用页脚" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.footerEnabled !== curr.footerEnabled}>
            {({ getFieldValue }) =>
              getFieldValue('footerEnabled') ? (
                <Form.Item name="footerContent" label="页脚内容">
                  <TextArea rows={3} placeholder="支持HTML标签，可用 ${pageNumber} 表示页码" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const templateContentForm = (
    <Card
      title="模板内容 (HTML/Thymeleaf)"
      extra={
        <Button icon={<PlusOutlined />} onClick={handleGenerateDefaultContent}>
          生成默认模板
        </Button>
      }
    >
      <Form.Item
        name="templateContent"
        rules={[{ required: true, message: '请输入模板内容' }]}
      >
        <TextArea
          rows={20}
          placeholder="请输入HTML模板内容，支持Thymeleaf语法。&#10;可用变量：&#10;- ${fields.fieldName} - 表单字段值&#10;- ${formTitle} - 表单标题&#10;- ${submittedAt} - 提交时间&#10;- ${submitterId} - 提交人ID"
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>
      <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>模板变量说明：</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>
            <code>{'${fields.fieldName}'}</code> - 获取表单字段值
          </li>
          <li>
            <code>{'${formTitle}'}</code> - 表单标题
          </li>
          <li>
            <code>{'${#dates.format(submittedAt, \'yyyy-MM-dd HH:mm:ss\')}'}</code> - 格式化提交时间
          </li>
          <li>
            <code>{'${submitterId}'}</code> - 提交人ID
          </li>
          <li>
            <code>{'${formId}'}</code> - 表单数据ID
          </li>
        </ul>
      </div>
    </Card>
  );

  const backgroundForm = (
    <Card title="背景设置 (套打)">
      <Form.Item name="backgroundImageUrl" label="背景图片URL">
        <Input placeholder="套打时使用的背景图片URL" />
      </Form.Item>
      <Form.Item name="backgroundFixed" label="背景固定" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Card>
  );

  return (
    <>
      <Modal
        title={editTemplate ? '编辑打印模板' : '新建打印模板'}
        open={open}
        width={900}
        footer={[
          <Button key="back" onClick={onClose}>
            取消
          </Button>,
          <Button key="preview" icon={<EyeOutlined />} onClick={handlePreview}>
            预览
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSubmit}
          >
            保存
          </Button>,
        ]}
        onCancel={onClose}
        bodyStyle={{ paddingTop: '16px' }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="templateId" hidden>
            <Input />
          </Form.Item>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="基本信息" key="basic">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {basicInfoForm}
                {pageSettingsForm}
              </Space>
            </TabPane>
            <TabPane tab="模板内容" key="content">
              {templateContentForm}
            </TabPane>
            <TabPane tab="水印设置" key="watermark">
              {watermarkForm}
            </TabPane>
            <TabPane tab="页眉页脚" key="headerFooter">
              {headerFooterForm}
            </TabPane>
            <TabPane tab="背景设置" key="background">
              {backgroundForm}
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      <Modal
        title="模板预览"
        open={previewVisible}
        width={900}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        onCancel={() => setPreviewVisible(false)}
      >
        <div
          style={{
            background: '#fff',
            padding: '20px',
            minHeight: '400px',
            border: '1px solid #d9d9d9',
          }}
          dangerouslySetInnerHTML={{ __html: form.getFieldValue('templateContent') || '' }}
        />
      </Modal>
    </>
  );
};

export default PrintTemplateEditor;
