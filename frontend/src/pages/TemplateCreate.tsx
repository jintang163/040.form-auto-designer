import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Steps, Button, Upload, Card, Space, message, Spin, Row, Col, Tabs,
  List, Drawer, Form, Input, Modal, Empty, Tag,
} from 'antd';
import {
  UploadOutlined, PlusOutlined, DeleteOutlined,
  HolderOutlined, SaveOutlined, SendOutlined, HistoryOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormStore } from '@/store/formStore';
import { templateApi, fileApi, recognitionApi, fieldApi } from '@/services/api';
import { recognitionResultToFormSchema, generateFormSchema } from '@/utils/schemaTransform';
import FieldEditor from '@/components/FieldEditor';
import SchemaPreview from '@/components/SchemaPreview';
import RecognitionProgress from '@/components/RecognitionProgress';
import VersionManagerPanel from '@/components/VersionManagerPanel';
import OcrImageUploader from '@/components/OcrImageUploader';
import LinkageRuleConfig from '@/components/LinkageRuleConfig';
import type { FieldConfig, FormField, RecognitionResult, FormSchema, RollbackResult, OcrFieldItem } from '@/types';

function SortableFieldItem({ field, selected, onClick, onDelete }: {
  field: FormField; selected: boolean; onClick: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    background: selected ? '#e6f4ff' : '#fff',
    border: selected ? '1px solid #1677ff' : '1px solid #d9d9d9',
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 4,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ marginRight: 8 }}><HolderOutlined /></span>
      <span onClick={onClick} style={{ flex: 1, cursor: 'pointer' }}>{field.fieldLabel} ({field.fieldName})</span>
      <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={onDelete} />
    </div>
  );
}

function generateFieldId() {
  return 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function createEmptyField(sortOrder: number): FormField {
  return {
    id: generateFieldId(),
    templateId: '',
    fieldName: `field_${sortOrder + 1}`,
    fieldLabel: `字段${sortOrder + 1}`,
    fieldType: 'string',
    inputType: 'text',
    required: false,
    validationRules: [],
    sortOrder,
    layoutConfig: { row: Math.floor(sortOrder / 2) + 1, col: (sortOrder % 2) + 1, rowSpan: 1, colSpan: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function TemplateCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const {
    fields, currentTemplate, recognition, recognitionLoading,
    selectedFieldId, fetchFields, setCurrentTemplate, setRecognition,
    setRecognitionLoading, setSelectedFieldId, reorderFields, addFieldLocal,
    updateFieldLocal, removeFieldLocal, setFields,
  } = useFormStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [schema, setSchema] = useState<FormSchema>({ type: 'object', properties: {} });
  const [saving, setSaving] = useState(false);
  const [templateForm] = Form.useForm();
  const [rawText, setRawText] = useState<string>('');
  const [recognitionId, setRecognitionId] = useState<string>('');
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);
  const [changelogForm] = Form.useForm();
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (id) {
      templateApi.getTemplate(id).then((t) => {
        setCurrentTemplate(t);
        templateForm.setFieldsValue({ name: t.name, code: t.code, description: t.description });
      });
      fetchFields(id);
    }
    return () => {
      setCurrentTemplate(null);
      setRecognition(null);
      setSelectedFieldId(null);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [id]);

  useEffect(() => {
    const s = generateFormSchema(fields.map((f) => ({ ...f })));
    setSchema(s);
  }, [fields]);

  const pollRecognition = useCallback((recId: string) => {
    const timer = setInterval(async () => {
      try {
        const result = await recognitionApi.getRecognitionStatus(recId);
        setRecognition(result);
        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
          clearInterval(timer);
          setPollTimer(null);
          if (result.status === 'COMPLETED' && result.fields) {
            const newFields: FormField[] = result.fields.map((fc, i) => ({
              ...fc,
              id: generateFieldId(),
              templateId: '',
              sortOrder: i,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
            for (const f of newFields) addFieldLocal(f);
            message.success('识别完成，已生成字段');
          }
        }
      } catch {
        clearInterval(timer);
        setPollTimer(null);
      }
    }, 2000);
    setPollTimer(timer);
  }, []);

  const handleUpload = async (file: File) => {
    try {
      setRecognitionLoading(true);
      const uploadResult = await fileApi.uploadFile(file);
      const recResult = await recognitionApi.startRecognition(uploadResult.fileId);
      setRecognitionId(recResult.id);
      setRecognition(recResult);
      pollRecognition(recResult.id);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setRecognitionLoading(false);
    }
  };

  const handleOcrFieldsRecognized = (items: OcrFieldItem[]) => {
    if (!items || items.length === 0) return;
    const base = fields.length;
    const newFields: FormField[] = items.map((fc, i) => ({
      id: generateFieldId(),
      templateId: '',
      fieldName: fc.fieldName,
      fieldLabel: fc.fieldLabel,
      fieldType: (fc.fieldType || 'string') as FormField['fieldType'],
      inputType: (fc.inputType || 'text') as FormField['inputType'],
      required: !!fc.required,
      defaultValue: fc.defaultValue,
      validationRules: [],
      sortOrder: base + (fc.sortOrder ?? i),
      layoutConfig: { row: Math.floor((base + i) / 2) + 1, col: ((base + i) % 2) + 1, rowSpan: 1, colSpan: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    for (const f of newFields) addFieldLocal(f);
    message.success(`OCR 已生成 ${newFields.length} 个字段`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reordered.forEach((f, i) => (f.sortOrder = i));
    reorderFields(currentTemplate?.id || '', reordered);
  };

  const handleAddField = () => {
    addFieldLocal(createEmptyField(fields.length));
  };

  const handleFieldChange = (fieldId: string, data: Partial<FieldConfig>) => {
    updateFieldLocal(fieldId, data);
  };

  const handleSave = async (publish: boolean, changeLog?: string) => {
    try {
      const values = await templateForm.validateFields();
      setSaving(true);
      const templateData = {
        ...values,
        schemaJson: JSON.stringify(schema),
        changeLog,
      };
      if (isEdit && id) {
        await templateApi.updateTemplate(id, templateData);
        await fieldApi.batchUpdateFields(id, fields.map((f) => ({ ...f })));
        if (publish) await templateApi.publishTemplate(id);
      } else {
        const created = await templateApi.createTemplate(templateData);
        await fieldApi.batchUpdateFields(created.id, fields.map((f) => ({ ...f, templateId: created.id })));
        if (publish) await templateApi.publishTemplate(created.id);
      }
      message.success(publish ? '发布成功' : '保存成功');
      navigate('/templates');
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openChangelogModal = (action: 'save' | 'publish') => {
    setPendingAction(action);
    changelogForm.resetFields();
    setChangelogModalOpen(true);
  };

  const handleChangelogConfirm = async () => {
    try {
      const values = await changelogForm.validateFields();
      setChangelogModalOpen(false);
      if (pendingAction) {
        await handleSave(pendingAction === 'publish', values.changeLog);
      }
      setPendingAction(null);
    } catch (e: any) {
      if (e.errorFields) return;
    }
  };

  const handleRefreshAfterVersion = (rollbackResult?: RollbackResult) => {
    if (!id) return;

    if (rollbackResult) {
      setCurrentTemplate(rollbackResult.template);
      templateForm.setFieldsValue({
        name: rollbackResult.template.name,
        code: rollbackResult.template.code,
        description: rollbackResult.template.description,
      });
      setFields(rollbackResult.fields);
      setSelectedFieldId(null);
      message.success(`已回滚至 v${rollbackResult.newVersion}，字段已同步到编辑区`);
    } else {
      templateApi.getTemplate(id).then((t) => {
        setCurrentTemplate(t);
        templateForm.setFieldsValue({ name: t.name, code: t.code, description: t.description });
      });
      fetchFields(id);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const steps = ['文件上传与识别', '字段配置', '保存与发布'];

  return (
    <div>
      {isEdit && currentTemplate && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color="blue">v{currentTemplate.version}</Tag>
            <Tag color={currentTemplate.status === 'PUBLISHED' ? 'green' : 'default'}>
              {currentTemplate.status === 'PUBLISHED' ? '已发布' : currentTemplate.status === 'ARCHIVED' ? '已归档' : '草稿'}
            </Tag>
          </Space>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setVersionPanelOpen(true)}
          >
            版本管理
          </Button>
        </div>
      )}

      <Steps current={currentStep} items={steps.map((s) => ({ title: s }))} style={{ marginBottom: 24 }} />

      {currentStep === 0 && (
        <Tabs
          items={[
            {
              key: 'document',
              label: '文档/图片识别（表单模板）',
              children: (
                <Row gutter={24}>
                  <Col span={12}>
                    <Card title="上传文件" size="small">
                      <Upload
                        accept=".docx,.jpg,.jpeg,.png"
                        showUploadList={false}
                        beforeUpload={(file) => { handleUpload(file); return false; }}
                      >
                        <Button icon={<UploadOutlined />} loading={recognitionLoading}>选择文件上传</Button>
                      </Upload>
                      <p style={{ marginTop: 8, color: '#999' }}>支持 docx、jpg、png 格式，自动生成表单字段</p>
                      {recognition && <RecognitionProgress result={recognition} />}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="原文预览" size="small">
                      {rawText ? (
                        <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{rawText}</pre>
                      ) : (
                        <Empty description="上传文件后自动识别" />
                      )}
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'ocr',
              label: '证件 OCR 识别（身份证/营业执照）',
              children: (
                <OcrImageUploader onFieldsRecognized={handleOcrFieldsRecognized} />
              ),
            },
          ]}
        />
      )}

      {currentStep === 1 && (
        <Row gutter={16}>
          <Col span={8}>
            <Card
              title="字段列表"
              size="small"
              extra={<Button size="small" icon={<PlusOutlined />} onClick={handleAddField}>添加</Button>}
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      selected={field.id === selectedFieldId}
                      onClick={() => setSelectedFieldId(field.id)}
                      onDelete={() => removeFieldLocal(field.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {fields.length === 0 && <Empty description="暂无字段" />}
            </Card>
            {isEdit && id && (
              <div style={{ marginTop: 12 }}>
                <LinkageRuleConfig templateId={id} fields={fields} />
              </div>
            )}
          </Col>
          <Col span={8}>
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onChange={(data) => handleFieldChange(selectedField.id, data)}
                allFields={fields}
              />
            ) : (
              <Card size="small"><Empty description="选择字段进行编辑" /></Card>
            )}
          </Col>
          <Col span={8}>
            <SchemaPreview schema={schema} templateId={isEdit && id ? id : undefined} />
          </Col>
        </Row>
      )}

      {currentStep === 2 && (
        <Row gutter={24}>
          <Col span={14}>
            <SchemaPreview schema={schema} templateId={isEdit && id ? id : undefined} />
          </Col>
          <Col span={10}>
            <Card title="模板信息" size="small">
              <Form form={templateForm} layout="vertical">
                <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="code" label="模板编码" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Space>
          {currentStep > 0 && <Button onClick={() => setCurrentStep(currentStep - 1)}>上一步</Button>}
          {currentStep < 2 && (
            <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>下一步</Button>
          )}
          {currentStep === 2 && (
            <>
              <Button icon={<SaveOutlined />} loading={saving} onClick={() => openChangelogModal('save')}>保存草稿</Button>
              <Button type="primary" icon={<SendOutlined />} loading={saving} onClick={() => openChangelogModal('publish')}>直接发布</Button>
            </>
          )}
          <Button onClick={() => navigate('/templates')}>取消</Button>
        </Space>
      </div>

      <Modal
        title={pendingAction === 'publish' ? '发布版本说明' : '保存版本说明'}
        open={changelogModalOpen}
        onOk={handleChangelogConfirm}
        onCancel={() => { setChangelogModalOpen(false); setPendingAction(null); }}
        okText={pendingAction === 'publish' ? '确认发布' : '确认保存'}
        confirmLoading={saving}
      >
        <Form form={changelogForm} layout="vertical">
          <Form.Item
            name="changeLog"
            label="版本说明"
            rules={[{ required: true, message: '请输入版本说明' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={pendingAction === 'publish' ? '描述本次发布的主要变更内容...' : '描述本次保存的主要变更内容...'}
            />
          </Form.Item>
        </Form>
      </Modal>

      {isEdit && currentTemplate && (
        <VersionManagerPanel
          templateId={currentTemplate.id}
          templateName={currentTemplate.name}
          currentVersion={currentTemplate.version}
          open={versionPanelOpen}
          onClose={() => setVersionPanelOpen(false)}
          onRefresh={handleRefreshAfterVersion}
        />
      )}
    </div>
  );
}
