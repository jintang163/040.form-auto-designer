import { useEffect, useState } from 'react';
import { Row, Col, Card, Select, Statistic, Spin, Empty, message } from 'antd';
import {
  DatabaseOutlined,
  FileTextOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { templateApi, statisticsApi } from '@/services/api';
import type { FormTemplate, StatisticsDashboard } from '@/types';

export default function DataStatistics() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dashboard, setDashboard] = useState<StatisticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    templateApi.getTemplates({ page: 1, pageSize: 200 }).then((res) => {
      setTemplates(res.list);
      if (res.list.length > 0) setSelectedTemplateId(res.list[0].id);
    }).catch((e) => message.error(e.message));
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    setLoading(true);
    statisticsApi.getDashboard(Number(selectedTemplateId))
      .then((data) => setDashboard(data))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedTemplateId]);

  const getPieOption = (fieldLabel: string, items: { label: string; value: string; count: number }[]) => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: items.map((it) => ({ name: it.label, value: it.count })),
    }],
    title: { text: fieldLabel, left: 'center', textStyle: { fontSize: 14 } },
  });

  const getTrendOption = (trend: { date: string; count: number }[]) => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trend.map((t) => t.date), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'line',
      data: trend.map((t) => t.count),
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: '#1890ff' },
    }],
    grid: { left: 40, right: 20, bottom: 50, top: 20 },
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>选择模板：</span>
        <Select
          style={{ width: 300 }}
          value={selectedTemplateId || undefined}
          onChange={(v) => setSelectedTemplateId(v)}
          options={templates.map((t) => ({ label: `${t.name} (v${t.version})`, value: t.id }))}
          placeholder="请选择模板"
        />
      </div>

      <Spin spinning={loading}>
        {!dashboard ? (
          <Empty description="暂无统计数据" />
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="填报总记录数"
                    value={dashboard.totalRecords}
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="模板数量"
                    value={dashboard.templateCounts?.length || 0}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="数值字段合计"
                    value={dashboard.numericAggregations?.reduce((s, a) => s + (a.sum || 0), 0).toFixed(2) || '0'}
                    prefix={<RiseOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            {dashboard.submissionTrend && dashboard.submissionTrend.length > 0 && (
              <Card title="近30天提交趋势" style={{ marginBottom: 16 }}>
                <ReactECharts option={getTrendOption(dashboard.submissionTrend)} style={{ height: 300 }} />
              </Card>
            )}

            {dashboard.templateCounts && dashboard.templateCounts.length > 0 && (
              <Card title="各模板填报数量" style={{ marginBottom: 16 }}>
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: dashboard.templateCounts.map((t) => t.templateName) },
                    yAxis: { type: 'value', minInterval: 1 },
                    series: [{
                      type: 'bar',
                      data: dashboard.templateCounts.map((t) => t.count),
                      itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
                    }],
                    grid: { left: 40, right: 20, bottom: 20, top: 20 },
                  }}
                  style={{ height: 250 }}
                />
              </Card>
            )}

            {dashboard.fieldDistributions && dashboard.fieldDistributions.length > 0 && (
              <Card title="字段分布统计" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]}>
                  {dashboard.fieldDistributions.map((fd) => (
                    <Col span={12} key={fd.fieldName}>
                      <ReactECharts
                        option={getPieOption(fd.fieldLabel, fd.items)}
                        style={{ height: 280 }}
                      />
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {dashboard.numericAggregations && dashboard.numericAggregations.length > 0 && (
              <Card title="数值字段聚合统计" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]}>
                  {dashboard.numericAggregations.map((agg) => (
                    <Col span={8} key={agg.fieldName}>
                      <Card size="small" title={agg.fieldLabel}>
                        <Row>
                          <Col span={8}><Statistic title="合计" value={agg.sum?.toFixed(2)} /></Col>
                          <Col span={8}><Statistic title="平均" value={agg.avg?.toFixed(2)} /></Col>
                          <Col span={8}><Statistic title="数量" value={agg.count} /></Col>
                        </Row>
                        <Row style={{ marginTop: 8 }}>
                          <Col span={12}><Statistic title="最小值" value={agg.min?.toFixed(2)} /></Col>
                          <Col span={12}><Statistic title="最大值" value={agg.max?.toFixed(2)} /></Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </>
        )}
      </Spin>
    </div>
  );
}
