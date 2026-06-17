import Taro from '@tarojs/taro';

const STORAGE_KEYS = {
  TEMPLATES: 'offline_templates',
  FORM_DATA: 'offline_form_data',
  SYNC_TASKS: 'offline_sync_tasks',
  USER_INFO: 'offline_user_info',
  SETTINGS: 'offline_settings'
} as const;

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const data = Taro.getStorageSync(key);
      if (data === '' || data === null || data === undefined) {
        return defaultValue;
      }
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.error('[Storage] get error:', key, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      Taro.setStorageSync(key, data);
    } catch (error) {
      console.error('[Storage] set error:', key, error);
      throw error;
    }
  },

  remove(key: string): void {
    try {
      Taro.removeStorageSync(key);
    } catch (error) {
      console.error('[Storage] remove error:', key, error);
    }
  },

  clear(): void {
    try {
      Taro.clearStorageSync();
    } catch (error) {
      console.error('[Storage] clear error:', error);
    }
  },

  getInfo(): Taro.getStorageInfoSync.Option {
    try {
      return Taro.getStorageInfoSync();
    } catch (error) {
      console.error('[Storage] getInfo error:', error);
      return { keys: [], currentSize: 0, limitSize: 0 };
    }
  }
};

export const templateStorage = {
  getAll() {
    return storage.get(STORAGE_KEYS.TEMPLATES, []);
  },

  save(templates: any[]) {
    storage.set(STORAGE_KEYS.TEMPLATES, templates);
  },

  add(template: any) {
    const templates = this.getAll();
    const existingIndex = templates.findIndex((t: any) => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...templates[existingIndex], ...template };
    } else {
      templates.push(template);
    }
    this.save(templates);
  },

  remove(id: string) {
    const templates = this.getAll().filter((t: any) => t.id !== id);
    this.save(templates);
  },

  getById(id: string) {
    return this.getAll().find((t: any) => t.id === id);
  },

  clear() {
    storage.remove(STORAGE_KEYS.TEMPLATES);
  }
};

export const formDataStorage = {
  getAll() {
    return storage.get(STORAGE_KEYS.FORM_DATA, []);
  },

  save(formDataList: any[]) {
    storage.set(STORAGE_KEYS.FORM_DATA, formDataList);
  },

  add(formData: any) {
    const formDataList = this.getAll();
    const existingIndex = formDataList.findIndex((f: any) => f.id === formData.id);
    if (existingIndex >= 0) {
      formDataList[existingIndex] = { ...formDataList[existingIndex], ...formData };
    } else {
      formDataList.push(formData);
    }
    this.save(formDataList);
  },

  update(id: string, updates: any) {
    const formDataList = this.getAll();
    const index = formDataList.findIndex((f: any) => f.id === id);
    if (index >= 0) {
      formDataList[index] = { ...formDataList[index], ...updates, updatedAt: new Date().toISOString() };
      this.save(formDataList);
      return formDataList[index];
    }
    return null;
  },

  remove(id: string) {
    const formDataList = this.getAll().filter((f: any) => f.id !== id);
    this.save(formDataList);
  },

  getById(id: string) {
    return this.getAll().find((f: any) => f.id === id);
  },

  getByStatus(status: string) {
    return this.getAll().filter((f: any) => f.status === status);
  },

  getBySyncStatus(syncStatus: string) {
    return this.getAll().filter((f: any) => f.syncStatus === syncStatus);
  },

  clear() {
    storage.remove(STORAGE_KEYS.FORM_DATA);
  }
};

export const syncTaskStorage = {
  getAll() {
    return storage.get(STORAGE_KEYS.SYNC_TASKS, []);
  },

  save(syncTasks: any[]) {
    storage.set(STORAGE_KEYS.SYNC_TASKS, syncTasks);
  },

  add(syncTask: any) {
    const syncTasks = this.getAll();
    const existingIndex = syncTasks.findIndex((t: any) => t.id === syncTask.id);
    if (existingIndex >= 0) {
      syncTasks[existingIndex] = { ...syncTasks[existingIndex], ...syncTask };
    } else {
      syncTasks.push(syncTask);
    }
    this.save(syncTasks);
  },

  update(id: string, updates: any) {
    const syncTasks = this.getAll();
    const index = syncTasks.findIndex((t: any) => t.id === id);
    if (index >= 0) {
      syncTasks[index] = { ...syncTasks[index], ...updates };
      this.save(syncTasks);
      return syncTasks[index];
    }
    return null;
  },

  remove(id: string) {
    const syncTasks = this.getAll().filter((t: any) => t.id !== id);
    this.save(syncTasks);
  },

  getById(id: string) {
    return this.getAll().find((t: any) => t.id === id);
  },

  getByStatus(status: string) {
    return this.getAll().filter((t: any) => t.status === status);
  },

  clear() {
    storage.remove(STORAGE_KEYS.SYNC_TASKS);
  }
};

export const userStorage = {
  get() {
    return storage.get(STORAGE_KEYS.USER_INFO, null);
  },

  save(userInfo: any) {
    storage.set(STORAGE_KEYS.USER_INFO, userInfo);
  },

  clear() {
    storage.remove(STORAGE_KEYS.USER_INFO);
  }
};

export { STORAGE_KEYS };
