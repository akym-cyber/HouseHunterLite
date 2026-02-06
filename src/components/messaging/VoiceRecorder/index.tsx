import { Platform } from 'react-native';
import {
  startNativeRecording,
  stopNativeRecording,
  cancelNativeRecording,
  prepareNativeRecording,
  NativeRecordingHandle,
} from './native';
import { startWebRecording, stopWebRecording, cancelWebRecording, WebRecordingHandle } from './web';

export type VoiceRecordingHandle = NativeRecordingHandle | WebRecordingHandle;

export type VoiceRecordingResult = {
  uri: string;
  format: 'm4a' | 'webm';
  mimeType: string;
  blob?: Blob;
};

export const startRecording = async (): Promise<VoiceRecordingHandle> => {
  if (Platform.OS === 'web') {
    return startWebRecording();
  }
  return startNativeRecording();
};

export const prepareRecording = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await prepareNativeRecording();
};

export const stopRecording = async (handle: VoiceRecordingHandle): Promise<VoiceRecordingResult> => {
  if (handle.platform === 'web') {
    return stopWebRecording(handle);
  }
  return stopNativeRecording(handle);
};

export const cancelRecording = async (handle: VoiceRecordingHandle): Promise<void> => {
  if (handle.platform === 'web') {
    await cancelWebRecording(handle);
    return;
  }
  await cancelNativeRecording(handle);
};
