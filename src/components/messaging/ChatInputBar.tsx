import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Alert,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Reanimated, {
  Easing as ReanimatedEasing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { Message, MessageMedia } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LIVE_WAVE_BAR_COUNT = 16;
const VOICE_WAVE_POINT_COUNT = 50;
const MAX_SLIDE_DISTANCE = 120;
const SLIDE_CANCEL_THRESHOLD = -64;
const DELETE_ABSORB_DURATION_MS = 200;
const METER_MIN_DB = -55;
const METER_MAX_DB = -5;
const WAVE_RESPONSE_ALPHA = 0.62;
const percent = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * ratio))
  );
  return sorted[index];
};
const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// Emoji data - simplified set for demo
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
  '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖',
  '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
  '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷',
  '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸',
];

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onSendMedia?: (media: MessageMedia[], messageType: Message['message_type']) => void;
  onSendVoice?: (voiceData: { uri: string; duration: number; waveform: number[] }) => void;
  conversationId?: string;
  placeholder?: string;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  inputAccessoryViewID?: string;
  inputRef?: React.RefObject<TextInput>;
}

function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onSendMedia,
  onSendVoice,
  conversationId,
  placeholder = 'Message',
  isFocused = false,
  onFocus,
  onBlur,
  inputAccessoryViewID,
  inputRef,
}: ChatInputBarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSlideToCancelArmed, setIsSlideToCancelArmed] = useState(false);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(
    () => Array.from({ length: LIVE_WAVE_BAR_COUNT }, () => 0.12)
  );

  // Refs
  const recordingRef = useRef<any>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const isStartingRecordingRef = useRef(false);
  const pendingStopDiscardRef = useRef<boolean | null>(null);
  const recordPanResponderRef = useRef<any>(null);
  const slideStartXRef = useRef(0);
  const isSlideToCancelArmedRef = useRef(false);
  const micPermissionGrantedRef = useRef(false);
  const recordedLevelsRef = useRef<number[]>([]);
  const keepKeyboardDuringRecordingRef = useRef(false);
  const textInputRef = inputRef ?? useRef<TextInput | null>(null);

  // Animation values
  const recordButtonScale = useRef(new Animated.Value(1)).current;
  const slideOffsetX = useSharedValue(0);
  const deleteMorphProgress = useSharedValue(0);
  const deleteAbsorbProgress = useSharedValue(0);

  const hasText = value.trim().length > 0;
  const recordingDurationLabel = useMemo(() => {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = (recordingDuration % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [recordingDuration]);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const resetSlideToCancel = useCallback(() => {
    slideStartXRef.current = 0;
    isSlideToCancelArmedRef.current = false;
    slideOffsetX.value = 0;
    deleteMorphProgress.value = 0;
    deleteAbsorbProgress.value = 0;
    setIsSlideToCancelArmed(false);
  }, [deleteAbsorbProgress, deleteMorphProgress, slideOffsetX]);

  const updateSlideToCancel = useCallback((currentPageX: number) => {
    if (slideStartXRef.current === 0) {
      slideStartXRef.current = currentPageX;
    }

    const delta = currentPageX - slideStartXRef.current;
    const clamped = Math.max(-MAX_SLIDE_DISTANCE, Math.min(0, delta));
    slideOffsetX.value = clamped;
    deleteMorphProgress.value = clampNumber(
      Math.abs(clamped) / Math.abs(SLIDE_CANCEL_THRESHOLD),
      0,
      1
    );

    const shouldArm = clamped <= SLIDE_CANCEL_THRESHOLD;
    if (shouldArm !== isSlideToCancelArmedRef.current) {
      if (shouldArm) {
        void Haptics.selectionAsync();
      }
      isSlideToCancelArmedRef.current = shouldArm;
      setIsSlideToCancelArmed(shouldArm);
    }
  }, [deleteMorphProgress, slideOffsetX]);

  const recordingHintAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      slideOffsetX.value,
      [-MAX_SLIDE_DISTANCE, SLIDE_CANCEL_THRESHOLD, -24, 0],
      [0, 0, 0.58, 1],
      Extrapolation.CLAMP
    );

    const translateX = interpolate(
      slideOffsetX.value,
      [-MAX_SLIDE_DISTANCE, 0],
      [-42, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      slideOffsetX.value,
      [-MAX_SLIDE_DISTANCE, SLIDE_CANCEL_THRESHOLD, -24, 0],
      [0.88, 0.9, 0.96, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateX }, { scale }],
    };
  });

  const recordingWaveAnimatedStyle = useAnimatedStyle(() => {
    const slideOpacity = interpolate(
      slideOffsetX.value,
      [-MAX_SLIDE_DISTANCE, SLIDE_CANCEL_THRESHOLD, -18, 0],
      [0.52, 0.62, 0.86, 1],
      Extrapolation.CLAMP
    );

    const absorb = deleteAbsorbProgress.value;

    return {
      opacity: slideOpacity * (1 - absorb),
      transform: [
        { scale: 1 - absorb * 0.2 },
        { translateX: -12 * absorb },
      ],
    };
  });

  const recordingCameraIconAnimatedStyle = useAnimatedStyle(() => {
    const slideProgress = interpolate(
      slideOffsetX.value,
      [0, -6],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: 1 - slideProgress,
      transform: [{ scale: 1 - slideProgress * 0.08 }],
    };
  });

  const recordingTrashIconAnimatedStyle = useAnimatedStyle(() => {
    const slideProgress = interpolate(
      slideOffsetX.value,
      [0, -6],
      [0, 1],
      Extrapolation.CLAMP
    );
    const morphScale = interpolate(
      deleteMorphProgress.value,
      [0, 1],
      [1, 1.15],
      Extrapolation.CLAMP
    );
    return {
      opacity: slideProgress,
      transform: [{ scale: morphScale }],
    };
  });

  const normalizeMetering = useCallback((metering?: number): number => {
    if (typeof metering !== 'number') {
      return 0.12;
    }
    const clampedDb = Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, metering));
    const raw = (clampedDb - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
    const boosted = Math.pow(raw, 0.7);
    return Math.max(0.08, Math.min(1, boosted));
  }, []);

  const buildVoiceWaveform = useCallback((samples: number[]): number[] => {
    if (samples.length === 0) {
      return Array.from({ length: VOICE_WAVE_POINT_COUNT }, (_, index) =>
        18 + Math.round((Math.sin(index * 0.45) + 1) * 7)
      );
    }

    const clamped = samples.map((value) => clampNumber(value, 2, 100));
    const target = VOICE_WAVE_POINT_COUNT;

    let baseSeries: number[] = [];
    if (clamped.length < target) {
      baseSeries = Array.from({ length: target }, (_, index) => {
        const position = (index / (target - 1)) * (clamped.length - 1);
        const left = Math.floor(position);
        const right = Math.min(clamped.length - 1, Math.ceil(position));
        const factor = position - left;
        return clamped[left] * (1 - factor) + clamped[right] * factor;
      });
    } else {
      const bucketSize = clamped.length / target;
      baseSeries = Array.from({ length: target }, (_, index) => {
        const start = Math.floor(index * bucketSize);
        const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
        const bucket = clamped.slice(start, end);
        if (bucket.length === 0) {
          return clamped[Math.min(clamped.length - 1, start)] ?? 0;
        }
        const peak = bucket.reduce((max, value) => Math.max(max, value), 0);
        const avg = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
        return peak * 0.72 + avg * 0.28;
      });
    }

    const envelope: number[] = [];
    let previous = baseSeries[0] ?? 0;
    for (const value of baseSeries) {
      const factor = value > previous ? 0.42 : 0.2;
      previous = previous + (value - previous) * factor;
      envelope.push(previous);
    }

    const smoothed = envelope.map((value, index) => {
      const prev = envelope[index - 1] ?? value;
      const next = envelope[index + 1] ?? value;
      return prev * 0.2 + value * 0.6 + next * 0.2;
    });

    const low = percent(smoothed, 0.1);
    const high = percent(smoothed, 0.95);
    const range = Math.max(10, high - low);

    return smoothed.map((value) => {
      const normalized = clampNumber((value - low) / range, 0, 1);
      const shaped = Math.pow(normalized, 0.82);
      const height = 13 + shaped * 78;
      return Math.round(clampNumber(height, 10, 94));
    });
  }, []);

  const resetRecordingState = useCallback(() => {
    isStartingRecordingRef.current = false;
    recordingRef.current = null;
    pendingStopDiscardRef.current = null;
    recordedLevelsRef.current = [];
    keepKeyboardDuringRecordingRef.current = false;
    setIsRecording(false);
    setRecordingDuration(0);
    setLiveWaveform(Array.from({ length: LIVE_WAVE_BAR_COUNT }, () => 0.12));
    resetSlideToCancel();
    clearRecordingTimer();
  }, [clearRecordingTimer, resetSlideToCancel]);

  useEffect(() => {
    if (!isRecording) {
      slideOffsetX.value = 0;
      deleteMorphProgress.value = 0;
      deleteAbsorbProgress.value = 0;
      return;
    }
    deleteAbsorbProgress.value = 0;
  }, [deleteAbsorbProgress, deleteMorphProgress, isRecording, slideOffsetX]);

  useEffect(() => {
    if (!isRecording || !keepKeyboardDuringRecordingRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      textInputRef.current?.focus();
      setIsKeyboardVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [isRecording, textInputRef]);

  // Initialize audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const currentPermission = await Audio.getPermissionsAsync();
        let granted = currentPermission.status === 'granted';
        if (!granted) {
          const requestedPermission = await Audio.requestPermissionsAsync();
          granted = requestedPermission.status === 'granted';
        }
        micPermissionGrantedRef.current = granted;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Audio setup error:', error);
      }
    };

    setupAudio();
  }, []);

  // Cleanup recording timer
  useEffect(() => {
    return () => {
      clearRecordingTimer();
    };
  }, [clearRecordingTimer]);

  // Keyboard visibility tracking
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Camera handler
  const handleCameraPress = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in settings to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        const maxSize = 10 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > maxSize) {
          Alert.alert('Photo Too Large', 'Please take a photo smaller than 10MB.');
          return;
        }

        Alert.alert(
          'Send Photo',
          'Do you want to send this photo?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send',
              onPress: () => {
                const media: MessageMedia = {
                  id: Date.now().toString(),
                  type: 'image',
                  url: asset.uri,
                  filename: `photo_${Date.now()}.jpg`,
                  file_size: asset.fileSize || 0,
                  mime_type: 'image/jpeg',
                  width: asset.width,
                  height: asset.height,
                };
                onSendMedia?.([media], 'image');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsLoading(false);
    }
  }, [onSendMedia]);

  // Attachment handler
  const handleAttachmentPress = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const { name, size, uri, mimeType } = asset;

        const maxSize = 10 * 1024 * 1024;
        if (size && size > maxSize) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }

        Alert.alert(
          'Send File',
          `Send "${name}" (${(size / 1024 / 1024).toFixed(2)} MB)?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send',
              onPress: () => {
                const media: MessageMedia = {
                  id: Date.now().toString(),
                  type: mimeType?.startsWith('image/') ? 'image' : 'document',
                  url: uri,
                  filename: name || 'file',
                  file_size: size || 0,
                  mime_type: mimeType || 'application/octet-stream',
                };
                onSendMedia?.([media], 'file');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  }, [onSendMedia]);

  // Emoji handler
  const handleEmojiPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmojiPicker(true);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText(value + emoji);
    setShowEmojiPicker(false);
  }, [value, onChangeText]);

  // Phone call handler
  const handlePhoneCall = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phoneNumber = '+254794252032';

    Alert.alert(
      'Make Phone Call',
      `Call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
              if (supported) {
                await Linking.openURL(`tel:${phoneNumber}`);
              } else {
                Alert.alert('Error', 'Phone calls are not supported on this device.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to make phone call.');
            }
          }
        }
      ]
    );
  }, []);

  const stopRecording = useCallback(async (discard = false) => {
    if (!recordingRef.current) {
      if (isStartingRecordingRef.current || isRecording) {
        pendingStopDiscardRef.current = discard;
      }
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const activeRecording = recordingRef.current;
      activeRecording?.setOnRecordingStatusUpdate?.(null);
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      const finalDuration = recordingDuration;

      if (!discard && uri && finalDuration >= 1) {
        const waveform = buildVoiceWaveform(recordedLevelsRef.current);

        onSendVoice?.({
          uri,
          duration: finalDuration,
          waveform,
        });
      } else if (!discard) {
        Alert.alert('Recording too short', 'Please record for at least 1 second.');
      }

      recordingRef.current = null;
      isStartingRecordingRef.current = false;
      pendingStopDiscardRef.current = null;
      resetRecordingState();

    } catch (error) {
      console.error('Recording stop error:', error);
      recordingRef.current = null;
      isStartingRecordingRef.current = false;
      pendingStopDiscardRef.current = null;
      resetRecordingState();
      Alert.alert('Error', 'Failed to stop recording.');
    }
  }, [buildVoiceWaveform, isRecording, onSendVoice, recordingDuration, resetRecordingState]);

  // Voice recording
  const startRecording = useCallback(async () => {
    if (isRecording || recordingRef.current || isStartingRecordingRef.current) return;
    isStartingRecordingRef.current = true;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let status = micPermissionGrantedRef.current ? 'granted' : 'undetermined';
      if (!micPermissionGrantedRef.current) {
        const currentPermission = await Audio.getPermissionsAsync();
        status = currentPermission.status;
        if (status !== 'granted') {
          const requestedPermission = await Audio.requestPermissionsAsync();
          status = requestedPermission.status;
        }
        micPermissionGrantedRef.current = status === 'granted';
      }

      if (status !== 'granted') {
        isStartingRecordingRef.current = false;
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in settings to record voice messages.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsRecording(true);
      setRecordingDuration(0);
      recordedLevelsRef.current = [];
      setLiveWaveform(Array.from({ length: LIVE_WAVE_BAR_COUNT }, () => 0.12));
      pendingStopDiscardRef.current = null;

      const recording = new Audio.Recording();
      recordingRef.current = recording;

      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        keepAudioActiveHint: true,
        isMeteringEnabled: true,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      recording.setOnRecordingStatusUpdate((status: any) => {
        if (!status?.canRecord) return;
        const normalized = normalizeMetering(status.metering);
        const point = Math.round(normalized * 100);
        recordedLevelsRef.current.push(point);
        if (recordedLevelsRef.current.length > 240) {
          recordedLevelsRef.current.shift();
        }
        setLiveWaveform((prev) => {
          const last = prev[prev.length - 1] ?? normalized;
          const responsiveLevel = last + (normalized - last) * WAVE_RESPONSE_ALPHA;
          const next = prev.slice(1);
          next.push(responsiveLevel);
          return next;
        });
      });
      recording.setProgressUpdateInterval(55);

      await recording.startAsync();
      isStartingRecordingRef.current = false;

      clearRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // If the user already released before recorder was ready, finish now.
      if (pendingStopDiscardRef.current !== null) {
        const shouldDiscard = pendingStopDiscardRef.current;
        pendingStopDiscardRef.current = null;
        void stopRecording(shouldDiscard);
      }
    } catch (error) {
      console.error('Recording start error:', error);
      recordingRef.current = null;
      isStartingRecordingRef.current = false;
      pendingStopDiscardRef.current = null;
      resetRecordingState();
      Alert.alert('Error', 'Failed to start recording.');
    }
  }, [clearRecordingTimer, isRecording, normalizeMetering, resetRecordingState, stopRecording]);

  const cancelRecording = useCallback(() => {
    resetSlideToCancel();
    void stopRecording(true);
  }, [resetSlideToCancel, stopRecording]);

  const playDeleteDiscardAnimation = useCallback(() => {
    deleteAbsorbProgress.value = withTiming(
      1,
      {
        duration: DELETE_ABSORB_DURATION_MS,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(stopRecording)(true);
        }
      }
    );
  }, [deleteAbsorbProgress, stopRecording]);

  const handleRecordPressIn = useCallback((event: any) => {
    if (!hasText && !isRecording) {
      keepKeyboardDuringRecordingRef.current = isKeyboardVisible;
      resetSlideToCancel();
      const startX = event?.nativeEvent?.pageX;
      if (typeof startX === 'number') {
        slideStartXRef.current = startX;
      }
      void startRecording();
    }
  }, [hasText, isKeyboardVisible, isRecording, resetSlideToCancel, startRecording]);

  const handleRecordPressOut = useCallback(() => {
    if (!hasText) {
      const shouldDiscard = isSlideToCancelArmedRef.current;
      if (shouldDiscard && isRecording) {
        playDeleteDiscardAnimation();
        return;
      }
      resetSlideToCancel();
      void stopRecording(shouldDiscard);
    }
  }, [hasText, isRecording, playDeleteDiscardAnimation, resetSlideToCancel, stopRecording]);

  const handleRecordTouchCancel = useCallback(() => {
    if (!hasText) {
      resetSlideToCancel();
      void stopRecording(true);
    }
  }, [hasText, resetSlideToCancel, stopRecording]);

  recordPanResponderRef.current = PanResponder.create({
    onStartShouldSetPanResponder: () => !hasText,
    onMoveShouldSetPanResponder: (_, gestureState) =>
      !hasText && (Math.abs(gestureState.dx) > 2 || isRecording || isStartingRecordingRef.current),
    onPanResponderGrant: (event) => {
      handleRecordPressIn(event);
    },
    onPanResponderMove: (event, gestureState) => {
      if (hasText) return;
      if (typeof gestureState?.moveX === 'number') {
        updateSlideToCancel(gestureState.moveX);
        return;
      }
      const pageX = event?.nativeEvent?.pageX;
      if (typeof pageX === 'number') {
        updateSlideToCancel(pageX);
        return;
      }
      updateSlideToCancel(slideStartXRef.current + gestureState.dx);
    },
    onPanResponderRelease: () => {
      handleRecordPressOut();
    },
    onPanResponderTerminate: () => {
      handleRecordTouchCancel();
    },
    onPanResponderTerminationRequest: () => false,
  });

  // Send handler
  const handleSendPress = useCallback(() => {
    if (hasText) {
      Animated.sequence([
        Animated.timing(recordButtonScale, {
          toValue: 0.9,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(recordButtonScale, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      onSend();
    } else if (!isRecording) {
      keepKeyboardDuringRecordingRef.current = isKeyboardVisible;
      void startRecording();
    }
  }, [hasText, isKeyboardVisible, isRecording, onSend, recordButtonScale, startRecording]);

  return (
    <View style={[
      styles.inputContainer,
      !isKeyboardVisible && styles.inputContainerRaised,
    ]}>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
      ]}>
        {isRecording ? (
          <View style={styles.recordingTrashWrap}>
            <TouchableOpacity
              style={styles.leftActionIcon}
              onPress={cancelRecording}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Reanimated.View
                pointerEvents="none"
                style={[styles.recordingIconLayer, recordingCameraIconAnimatedStyle]}
              >
                <Ionicons
                  name="mic"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </Reanimated.View>
              <Reanimated.View
                pointerEvents="none"
                style={[styles.recordingIconLayer, recordingTrashIconAnimatedStyle]}
              >
                <Ionicons
                  name="trash"
                  size={20}
                  color={theme.colors.error}
                />
              </Reanimated.View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.leftActionIcon}
            onPress={handleCameraPress}
            disabled={isLoading}
          >
            <Ionicons
              name="camera-outline"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}

        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            isRecording && styles.textInputRecordingHidden,
          ]}
          onChangeText={onChangeText}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          scrollEnabled={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          blurOnSubmit={false}
          onSubmitEditing={onSend}
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
          onFocus={() => {
            setIsKeyboardVisible(true);
            onFocus?.();
          }}
          onBlur={() => {
            if (!keepKeyboardDuringRecordingRef.current) {
              setIsKeyboardVisible(false);
            }
            onBlur?.();
          }}
          underlineColorAndroid="transparent"
          editable={!isRecording || keepKeyboardDuringRecordingRef.current}
        />

        {isRecording && (
          <View style={styles.recordingInlineOverlay} pointerEvents="none">
            <View style={styles.recordingInlineContent}>
              <Reanimated.View style={[styles.recordingWaveContainer, recordingWaveAnimatedStyle]}>
                {liveWaveform.map((level, barIndex) => (
                  <View
                    key={`record-wave-${barIndex}`}
                    style={[
                      styles.recordingWaveBar,
                      {
                        height: 5 + level * 18,
                        opacity: 0.55 + level * 0.45,
                      },
                    ]}
                  />
                ))}
              </Reanimated.View>
              <View style={styles.recordingRightCluster}>
                <View style={styles.recordingTimerWrap}>
                  <Text style={styles.recordingTimerText}>{recordingDurationLabel}</Text>
                </View>
                <Reanimated.View style={[styles.recordingHintWrap, recordingHintAnimatedStyle]}>
                  <Ionicons
                    name="chevron-back"
                    size={14}
                    color={isSlideToCancelArmed ? theme.colors.error : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.recordingHintText,
                      isSlideToCancelArmed && styles.recordingHintTextArmed,
                    ]}
                  >
                     {isSlideToCancelArmed ? 'Deleted' : 'Slide to cancel'}
                  </Text>
                </Reanimated.View>
              </View>
            </View>
          </View>
        )}

        {!hasText && !isRecording && (
          <View style={styles.rightIconsContainer}>
            <TouchableOpacity
              style={styles.rightActionIcon}
              onPress={handleAttachmentPress}
              disabled={isRecording}
            >
              <Ionicons
                name="attach-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rightActionIcon}
              onPress={handleEmojiPress}
              disabled={isRecording}
            >
              <Ionicons
                name="happy-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Send/Mic Button - ALWAYS in same position */}
        <Animated.View
          {...(!hasText ? recordPanResponderRef.current?.panHandlers : {})}
          style={[
            styles.sendButtonContainer,
            {
              transform: [{
                scale: recordButtonScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: hasText
                    ? theme.colors.primary
                    : theme.colors.secondary,
              }
            ]}
            onPress={handleSendPress}
            disabled={isLoading}
          >
            <View style={hasText ? styles.sendIconOffset : null}>
              <Ionicons
                name={hasText ? "paper-plane" : "mic"}
                size={18}
                color={hasText ? theme.colors.onPrimary : theme.colors.onSurface}
                style={hasText ? { transform: [{ rotate: '45deg' }] } : null}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity
          style={styles.emojiModalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiModalContent}>
            <FlatList
              data={EMOJIS}
              keyExtractor={(item, index) => `${item}-${index}`}
              numColumns={8}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiItem}
                  onPress={() => handleEmojiSelect(item)}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.emojiGrid}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outline,
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: Platform.select({ ios: 5, android: 7 }),
  },
  inputContainerRaised: {
    marginBottom: Platform.select({ ios: 44, android: 0 }),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 3,
    minHeight: 41,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingInlineContent: {
    flex: 1,
    minHeight: Platform.select({
      ios: 35,
      android: 33,
    }),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  recordingInlineOverlay: {
    position: 'absolute',
    left: 44,
    right: 42,
    top: 3,
    bottom: 3,
    justifyContent: 'center',
  },
  recordingWaveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  recordingRightCluster: {
    width: 168,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    marginRight: 60,
  },
  recordingWaveBar: {
    width: 3,
    height: 12,
    borderRadius: 2,
    marginRight: 2,
    backgroundColor: theme.colors.primary,
  },
  recordingHintText: {
    fontSize: 12,
    lineHeight: 15,
    color: theme.colors.onSurfaceVariant,
    width: 96,
    textAlign: 'left',
    marginLeft: 2,
  },
  recordingHintWrap: {
    width: 114,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  recordingIconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTrashWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  recordingHintTextArmed: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  recordingTimerWrap: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  recordingTimerText: {
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: Platform.select({ 
      ios: 22,
      android: 20
    }),
    paddingVertical: Platform.select({
      ios: 7,
      android: 7
    }),
    paddingHorizontal: 8,
    minHeight: Platform.select({
      ios: 35,
      android: 33
    }),
    maxHeight: Platform.select({
      ios: 150,
      android: 150
    }),
    textAlignVertical: 'center',
  },
  textInputRecordingHidden: {
    opacity: 0,
  },
  leftActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    justifyContent: 'flex-end',
    marginRight: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  rightActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  sendButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sendIconOffset: {
    transform: [{ translateX: -2 }],
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_WIDTH * 0.8,
  },
  emojiGrid: {
    paddingVertical: 10,
  },
  emojiItem: {
    width: SCREEN_WIDTH / 8 - 10,
    height: SCREEN_WIDTH / 8 - 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
});

export default ChatInputBar;
