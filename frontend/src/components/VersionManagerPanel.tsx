import { useState } from 'react';
import { Modal, Drawer, Button, message } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import VersionTimeline from './VersionTimeline';
import VersionDiffModal from './VersionDiffModal';
import type { RollbackResult } from '@/types';

interface VersionManagerPanelProps {
  templateId: string;
  templateName: string;
  currentVersion: number;
  open: boolean;
  onClose: () => void;
  onRefresh?: (rollbackResult?: RollbackResult) => void;
}

export default function VersionManagerPanel({
  templateId,
  templateName,
  currentVersion,
  open,
  onClose,
  onRefresh,
}: VersionManagerPanelProps) {
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [compareSource, setCompareSource] = useState(0);
  const [compareTarget, setCompareTarget] = useState(0);

  const handleCompare = (sourceVersion: number, targetVersion: number) => {
    setCompareSource(sourceVersion);
    setCompareTarget(targetVersion);
    setDiffModalOpen(true);
  };

  const handleRollbackSuccess = (rollbackResult?: RollbackResult) => {
    message.success('版本回滚成功');
    onRefresh?.(rollbackResult);
  };

  return (
    <>
      <Drawer
        title={
          <span>
            <HistoryOutlined style={{ marginRight: 8 }} />
            {templateName} - 版本管理
          </span>
        }
        open={open}
        onClose={onClose}
        width={600}
        destroyOnClose
      >
        <VersionTimeline
          templateId={templateId}
          currentVersion={currentVersion}
          onRefresh={handleRollbackSuccess}
          onCompare={handleCompare}
        />
      </Drawer>

      <VersionDiffModal
        open={diffModalOpen}
        templateId={templateId}
        sourceVersion={compareSource}
        targetVersion={compareTarget}
        onClose={() => setDiffModalOpen(false)}
      />
    </>
  );
}
