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
  Vibration,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { Message, MessageMedia } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(24);
  const [iconsVisible, setIconsVisible] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Refs
  const recordingRef = useRef<any>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const panResponderRef = useRef<any>(null);
  const textInputRef = inputRef ?? useRef<TextInput | null>(null);

  // Animation values
  const recordButtonScale = useRef(new Animated.Value(1)).current;
  const recordPulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Initialize audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

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

  const hasText = value.trim().length > 0;

  // Handle icons visibility animation - hide when typing starts (has text)
  useEffect(() => {
    if (hasText) {
      // Hide icons with fade animation when typing starts
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIconsVisible(false);
      });
    } else {
      // Show icons with fade animation when no text (not typing)
      setIconsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [hasText, fadeAnim]);

  // Handle camera functionality
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

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (asset.fileSize && asset.fileSize > maxSize) {
          Alert.alert('Photo Too Large', 'Please take a photo smaller than 10MB.');
          return;
        }

        // Show preview and confirm send
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

  // Handle document picker
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

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (size && size > maxSize) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }

        // Show file info and confirm
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

  // Handle emoji picker
  const handleEmojiPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmojiPicker(true);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText(value + emoji);
    setShowEmojiPicker(false);
  }, [value, onChangeText]);

  // Handle phone call
  const handlePhoneCall = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // For demo, we'll use a placeholder number
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

  // Voice recording functionality
  const startRecording = useCallback(async () => {
    // Prevent multiple recordings
    if (isRecording || recordingRef.current) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in settings to record voice messages.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsRecording(true);
      setRecordingDuration(0);

      // Start recording animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordPulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const recording = new Audio.Recording();
      recordingRef.current = recording;

      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
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

      await recording.startAsync();

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording start error:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording.');
    }
  }, [recordPulseAnim]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop animation
      recordPulseAnim.stopAnimation();
      recordPulseAnim.setValue(0);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri && recordingDuration >= 1) {
        setRecordingUri(uri);

        // Generate simple waveform (placeholder)
        const waveform = Array.from({ length: 50 }, () => Math.random() * 100);

        Alert.alert(
          'Send Voice Message',
          `Duration: ${recordingDuration}s. Send this voice message?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setRecordingUri(null) },
            {
              text: 'Send',
              onPress: () => {
                onSendVoice?.({
                  uri,
                  duration: recordingDuration,
                  waveform,
                });
                setRecordingUri(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Recording too short', 'Please record for at least 1 second.');
      }

      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

    } catch (error) {
      console.error('Recording stop error:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  }, [recordingDuration, recordPulseAnim, onSendVoice]);

  // Pan responder for recording
  panResponderRef.current = PanResponder.create({
    onStartShouldSetPanResponder: () => !hasText,
    onPanResponderGrant: startRecording,
    onPanResponderRelease: stopRecording,
    onPanResponderTerminate: stopRecording,
  });

  // Handle send press
  const handleSendPress = useCallback(() => {
    if (value.trim().length > 0) {
      // Add button press animation
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
      // Start recording
      startRecording();
    }
  }, [value, onSend, isRecording, startRecording, recordButtonScale]);

  const handleContentSizeChange = useCallback((event: any) => {
    const newHeight = Math.min(Math.max(event.nativeEvent.contentSize.height, 24), 120);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInputHeight(newHeight);
  }, []);

  const showActionIcons = !hasText && !isRecording;

  return (
    <View style={[
      styles.inputContainer,
      !isKeyboardVisible && styles.inputContainerRaised,
    ]}>
      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.recordingPulse,
              {
                opacity: recordPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [{
                  scale: recordPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Ionicons name="mic" size={20} color="#ff4444" />
          <Text style={styles.recordingText}>
            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}

      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        isRecording && styles.inputWrapperRecording,
      ]}>
        {/* Left side camera icon - always visible */}
        <TouchableOpacity
          style={styles.leftActionIcon}
          onPress={handleCameraPress}
          disabled={isLoading}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color={isLoading ? theme.colors.onSurfaceVariant : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, { height: inputHeight}]}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          scrollEnabled={false}
          blurOnSubmit={false}
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
          onFocus={() => {
            setIsKeyboardVisible(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsKeyboardVisible(false);
            onBlur?.();
          }}
          onContentSizeChange={handleContentSizeChange}
          underlineColorAndroid="transparent"
          editable={!isRecording}
        />

        {/* Right side icons - show when not typing */}
        {!hasText && (
          <Animated.View style={[styles.rightIconsContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.rightActionIcon}
              onPress={handleAttachmentPress}
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
            >
              <Ionicons
                name="happy-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Send/Mic Button */}
        <Animated.View
          {...(hasText ? {} : panResponderRef.current?.panHandlers)}
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
                backgroundColor: isRecording
                  ? '#ff4444'
                  : hasText
                    ? theme.colors.primary
                    : theme.colors.secondary,
              }
            ]}
            onPress={handleSendPress}
            disabled={isLoading}
          >
            <Ionicons
              name={hasText ? "paper-plane" : "mic"}
              size={18}
              color={hasText ? theme.colors.onPrimary : theme.colors.onSurface}
              style={hasText ? { transform: [{ rotate: '45deg' }] } : null}
            />
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
    paddingTop: 6,
    paddingBottom: Platform.select({ ios: 6, android: 8 }),
  },
  inputContainerRaised: {
    marginBottom: 44,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  recordingPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff4444',
    opacity: 0.3,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4444',
    marginLeft: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 36,
    maxHeight: 100,
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
  inputWrapperRecording: {
    borderColor: '#ff4444',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 244, 244, 0.9)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    paddingVertical: Platform.select({ ios: 6, android: 4 }),
    paddingHorizontal: 6,
    maxHeight: 120,
    minHeight: 24,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  actionIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  leftActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rightActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButtonContainer: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
