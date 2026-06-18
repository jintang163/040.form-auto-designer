import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Loading } from '@tarojs/components';
import PrintButton from '../../components/PrintButton';
import { formDataApi } from '../../services/api';
import type { FormData, FormField } from '../../types';

interface FieldInfo {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldValue: any;
  isSensitive: boolean;
}

export default function FormDataDetail() {
  const router = useRouter();
  const id = router.params.id as string;
  const templateId = router.params.templateId as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [submitTime, setSubmitTime] = useState('');

  const loadDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await formDataApi.getDetail(Number(id));
      setFormData(JSON.parse(data.data || '{}'));
      setTemplateName(data.templateName || '');
      setSubmitter(data.submitterId || '');
      setSubmitTime(data.createdAt || '');

      if (data.templateId) {
        const fieldList = await formDataApi.getTemplateFields(data.templateId);
        const infoList: FieldInfo[] = fieldList.map((f: FormField) => ({
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          fieldValue: JSON.parse(data.data || '{}')[f.fieldName],
          isSensitive: f.isSensitive || false,
        }));
        setFields(infoList);
      }
    } catch (error) {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const renderFieldValue = (field: FieldInfo) => {
    if (field.fieldValue === null || field.fieldValue === undefined || field.fieldValue === '') {
      return <Text className="empty">-</Text>;
    }

    if (field.isSensitive) {
      return <Text className="sensitive">***</Text>;
    }

    if (Array.isArray(field.fieldValue)) {
      return <Text>{field.fieldValue.join(', ')}</Text>;
    }

    return <Text>{String(field.fieldValue)}</Text>;
  };

  return (
    <View className="form-data-detail">
      <View className="header">
        <Text className="title">表单数据详情</Text>
        {id && templateId && (
          <PrintButton
            formDataId={Number(id)}
            templateId={Number(templateId)}
            formData={formData}
            fields={fields.map((f) => ({ label: f.fieldLabel, name: f.fieldName }))}
          />
        )}
      </View>

      {loading ? (
        <View className="loading">
          <Loading />
        </View>
      ) : (
        <>
          <View className="info-card">
            <View className="info-row">
              <Text className="info-label">模板名称</Text>
              <Text className="info-value">{templateName}</Text>
            </View>
            <View className="info-row">
              <Text className="info-label">提交人</Text>
              <Text className="info-value">{submitter}</Text>
            </View>
            <View className="info-row">
              <Text className="info-label">提交时间</Text>
              <Text className="info-value">{submitTime}</Text>
            </View>
          </View>

          <View className="fields-card">
            <Text className="card-title">表单内容</Text>
            {fields.map((field) => (
              <View key={field.fieldName} className="field-row">
                <Text className="field-label">{field.fieldLabel}</Text>
                <View className="field-value">
                  {renderFieldValue(field)}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
