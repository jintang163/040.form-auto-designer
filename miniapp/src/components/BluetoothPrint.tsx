import { useState, useEffect, useCallback } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Button, Text, List, ListItem } from '@tarojs/components';
import {
  bluetoothPrintService,
  BluetoothDevice,
  BluetoothPrinter,
  escposCommands,
} from '../services/printApi';

interface BluetoothPrintProps {
  visible: boolean;
  onClose: () => void;
  formData?: Record<string, any>;
  fields?: Array<{ label: string; name: string }>;
}

export default function BluetoothPrint({
  visible,
  onClose,
  formData,
  fields = [],
}: BluetoothPrintProps) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothPrinter | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [characteristics, setCharacteristics] = useState<string[]>([]);
  const [selectedCharacteristic, setSelectedCharacteristic] = useState<string>('');
  const [printing, setPrinting] = useState(false);

  const handleDeviceFound = useCallback((device: BluetoothDevice) => {
    setDevices((prev) => {
      if (!prev.find((d) => d.deviceId === device.deviceId)) {
        return [...prev, device];
      }
      return prev;
    });
  }, []);

  const startScan = async () => {
    try {
      setScanning(true);
      setDevices([]);
      await bluetoothPrintService.startDiscovery();
      const existingDevices = await bluetoothPrintService.getDevices();
      setDevices(existingDevices);
      bluetoothPrintService.onDeviceFound(handleDeviceFound);

      setTimeout(() => {
        stopScan();
      }, 10000);
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' });
      setScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      await bluetoothPrintService.stopDiscovery();
    } catch (error) {
      console.error('停止扫描失败', error);
    }
    setScanning(false);
  };

  const connectDevice = async (device: BluetoothDevice) => {
    try {
      Taro.showLoading({ title: '连接中...' });
      const printer = await bluetoothPrintService.connect(device.deviceId, device.name);
      setConnectedPrinter(printer);

      const svcs = await bluetoothPrintService.getServices(device.deviceId);
      setServices(svcs);
      if (svcs.length > 0) {
        setSelectedService(svcs[0]);
      }

      Taro.showToast({ title: '连接成功' });
    } catch (error) {
      Taro.showToast({ title: '连接失败', icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };

  const disconnectDevice = async () => {
    if (!connectedPrinter) return;
    try {
      await bluetoothPrintService.disconnect(connectedPrinter.deviceId);
      setConnectedPrinter(null);
      setServices([]);
      setSelectedService('');
      setCharacteristics([]);
      setSelectedCharacteristic('');
      Taro.showToast({ title: '已断开连接' });
    } catch (error) {
      Taro.showToast({ title: '断开失败', icon: 'none' });
    }
  };

  const loadCharacteristics = async (serviceId: string) => {
    if (!connectedPrinter) return;
    try {
      const chars = await bluetoothPrintService.getCharacteristics(
        connectedPrinter.deviceId,
        serviceId
      );
      setCharacteristics(chars);
      if (chars.length > 0) {
        setSelectedCharacteristic(chars[0]);
      }
    } catch (error) {
      Taro.showToast({ title: '加载特征值失败', icon: 'none' });
    }
  };

  useEffect(() => {
    if (selectedService && connectedPrinter) {
      loadCharacteristics(selectedService);
    }
  }, [selectedService, connectedPrinter]);

  const handlePrint = async () => {
    if (!connectedPrinter || !selectedService || !selectedCharacteristic || !formData) {
      Taro.showToast({ title: '请先连接打印机并选择服务', icon: 'none' });
      return;
    }

    try {
      setPrinting(true);
      Taro.showLoading({ title: '打印中...' });

      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.init()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.alignCenter()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.boldOn()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.doubleSize()
      );

      await bluetoothPrintService.printText(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        '表单数据打印'
      );

      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.normalSize()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.boldOff()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.alignLeft()
      );
      await bluetoothPrintService.write(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        escposCommands.feedLines(1)
      );

      await bluetoothPrintService.printFormData(
        connectedPrinter.deviceId,
        selectedService,
        selectedCharacteristic,
        formData,
        fields
      );

      Taro.hideLoading();
      Taro.showToast({ title: '打印完成' });
    } catch (error) {
      Taro.hideLoading();
      Taro.showToast({ title: '打印失败', icon: 'none' });
    } finally {
      setPrinting(false);
    }
  };

  useDidShow(() => {
    if (visible) {
      const connected = bluetoothPrintService.getConnectedDevice();
      if (connected) {
        setConnectedPrinter(connected);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (scanning) {
        stopScan();
      }
    };
  }, [scanning]);

  if (!visible) return null;

  return (
    <View className="bluetooth-print">
      <View className="mask" onClick={onClose} />
      <View className="content">
        <View className="header">
          <Text className="title">蓝牙打印</Text>
          <Text className="close" onClick={onClose}>关闭</Text>
        </View>

        {connectedPrinter ? (
          <View className="section">
            <View className="connected-info">
              <Text className="connected-label">已连接: </Text>
              <Text className="connected-name">{connectedPrinter.name}</Text>
              <Text className="disconnect" onClick={disconnectDevice}>断开</Text>
            </View>

            {services.length > 0 && (
              <View className="section">
                <Text className="label">选择服务</Text>
                <View className="service-list">
                  {services.map((svc) => (
                    <View
                      key={svc}
                      className={`service-item ${selectedService === svc ? 'selected' : ''}`}
                      onClick={() => setSelectedService(svc)}
                    >
                      <Text className="service-uuid">{svc.slice(0, 16)}...</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {characteristics.length > 0 && (
              <View className="section">
                <Text className="label">选择特征值</Text>
                <View className="char-list">
                  {characteristics.map((char) => (
                    <View
                      key={char}
                      className={`char-item ${selectedCharacteristic === char ? 'selected' : ''}`}
                      onClick={() => setSelectedCharacteristic(char)}
                    >
                      <Text className="char-uuid">{char.slice(0, 16)}...</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Button
              className="print-btn"
              onClick={handlePrint}
              disabled={printing || !selectedCharacteristic}
            >
              {printing ? '打印中...' : '打印表单数据'}
            </Button>
          </View>
        ) : (
          <View className="section">
            <Button
              className="scan-btn"
              onClick={scanning ? stopScan : startScan}
              type={scanning ? 'default' : 'primary'}
            >
              {scanning ? '停止扫描' : '搜索蓝牙设备'}
            </Button>

            {devices.length > 0 && (
              <View className="device-list">
                <Text className="label">附近的蓝牙设备</Text>
                {devices.map((device) => (
                  <View
                    key={device.deviceId}
                    className="device-item"
                    onClick={() => connectDevice(device)}
                  >
                    <Text className="device-name">{device.name}</Text>
                    <Text className="device-rssi">
                      {device.RSSI ? `${device.RSSI} dBm` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {devices.length === 0 && !scanning && (
              <View className="empty-tip">
                <Text>点击搜索按钮查找附近的蓝牙打印机</Text>
              </View>
            )}
          </View>
        )}

        <Button className="cancel-btn" onClick={onClose}>取消</Button>
      </View>
    </View>
  );
}
