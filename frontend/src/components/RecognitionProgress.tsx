import { Progress, Steps, Typography } from 'antd';
import type { RecognitionResult } from '@/types';

const { Text } = Typography;

interface RecognitionProgressProps {
  result: RecognitionResult;
}

const stepLabels = ['文件上传', '内容解析', '字段识别', '结果生成'];

export default function RecognitionProgress({ result }: RecognitionProgressProps) {
  const currentStep = (() => {
    switch (result.status) {
      case 'PENDING': return 0;
      case 'PROCESSING': return Math.min(Math.floor(result.progress / 25) + 1, 3);
      case 'COMPLETED': return 4;
      case 'FAILED': return -1;
    }
  })();

  return (
    <div>
      <Steps
        current={currentStep >= 0 ? currentStep : currentStep + 1}
        status={result.status === 'FAILED' ? 'error' : 'process'}
        items={stepLabels.map((label) => ({ title: label }))}
        size="small"
      />
      <div style={{ marginTop: 16 }}>
        {result.status === 'PROCESSING' && (
          <Progress percent={result.progress} status="active" />
        )}
        {result.status === 'COMPLETED' && (
          <Progress percent={100} status="success" />
        )}
        {result.status === 'FAILED' && (
          <>
            <Progress percent={result.progress} status="exception" />
            <Text type="danger">{result.errorMessage || '识别失败'}</Text>
          </>
        )}
        {result.status === 'PENDING' && (
          <Progress percent={0} />
        )}
      </div>
    </div>
  );
}
