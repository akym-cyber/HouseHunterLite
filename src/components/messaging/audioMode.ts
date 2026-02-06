import { Audio } from 'expo-av';
import { Platform } from 'react-native';

type AudioMode = 'recording' | 'playback' | null;

const IOS_INTERRUPTION_DO_NOT_MIX =
  (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX ?? 1;
const IOS_INTERRUPTION_DUCK_OTHERS =
  (Audio as any).INTERRUPTION_MODE_IOS_DUCK_OTHERS ?? 2;
const ANDROID_INTERRUPTION_DO_NOT_MIX =
  (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX ?? 1;
const ANDROID_INTERRUPTION_DUCK_OTHERS =
  (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS ?? 2;

let currentMode: AudioMode = null;
let lockRecordingMode = false;
let settingPromise: Promise<void> | null = null;

const applyMode = async (mode: Exclude<AudioMode, null>) => {
  if (Platform.OS === 'web') return;
  if (settingPromise) {
    await settingPromise.catch(() => {});
  }

  const config =
    mode === 'recording'
      ? {
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: IOS_INTERRUPTION_DUCK_OTHERS,
          interruptionModeAndroid: ANDROID_INTERRUPTION_DUCK_OTHERS,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        }
      : {
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: IOS_INTERRUPTION_DO_NOT_MIX,
          interruptionModeAndroid: ANDROID_INTERRUPTION_DO_NOT_MIX,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        };

  settingPromise = Audio.setAudioModeAsync(config)
    .catch((error) => {
      console.warn('[AudioMode] Failed to set audio mode:', error);
    })
    .finally(() => {
      settingPromise = null;
    });

  await settingPromise;
  currentMode = mode;
};

export const ensureRecordingAudioMode = async () => {
  if (currentMode === 'recording') return;
  await applyMode('recording');
};

export const ensurePlaybackAudioMode = async () => {
  if (lockRecordingMode) return;
  if (currentMode === 'playback') return;
  await applyMode('playback');
};

export const lockRecordingAudioMode = async () => {
  lockRecordingMode = true;
  await ensureRecordingAudioMode();
};

export const unlockRecordingAudioMode = () => {
  lockRecordingMode = false;
};
