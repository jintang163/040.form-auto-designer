import Taro from '@tarojs/taro';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex !== -1 ? filename.slice(dotIndex + 1).toLowerCase() : '';
};

export const getFileName = (path: string): string => {
  const slashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return slashIndex !== -1 ? path.slice(slashIndex + 1) : path;
};

export const generateFileName = (prefix: string = 'file'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
};

export const getImageInfo = (tempFilePath: string): Promise<{ width: number; height: number; size: number }> => {
  return new Promise((resolve, reject) => {
    Taro.getImageInfo({
      src: tempFilePath,
      success: (res) => {
        resolve({
          width: res.width,
          height: res.height,
          size: 0
        });
      },
      fail: (error) => {
        console.error('[File] getImageInfo error:', error);
        reject(error);
      }
    });
  });
};

export const compressImage = async (
  filePath: string,
  quality: number = 80
): Promise<string> => {
  try {
    const compressedFilePath = await Taro.compressImage({
      src: filePath,
      quality
    });
    console.log('[File] compressImage success:', compressedFilePath);
    return compressedFilePath.tempFilePath || filePath;
  } catch (error) {
    console.error('[File] compressImage error:', error);
    return filePath;
  }
};

export const saveFile = async (tempFilePath: string): Promise<string> => {
  try {
    const res = await Taro.saveFile({
      tempFilePath
    });
    console.log('[File] saveFile success:', res.savedFilePath);
    return res.savedFilePath;
  } catch (error) {
    console.error('[File] saveFile error:', error);
    throw error;
  }
};

export const removeSavedFile = async (filePath: string): Promise<void> => {
  try {
    await Taro.removeSavedFile({
      filePath
    });
    console.log('[File] removeSavedFile success:', filePath);
  } catch (error) {
    console.error('[File] removeSavedFile error:', error);
  }
};

export const getSavedFileList = async (): Promise<Taro.getSavedFileList.FileItem[]> => {
  try {
    const res = await Taro.getSavedFileList();
    return res.fileList;
  } catch (error) {
    console.error('[File] getSavedFileList error:', error);
    return [];
  }
};

export const getFileSystemManager = (): Taro.FileSystemManager | null => {
  try {
    return Taro.getFileSystemManager();
  } catch (error) {
    console.error('[File] getFileSystemManager error:', error);
    return null;
  }
};
