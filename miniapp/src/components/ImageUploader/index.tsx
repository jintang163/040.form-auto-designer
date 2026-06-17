import React, { useState } from 'react';
import { View, Image, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { generateFileName, saveFile, compressImage, getImageInfo } from '@/utils/file';
import { useFormStore } from '@/store/useFormStore';
import type { FormImage } from '@/types';

interface ImageUploaderProps {
  fieldId: string;
  onChange?: (value: string | string[] | number) => void;
  disabled?: boolean;
  maxCount?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  fieldId,
  onChange,
  disabled = false,
  maxCount = 9
}) => {
  const { currentForm, addImage, removeImage } = useFormStore();
  const [uploading, setUploading] = useState(false);

  const fieldImages = currentForm?.images?.filter((img) => img.fieldId === fieldId) || [];

  const handleChooseImage = async () => {
    if (disabled || uploading) return;
    if (fieldImages.length >= maxCount) {
      Taro.showToast({
        title: `最多上传${maxCount}张图片`,
        icon: 'none'
      });
      return;
    }

    try {
      setUploading(true);
      const remaining = maxCount - fieldImages.length;

      const res = await Taro.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      console.log('[ImageUploader] Images chosen:', res.tempFiles.length);

      for (const file of res.tempFiles) {
        try {
          const compressedPath = await compressImage(file.tempFilePath, 80);
          const savedPath = await saveFile(compressedPath);
          const imageInfo = await getImageInfo(savedPath);

          const image: FormImage = {
            id: generateFileName('img'),
            localPath: savedPath,
            name: generateFileName('photo') + '.jpg',
            size: file.size || imageInfo.size,
            uploaded: false,
            createdAt: new Date().toISOString(),
            fieldId
          };

          addImage(fieldId, image);
          console.log('[ImageUploader] Image saved:', image.id);
        } catch (error) {
          console.error('[ImageUploader] Process image error:', error);
        }
      }

      if (onChange) {
        onChange(fieldImages.length + res.tempFiles.length);
      }

      Taro.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('[ImageUploader] Choose image error:', error);
      if ((error as any).errMsg?.includes('cancel')) {
        return;
      }
      Taro.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewImage = (index: number) => {
    const urls = fieldImages.map((img) => img.localPath);
    Taro.previewImage({
      current: index,
      urls
    });
  };

  const handleDeleteImage = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    Taro.showModal({
      title: '提示',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          removeImage(imageId);
          if (onChange) {
            onChange(fieldImages.length - 1);
          }
        }
      }
    });
  };

  return (
    <View className={styles.imageUploader}>
      <View className={styles.imageList}>
        {fieldImages.map((image, index) => (
          <View key={image.id} className={styles.imageItem}>
            <Image
              className={styles.image}
              src={image.localPath}
              mode="aspectFill"
              onClick={() => handlePreviewImage(index)}
            />
            {!disabled && (
              <View
                className={styles.deleteBtn}
                onClick={(e) => handleDeleteImage(e, image.id)}
              >
                <Text className={styles.deleteIcon}>×</Text>
              </View>
            )}
            {!image.uploaded && (
              <View className={styles.syncBadge}>
                <Text className={styles.syncText}>待同步</Text>
              </View>
            )}
          </View>
        ))}

        {fieldImages.length < maxCount && !disabled && (
          <View
            className={classnames(styles.uploadBtn, uploading && styles.uploading)}
            onClick={handleChooseImage}
          >
            <Text className={styles.uploadIcon}>+</Text>
            <Text className={styles.uploadText}>
              {uploading ? '上传中...' : '拍照/相册'}
            </Text>
          </View>
        )}
      </View>

      <View className={styles.tips}>
        <Text className={styles.tipsText}>
          已上传 {fieldImages.length}/{maxCount} 张
        </Text>
      </View>
    </View>
  );
};

export default ImageUploader;
