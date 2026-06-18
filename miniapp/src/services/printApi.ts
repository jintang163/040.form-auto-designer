import Taro from '@tarojs/taro';
import type { PrintTemplate, PdfExportRequest, BatchPdfExportRequest, PrintRecord } from '../types/print';

const BASE_URL = 'http://localhost:8080/api';

export const printTemplateApi = {
  listByTemplateId: (templateId: number): Promise<PrintTemplate[]> =>
    new Promise((resolve, reject) => {
      Taro.request({
        url: `${BASE_URL}/print-templates/template/${templateId}`,
        method: 'GET',
        success: (res) => resolve(res.data.data),
        fail: reject,
      });
    }),

  getDefault: (templateId: number): Promise<PrintTemplate> =>
    new Promise((resolve, reject) => {
      Taro.request({
        url: `${BASE_URL}/print-templates/default/${templateId}`,
        method: 'GET',
        success: (res) => resolve(res.data.data),
        fail: reject,
      });
    }),
};

export const printApi = {
  exportPdf: (data: PdfExportRequest): Promise<string> =>
    new Promise((resolve, reject) => {
      Taro.downloadFile({
        url: `${BASE_URL}/print/export-pdf`,
        method: 'POST',
        data,
        header: {
          'Content-Type': 'application/json',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error('下载PDF失败'));
          }
        },
        fail: reject,
      });
    }),

  generatePreview: (formDataId: number, printTemplateId?: number): Promise<{ previewUrl: string }> =>
    new Promise((resolve, reject) => {
      Taro.request({
        url: `${BASE_URL}/print/generate-preview`,
        method: 'POST',
        data: { formDataId, printTemplateId },
        success: (res) => resolve(res.data.data),
        fail: reject,
      });
    }),

  savePdf: (
    formDataId: number,
    printTemplateId?: number,
    fileName?: string
  ): Promise<PrintRecord> =>
    new Promise((resolve, reject) => {
      Taro.request({
        url: `${BASE_URL}/print/${formDataId}/save-pdf`,
        method: 'POST',
        data: { printTemplateId, fileName },
        success: (res) => resolve(res.data.data),
        fail: reject,
      });
    }),

  getRecordsByFormDataId: (formDataId: number): Promise<PrintRecord[]> =>
    new Promise((resolve, reject) => {
      Taro.request({
        url: `${BASE_URL}/print/records/form-data/${formDataId}`,
        method: 'GET',
        success: (res) => resolve(res.data.data),
        fail: reject,
      });
    }),
};

export const sharePdf = (filePath: string, title?: string): Promise<void> =>
  new Promise((resolve, reject) => {
    Taro.shareFileMessage({
      filePath,
      title: title || '表单数据PDF',
      success: () => resolve(),
      fail: reject,
    });
  });

export const openPdf = (filePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    Taro.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => resolve(),
      fail: reject,
    });
  });

export interface BluetoothDevice {
  name: string;
  deviceId: string;
  RSSI?: number;
  advertisData?: ArrayBuffer;
}

export interface BluetoothPrinter {
  deviceId: string;
  name: string;
  connected: boolean;
}

class BluetoothPrintService {
  private adapterInitialized = false;
  private connectedDevice: BluetoothPrinter | null = null;

  async initAdapter(): Promise<void> {
    if (this.adapterInitialized) return;
    return new Promise((resolve, reject) => {
      Taro.openBluetoothAdapter({
        success: () => {
          this.adapterInitialized = true;
          resolve();
        },
        fail: (err) => {
          if (err.errCode === 10001) {
            reject(new Error('请先开启蓝牙'));
          } else {
            reject(err);
          }
        },
      });
    });
  }

  async closeAdapter(): Promise<void> {
    return new Promise((resolve, reject) => {
      Taro.closeBluetoothAdapter({
        success: () => {
          this.adapterInitialized = false;
          this.connectedDevice = null;
          resolve();
        },
        fail: reject,
      });
    });
  }

  async startDiscovery(): Promise<void> {
    await this.initAdapter();
    return new Promise((resolve, reject) => {
      Taro.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => resolve(),
        fail: reject,
      });
    });
  }

  async stopDiscovery(): Promise<void> {
    return new Promise((resolve, reject) => {
      Taro.stopBluetoothDevicesDiscovery({
        success: () => resolve(),
        fail: reject,
      });
    });
  }

  async getDevices(): Promise<BluetoothDevice[]> {
    return new Promise((resolve, reject) => {
      Taro.getBluetoothDevices({
        success: (res) => {
          const devices = res.devices.filter((d) => d.name && d.name.length > 0);
          resolve(
            devices.map((d) => ({
              name: d.name || d.localName || '未知设备',
              deviceId: d.deviceId,
              RSSI: d.RSSI,
              advertisData: d.advertisData,
            }))
          );
        },
        fail: reject,
      });
    });
  }

  onDeviceFound(callback: (device: BluetoothDevice) => void): () => void {
    const listener = (res: any) => {
      const devices = res.devices || [];
      devices.forEach((device: any) => {
        if (device.name || device.localName) {
          callback({
            name: device.name || device.localName,
            deviceId: device.deviceId,
            RSSI: device.RSSI,
            advertisData: device.advertisData,
          });
        }
      });
    };
    Taro.onBluetoothDeviceFound(listener);
    return () => Taro.offBluetoothDeviceFound(listener);
  }

  async connect(deviceId: string, name: string): Promise<BluetoothPrinter> {
    return new Promise((resolve, reject) => {
      Taro.createBLEConnection({
        deviceId,
        success: () => {
          this.connectedDevice = { deviceId, name, connected: true };
          resolve(this.connectedDevice);
        },
        fail: reject,
      });
    });
  }

  async disconnect(deviceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Taro.closeBLEConnection({
        deviceId,
        success: () => {
          if (this.connectedDevice?.deviceId === deviceId) {
            this.connectedDevice = null;
          }
          resolve();
        },
        fail: reject,
      });
    });
  }

  async getServices(deviceId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      Taro.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          resolve(res.services.map((s) => s.uuid));
        },
        fail: reject,
      });
    });
  }

  async getCharacteristics(deviceId: string, serviceId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      Taro.getBLEDeviceCharacteristics({
        deviceId,
        serviceId,
        success: (res) => {
          resolve(res.characteristics.filter((c) => c.properties.write).map((c) => c.uuid));
        },
        fail: reject,
      });
    });
  }

  async write(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    data: ArrayBuffer
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      Taro.writeBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId,
        value: data,
        success: () => resolve(),
        fail: reject,
      });
    });
  }

  async printText(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    text: string
  ): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + '\n').buffer;
    await this.write(deviceId, serviceId, characteristicId, data);
  }

  async printFormData(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    formData: Record<string, any>,
    fields: Array<{ label: string; name: string }>
  ): Promise<void> {
    const lines: string[] = [];
    lines.push('==============================');
    lines.push('         表单打印');
    lines.push('==============================');
    lines.push('');

    fields.forEach((field) => {
      const value = formData[field.name] || '-';
      lines.push(`${field.label}: ${value}`);
    });

    lines.push('');
    lines.push('==============================');
    lines.push(`打印时间: ${new Date().toLocaleString()}`);
    lines.push('==============================');
    lines.push('');
    lines.push('');
    lines.push('');

    const text = lines.join('\n');
    await this.printText(deviceId, serviceId, characteristicId, text);
  }

  getConnectedDevice(): BluetoothPrinter | null {
    return this.connectedDevice;
  }
}

export const bluetoothPrintService = new BluetoothPrintService();

export const escposCommands = {
  init: () => new Uint8Array([0x1b, 0x40]).buffer,
  alignLeft: () => new Uint8Array([0x1b, 0x61, 0x00]).buffer,
  alignCenter: () => new Uint8Array([0x1b, 0x61, 0x01]).buffer,
  alignRight: () => new Uint8Array([0x1b, 0x61, 0x02]).buffer,
  boldOn: () => new Uint8Array([0x1b, 0x45, 0x01]).buffer,
  boldOff: () => new Uint8Array([0x1b, 0x45, 0x00]).buffer,
  doubleSize: () => new Uint8Array([0x1d, 0x21, 0x11]).buffer,
  normalSize: () => new Uint8Array([0x1d, 0x21, 0x00]).buffer,
  feedLines: (n: number) => new Uint8Array([0x1b, 0x64, n]).buffer,
  cutPaper: () => new Uint8Array([0x1d, 0x56, 0x41, 0x00]).buffer,
  printAndFeed: () => new Uint8Array([0x0a]).buffer,
};
