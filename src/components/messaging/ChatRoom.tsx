import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Alert,
  Clipboard,
  Animated,
  UIManager,
  TextInput,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Avatar,
  IconButton,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/useTheme';
import { Message, Conversation, Property } from '../../types/database';
import ChatBubble from './ChatBubble';
import DateSeparator from './DateSeparator';
import ChatInputBar from './ChatInputBar';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatRoomProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, replyTo?: string, media?: any[]) => Promise<void>;
  onLoadMore: () => Promise<void>;
  loading?: boolean;
  onBack?: () => void;
  otherUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  property?: Property;
}

const SCROLL_THRESHOLD = 100;

function ChatRoom({
  conversation,
  messages,
  onSendMessage,
  onLoadMore,
  loading = false,
  onBack,
  otherUser,
  property,
}: ChatRoomProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Message>>(null);
  const chatInputRef = useRef<TextInput | null>(null);
  const scrollPositionRef = useRef({ offset: 0, contentHeight: 0, layoutHeight: 0 });
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepPinnedToBottomRef = useRef(false);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Video call pulse animation
  const videoCallPulseAnim = useRef(new Animated.Value(0)).current;

  // Initialize pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(videoCallPulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(videoCallPulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => {
      pulseAnimation.stop();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [videoCallPulseAnim]);

  // Smart scroll to bottom
  const scrollToBottom = useCallback((animated = true, force = false) => {
    if (!flatListRef.current) return;
    if (force || isNearBottom) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated });
      });
    }
  }, [isNearBottom]);

  const scrollToExactBottom = useCallback((animated = false) => {
    if (!flatListRef.current) return;
    const { contentHeight, layoutHeight } = scrollPositionRef.current;
    if (contentHeight && layoutHeight) {
      const offset = Math.max(0, contentHeight - layoutHeight);
      flatListRef.current.scrollToOffset({ offset, animated });
      return;
    }
    flatListRef.current.scrollToEnd({ animated });
  }, []);

  const scrollToLastMessage = useCallback((animated = false) => {
    if (!flatListRef.current) return;
    const lastIndex = messages.length - 1;
    if (lastIndex < 0) return;
    flatListRef.current.scrollToIndex({ index: lastIndex, viewPosition: 1, animated });
  }, [messages.length]);

  const kickToExactBottom = useCallback((animated = false) => {
    scrollToLastMessage(animated);
    requestAnimationFrame(() => {
      scrollToLastMessage(false);
    });
  }, [scrollToLastMessage]);

  const scheduleAutoScroll = useCallback((delayMs: number) => {
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    if (delayMs <= 0) {
      if (!isUserScrollingRef.current) {
        scrollToBottom(true, true);
      }
      return;
    }

    autoScrollTimeoutRef.current = setTimeout(() => {
      if (!isUserScrollingRef.current) {
        scrollToBottom(true, true);
      }
    }, delayMs);
  }, [scrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    scrollPositionRef.current = {
      offset: contentOffset.y,
      contentHeight: contentSize.height,
      layoutHeight: layoutMeasurement.height,
    };

    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const nowNearBottom = distanceFromBottom < SCROLL_THRESHOLD;
    setIsNearBottom(nowNearBottom);
    if (nowNearBottom) {
      keepPinnedToBottomRef.current = true;
    }

    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    keepPinnedToBottomRef.current = false;
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 500);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && isNearBottom && !isUserScrollingRef.current) {
      scheduleAutoScroll(0);
      return () => {
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
          autoScrollTimeoutRef.current = null;
        }
      };
    }
  }, [messages.length, isNearBottom, scheduleAutoScroll]);

  // Format timestamp
  const formatMessageTime = useCallback((timestamp: any): string => {
    try {
      const now = new Date();
      let messageTime: Date;

      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        messageTime = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else if (typeof timestamp === 'string') {
        messageTime = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        messageTime = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        messageTime = timestamp;
      } else {
        return 'now';
      }

      if (isNaN(messageTime.getTime())) {
        return 'now';
      }

      const diffInMs = now.getTime() - messageTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return daysOfWeek[messageTime.getDay()];
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[messageTime.getMonth()];
      const day = messageTime.getDate();

      if (messageTime.getFullYear() === now.getFullYear()) {
        return `${month} ${day}`;
      }

      return `${month} ${day}, ${messageTime.getFullYear()}`;
    } catch (error) {
      return 'now';
    }
  }, []);

  const formatMessageClock = useCallback((timestamp: any): string => {
    try {
      let messageTime: Date;

      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        messageTime = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else if (typeof timestamp === 'string') {
        messageTime = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        messageTime = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        messageTime = timestamp;
      } else {
        return '';
      }

      if (isNaN(messageTime.getTime())) {
        return '';
      }

      return messageTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  }, []);

  const getMessageStatusIcon = useCallback((status?: string): string | null => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '✓';
    }
  }, []);

  const timestampToDate = useCallback((timestamp: any): Date => {
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      return new Date(timestamp);
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }, []);

  const getDateSeparator = useCallback((messages: Message[], index: number): string | null => {
    const currentMessage = messages[index];
    const previousMessage = index > 0 ? messages[index - 1] : null;

    const currentDate = timestampToDate(currentMessage.created_at).toDateString();
    const previousDate = previousMessage
      ? timestampToDate(previousMessage.created_at).toDateString()
      : null;

    if (index === 0 || currentDate !== previousDate) {
      const messageDate = timestampToDate(currentMessage.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return messageDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return null;
  }, [timestampToDate]);

  const isConsecutiveFromSameSender = useCallback((currentIndex: number): boolean => {
    if (currentIndex === 0) return false;

    const currentMessage = messages[currentIndex];
    const previousMessage = messages[currentIndex - 1];

    const sameSender = currentMessage.sender_id === previousMessage.sender_id;
    const currentTime = timestampToDate(currentMessage.created_at);
    const previousTime = timestampToDate(previousMessage.created_at);
    const timeDiff = currentTime.getTime() - previousTime.getTime();
    const withinTimeWindow = timeDiff < (5 * 60 * 1000);

    return sameSender && withinTimeWindow;
  }, [messages, timestampToDate]);

  const handleRetry = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await onSendMessage(message.content, undefined);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend message. Please try again.');
    }
  }, [messages, onSendMessage]);

  const handleMessageLongPress = useCallback((message: Message) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Message Options',
      'Choose an action',
      [
        { text: 'Copy', onPress: () => Clipboard.setString(message.content) },
        { text: 'Reply', onPress: () => setReplyingTo(message) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.uid;
    const dateSeparator = getDateSeparator(messages, index);
    const isConsecutive = isConsecutiveFromSameSender(index);
    const shouldShowAvatar = !isOwnMessage && !isConsecutive;

    return (
      <>
        {dateSeparator && (
          <View style={styles.dateSeparatorWrap}>
            <DateSeparator dateText={dateSeparator} />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            isConsecutive && styles.consecutiveMessage,
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.9}
        >
          {shouldShowAvatar && (
            otherUser?.avatarUrl ? (
              <Avatar.Image
                size={32}
                source={{ uri: otherUser.avatarUrl }}
                style={styles.messageAvatar}
              />
            ) : (
              <Avatar.Text
                size={32}
                label={otherUser?.firstName?.[0] || 'U'}
                style={styles.messageAvatar}
              />
            )
          )}

          <View
            style={[
              styles.messageContent,
              shouldShowAvatar && styles.otherMessageContent,
              !isOwnMessage && !shouldShowAvatar && styles.otherMessageContentIndented,
            ]}
          >
            {item.reply_to && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewText}>Replying to message</Text>
              </View>
            )}

            <ChatBubble
              message={item}
              isOwnMessage={isOwnMessage}
              formatMessageTime={formatMessageClock}
              getMessageStatusIcon={getMessageStatusIcon}
              isSending={item.status === 'sending'}
              onRetry={handleRetry}
              otherUserAvatar={otherUser?.avatarUrl}
            />
          </View>
        </TouchableOpacity>
      </>
    );
  }, [
    messages,
    user?.uid,
    otherUser,
    formatMessageTime,
    getMessageStatusIcon,
    getDateSeparator,
    isConsecutiveFromSameSender,
    handleRetry,
    handleMessageLongPress,
  ]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await onSendMessage(messageContent, replyingTo?.id);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true, true), 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        Alert.alert(
          'Permission Error',
          'You do not have permission to send messages in this conversation. Please contact support.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage || 'Failed to send message. Please try again.');
      }
      
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, replyingTo, onSendMessage, scrollToBottom]);

  const handleSendMedia = useCallback(async (media: any[], messageType: Message['message_type']) => {
    if (sending || !media || media.length === 0) return;

    setSending(true);
    try {
      await onSendMessage('', replyingTo?.id, media);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true, true), 100);
    } catch (error: any) {
      console.error('Failed to send media:', error);
      Alert.alert('Error', error?.message || 'Failed to send media. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, replyingTo, onSendMessage, scrollToBottom]);

  const handleSendVoice = useCallback(async (voiceData: { uri: string; duration: number; waveform: number[] }) => {
    if (sending) return;

    setSending(true);
    try {
      const media = [{
        id: Date.now().toString(),
        type: 'audio',
        url: voiceData.uri,
        duration: voiceData.duration,
        waveform: voiceData.waveform,
      }];
      await onSendMessage('', replyingTo?.id, media);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true, true), 100);
    } catch (error: any) {
      console.error('Failed to send voice message:', error);
      Alert.alert('Error', error?.message || 'Failed to send voice message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, replyingTo, onSendMessage, scrollToBottom]);

  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    // Ensure the latest message is visible above the keyboard when focusing input.
    keepPinnedToBottomRef.current = true;
    kickToExactBottom(false);
  }, [kickToExactBottom]);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    keepPinnedToBottomRef.current = false;
  }, []);

  const handleInputBarLayout = useCallback((event: any) => {
    const height = event?.nativeEvent?.layout?.height;
    if (typeof height !== 'number' || height <= 0) return;
    setInputBarHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handleListLayout = useCallback((event: any) => {
    const layoutHeight = event?.nativeEvent?.layout?.height;
    if (typeof layoutHeight === 'number') {
      scrollPositionRef.current = {
        ...scrollPositionRef.current,
        layoutHeight,
      };
    }
    if (!keepPinnedToBottomRef.current || isUserScrollingRef.current) return;
    kickToExactBottom(false);
  }, [kickToExactBottom]);

  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    if (typeof height === 'number') {
      scrollPositionRef.current = {
        ...scrollPositionRef.current,
        contentHeight: height,
      };
    }
    if (!keepPinnedToBottomRef.current || isUserScrollingRef.current) return;
    kickToExactBottom(false);
  }, [kickToExactBottom]);

  const renderHeader = useCallback(() => {
    const handlePhoneCall = async () => {
      try {
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
      } catch (error) {
        console.error('Phone call error:', error);
      }
    };

    const handleVideoCall = async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Video call feature will be available soon!');
      } catch (error) {
        console.error('Video call error:', error);
      }
    };

    const displayName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Property Owner';
    const initial = (otherUser?.firstName?.[0] || 'P').toUpperCase();

    return (
      <View style={[styles.chatHeader, { paddingTop: insets.top + 5 }]}>
        {onBack && (
          <IconButton
            icon="chevron-left"
            iconColor={theme.colors.onPrimary}
            size={28}
            onPress={onBack}
            style={styles.headerBackButton}
          />
        )}
        {otherUser?.avatarUrl ? (
          <Avatar.Image
            size={40}
            source={{ uri: otherUser.avatarUrl }}
            style={styles.headerAvatar}
          />
        ) : (
          <Avatar.Text
            size={40}
            label={initial}
            style={[styles.headerAvatar, styles.headerAvatarText]}
            labelStyle={{ color: theme.colors.primary }}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.headerStatus} numberOfLines={1}>
            {otherUser?.isOnline ? 'Online' : otherUser?.lastSeen ? `Last seen ${formatMessageTime(otherUser.lastSeen)}` : 'Offline'}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={handlePhoneCall}>
            <Ionicons name="call-outline" size={22} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleVideoCall}>
            <Animated.View style={{
              transform: [{
                scale: videoCallPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              }],
              opacity: videoCallPulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            }}>
              <Ionicons name="videocam-outline" size={22} color={theme.colors.onPrimary} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [onBack, otherUser, formatMessageTime, videoCallPulseAnim, insets.top]);

  // Loading state
  const maintainVisiblePosition = useMemo(() => {
    if (Platform.OS === 'ios') {
      return undefined;
    }

    return isNearBottom && messages.length > 0
      ? { minIndexForVisible: messages.length - 1 }
      : undefined;
  }, [isNearBottom, messages.length]);

  useEffect(() => {
    if (!isInputFocused || inputBarHeight <= 0) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }, [inputBarHeight, isInputFocused]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: Math.max(6, inputBarHeight + 6) },
          ]}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={maintainVisiblePosition}
        />

        <View onLayout={handleInputBarLayout}>
          <ChatInputBar
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={handleSend}
            onSendMedia={handleSendMedia}
            onSendVoice={handleSendVoice}
            conversationId={conversation.id}
            isFocused={isInputFocused}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            inputRef={chatInputRef}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  messagesList: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 2,
    backgroundColor: theme.colors.primary,
  },
  headerBackButton: {
    marginLeft: -8,
    marginRight: 10,
    transform: [{ translateX: -2 }, { translateY: -10 }],
  },
  headerAvatar: {
    marginRight: 12,
    backgroundColor: theme.colors.onPrimary,
    transform: [{ translateY: -10 }],
  },
  headerAvatarText: {
    backgroundColor: theme.colors.onPrimary,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
    transform: [{ translateY: -10 }],
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: theme.colors.onPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ translateY: -10 }],
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  listHeader: {
    marginBottom: 16,
  },
  messagesContent: {
    paddingBottom: 6,
  },
  messagesContentKeyboard: {
    paddingBottom: 40,
  },
  dateSeparatorWrap: {
    paddingHorizontal: 16,
  },
  messageContent: {
    maxWidth: '100%',
    flexShrink: 1,
    flexGrow: 1,
  },
  otherMessageContent: {
    marginTop: 0,
  },
  otherMessageContentIndented: {
    marginLeft: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  consecutiveMessage: {
    marginTop: 2,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  replyPreview: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  replyPreviewText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
});

export default ChatRoom;

