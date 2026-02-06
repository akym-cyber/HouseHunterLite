import { Alert } from 'react-native';

export const MAX_VIDEO_DURATION_SECONDS = 30;
export const MAX_VIDEO_SIZE_MB = 20;

export const formatVideoDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
};

const normalizeSeconds = (duration: number): number => {
  if (duration > 1000) {
    return duration / 1000;
  }
  return duration;
};

export const validateVideoDuration = async (
  videoUri: string,
  maxSeconds: number = MAX_VIDEO_DURATION_SECONDS,
  knownDurationSeconds?: number
): Promise<boolean> => {
  try {
    const promptUploadAnyway = () =>
      new Promise<boolean>(resolve => {
        Alert.alert(
          'Video Check Failed',
          'Could not verify video length. Please ensure it is under 30 seconds.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Upload Anyway', onPress: () => resolve(true) },
          ]
        );
      });

    console.log('Validating video duration...');
    const duration = typeof knownDurationSeconds === 'number'
      ? normalizeSeconds(knownDurationSeconds)
      : null;

    if (duration === null) {
      return await promptUploadAnyway();
    }

    if (duration > maxSeconds) {
      Alert.alert(
        'Video Too Long',
        `Selected video is ${formatVideoDuration(duration)}.\n\n` +
          `Maximum allowed: ${maxSeconds} seconds for property previews.\n\n` +
          'Please select a shorter video or trim this one.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return false;
    }

    console.log('Video duration OK:', duration, 'seconds');
    return true;
  } catch (error) {
    console.error('Error checking video duration:', error);
    return await new Promise(resolve => {
      Alert.alert(
        'Video Check Failed',
        'Could not verify video length. Please ensure it is under 30 seconds.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Upload Anyway', onPress: () => resolve(true) },
        ]
      );
    });
  }
};

export const validateVideoSize = async (
  videoUri: string,
  maxMB: number = MAX_VIDEO_SIZE_MB,
  knownSizeBytes?: number
): Promise<boolean> => {
  try {
    let sizeMB: number | null = null;

    if (typeof knownSizeBytes === 'number' && knownSizeBytes > 0) {
      sizeMB = knownSizeBytes / (1024 * 1024);
    } else {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      sizeMB = blob.size / (1024 * 1024);
    }

    if (sizeMB !== null && sizeMB > maxMB) {
      Alert.alert(
        'File Too Large',
        `Video is ${sizeMB.toFixed(1)}MB (max ${maxMB}MB).\n` +
          'Please compress or select a smaller video.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Size check failed:', error);
    return true;
  }
};
