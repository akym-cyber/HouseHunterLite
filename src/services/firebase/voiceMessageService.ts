import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export const uploadVoiceMessage = async (params: {
  uri: string;
  conversationId: string;
  userId: string;
  format?: 'm4a' | 'webm';
  mimeType?: string;
  blob?: Blob;
}) => {
  try {
    const { uri, conversationId, userId, format, mimeType } = params;
    const normalizedMime = (mimeType || (format === 'webm' ? 'audio/webm' : 'audio/m4a')).split(';')[0];
    const fileExt = format || (normalizedMime.includes('webm') ? 'webm' : 'm4a');
    const fileName = `voice_${Date.now()}.${fileExt}`;

    let fileSize = 0;
    if (Platform.OS === 'web') {
      if (params.blob) {
        fileSize = params.blob.size;
      }
    } else {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true }).catch(() => ({ size: 0 }));
      fileSize = fileInfo.size || 0;
    }

    const extra = Constants.expoConfig?.extra || {};
    const cloudName = extra.cloudinaryCloudName || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = extra.cloudinaryUploadPreset || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return {
        success: false,
        error: 'Cloudinary not configured. Missing cloud name or upload preset.',
      };
    }

    const formData = new FormData();
    if (Platform.OS === 'web') {
      let uploadBlob = params.blob;
      if (!uploadBlob && uri.startsWith('blob:')) {
        const response = await fetch(uri);
        uploadBlob = await response.blob();
        fileSize = uploadBlob.size;
      }
      if (!uploadBlob) {
        return {
          success: false,
          error: 'Voice blob missing for web upload.',
        };
      }
      formData.append('file', uploadBlob, fileName);
    } else {
      formData.append('file', {
        uri,
        name: fileName,
        type: normalizedMime,
      } as any);
    }
    formData.append('upload_preset', uploadPreset);
    formData.append('resource_type', 'video');
    formData.append('folder', `voiceMessages/${conversationId}`);
    formData.append('public_id', `${userId}_${Date.now()}`);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: errText || 'Cloudinary upload failed',
      };
    }

    const json = await response.json();
    const url = json.secure_url as string;

    return {
      success: true,
      url,
      size: fileSize || 0,
    };
  } catch (error: any) {
    console.error('[voiceMessageService] Upload failed:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      serverResponse: error?.serverResponse,
    });
    return {
      success: false,
      error: error?.message || 'Failed to upload voice message',
    };
  }
};
