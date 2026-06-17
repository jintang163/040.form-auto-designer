import React from 'react';
import { Dropdown, Button, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useI18n } from '@/contexts/I18nContext';
import type { LanguageCode } from '@/types';
import { LANGUAGE_OPTIONS } from '@/types';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language);

  const menuItems: MenuProps['items'] = LANGUAGE_OPTIONS.map((opt) => ({
    key: opt.code,
    label: (
      <Space>
        <span>{opt.flag}</span>
        <span>{opt.name}</span>
      </Space>
    ),
    onClick: () => setLanguage(opt.code as LanguageCode),
  }));

  return (
    <Dropdown menu={{ items: menuItems, selectedKeys: [language] }} placement="bottomRight">
      <Button
        type="text"
        icon={<GlobalOutlined />}
        style={{ color: 'inherit' }}
      >
        <Space size={4}>
          <span>{currentOption?.flag}</span>
          <span>{currentOption?.name}</span>
        </Space>
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
