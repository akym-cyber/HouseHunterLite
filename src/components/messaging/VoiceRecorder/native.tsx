import { Audio } from 'expo-av';
import { InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ensureRecordingAudioMode } from '../audioMode';
const MIN_VOICE_BYTES = 8 * 1024;
const STOP_UNLOAD_DELAY_MS = 350;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const runAfterInteractions = () =>
  new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));
let activeRecording: Audio.Recording | null = null;
let preparedRecording: Audio.Recording | null = null;
let preparedPaused = false;
let preparePromise: Promise<void> | null = null;
let permissionGranted: boolean | null = null;

const resetActiveRecording = async () => {
  if (!activeRecording) return;
  try {
    const status = await activeRecording.getStatusAsync().catch(() => null);
    if (status && (status.isRecording || status.canRecord || status.isDoneRecording)) {
      await activeRecording.stopAndUnloadAsync();
    } else {
      await activeRecording.stopAndUnloadAsync().catch(() => {});
    }
  } catch {
    // ignore cleanup errors
  } finally {
    activeRecording = null;
  }
};

const ensurePermission = async () => {
  if (permissionGranted === true) {
    return;
  }
  const permission = await Audio.requestPermissionsAsync();
  permissionGranted = permission.status === 'granted';
  if (!permissionGranted) {
    throw new Error('Microphone permission not granted');
  }
};

const buildRecording = () => new Audio.Recording();

const getRecordingOptions = () => ({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
});

export const prepareNativeRecording = async () => {
  if (preparePromise || preparedRecording || activeRecording) {
    return;
  }
  preparePromise = (async () => {
    await ensurePermission();
    await ensureRecordingAudioMode();
    const recording = buildRecording();
    await recording.prepareToRecordAsync(getRecordingOptions());
    // Warm the audio session to avoid keyboard flicker on first start.
    try {
      await recording.startAsync();
      await recording.pauseAsync();
      preparedPaused = true;
    } catch {
      preparedPaused = false;
    }
    preparedRecording = recording;
  })();
  try {
    await preparePromise;
  } finally {
    preparePromise = null;
  }
};

export type NativeRecordingHandle = {
  platform: 'native';
  recording: Audio.Recording;
};

export const startNativeRecording = async (): Promise<NativeRecordingHandle> => {
  if (preparePromise) {
    try {
      await preparePromise;
    } catch {
      // ignore prior prepare failures
    }
  }
  await resetActiveRecording();
  await ensurePermission();

  let recording = preparedRecording;
  const usingPrepared = !!recording;
  if (!recording) {
    await ensureRecordingAudioMode();
    recording = buildRecording();
    activeRecording = recording;
    preparePromise = recording.prepareToRecordAsync(getRecordingOptions());
    try {
      await preparePromise;
    } finally {
      preparePromise = null;
    }
  } else {
    activeRecording = recording;
  }
  preparedRecording = null;

  if (usingPrepared && preparedPaused) {
    preparedPaused = false;
  }
  await recording.startAsync();

  return {
    platform: 'native',
    recording,
  };
};

export const stopNativeRecording = async (handle: NativeRecordingHandle) => {
  const status = await handle.recording.getStatusAsync().catch(() => null);
  if (status && (status.isRecording || status.canRecord || status.isDoneRecording)) {
    await runAfterInteractions();
    await delay(STOP_UNLOAD_DELAY_MS);
    await handle.recording.stopAndUnloadAsync();
  }
  if (activeRecording === handle.recording) {
    activeRecording = null;
  }
  if (preparedRecording === handle.recording) {
    preparedRecording = null;
  }
  const uri = handle.recording.getURI();
  if (!uri) {
    throw new Error('Recording failed. Please try again.');
  }
  const info = await FileSystem.getInfoAsync(uri, { size: true }).catch(() => null);
  if (!info?.size || info.size < MIN_VOICE_BYTES) {
    throw new Error('Audio file too small, may be corrupted.');
  }

  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    if (!status.isLoaded) {
      await sound.unloadAsync().catch(() => {});
      throw new Error('Audio file cannot be loaded.');
    }
    await sound.unloadAsync().catch(() => {});
  } catch (error) {
    throw new Error('Audio file cannot be loaded.');
  }
  return {
    uri: uri ?? '',
    format: 'm4a' as const,
    mimeType: 'audio/m4a',
  };
};

export const cancelNativeRecording = async (handle: NativeRecordingHandle) => {
  const status = await handle.recording.getStatusAsync().catch(() => null);
  if (status && (status.isRecording || status.canRecord || status.isDoneRecording)) {
    runAfterInteractions().then(() => {
      setTimeout(() => {
        handle.recording.stopAndUnloadAsync().catch(() => {});
      }, STOP_UNLOAD_DELAY_MS);
    });
  }
  if (activeRecording === handle.recording) {
    activeRecording = null;
  }
  if (preparedRecording === handle.recording) {
    preparedRecording = null;
  }
};
