import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import type { NetworkStatus } from '@/types';

export const useNetwork = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('unknown');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const checkNetwork = async () => {
    try {
      const res = await Taro.getNetworkType();
      const status = res.networkType === 'none' ? 'offline' : 'online';
      setNetworkStatus(status);
      setIsOnline(status === 'online');
      console.log('[Network] checkNetwork:', status);
    } catch (error) {
      console.error('[Network] checkNetwork error:', error);
      setNetworkStatus('unknown');
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkNetwork();

    const offNetworkStatusChange = Taro.onNetworkStatusChange((res) => {
      const status = res.isConnected ? 'online' : 'offline';
      setNetworkStatus(status);
      setIsOnline(res.isConnected);
      console.log('[Network] status changed:', status);
    });

    return () => {
      if (offNetworkStatusChange) {
        offNetworkStatusChange();
      }
    };
  }, []);

  return {
    networkStatus,
    isOnline,
    checkNetwork
  };
};
