import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Clipboard,
  Keyboard,
  KeyboardAvoidingView,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Avatar,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { defaultTheme } from '../../styles/theme';
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
const MESSAGE_HEIGHT_ESTIMATE = 60;
const HEADER_HEIGHT = 60; // Approximate header height
const INPUT_BAR_HEIGHT = 50; // Approximate input bar height

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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Message>>(null);
  const scrollPositionRef = useRef({ offset: 0, contentHeight: 0, layoutHeight: 0 });
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Video call pulse animation
  const videoCallPulseAnim = useRef(new Animated.Value(0)).current;

  // Calculate keyboard vertical offset - only header height
  // KeyboardAvoidingView automatically accounts for safe area, so we only need header
  const keyboardVerticalOffset = useMemo(() => {
    return HEADER_HEIGHT; // Just the header, KeyboardAvoidingView handles safe area
  }, []);

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
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 500);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        if (isNearBottom) {
          setTimeout(() => scrollToBottom(true, true), 100);
        }
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isNearBottom, scrollToBottom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && isNearBottom && !isUserScrollingRef.current) {
      const timeout = setTimeout(() => {
        scrollToBottom(true, true);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

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
    if (index === 0) return null;

    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];

    const currentDate = timestampToDate(currentMessage.created_at).toDateString();
    const previousDate = timestampToDate(previousMessage.created_at).toDateString();

    if (currentDate !== previousDate) {
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

    return (
      <>
        {dateSeparator && (
          <DateSeparator dateText={dateSeparator} />
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
          {!isOwnMessage && !isConsecutive && (
            <Avatar.Text
              size={32}
              label={otherUser?.firstName?.[0] || 'U'}
              style={styles.messageAvatar}
            />
          )}

          <View style={{ maxWidth: '80%' }}>
            {item.reply_to && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewText}>Replying to message</Text>
              </View>
            )}

            <ChatBubble
              message={item}
              isOwnMessage={isOwnMessage}
              formatMessageTime={formatMessageTime}
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

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: MESSAGE_HEIGHT_ESTIMATE,
      offset: MESSAGE_HEIGHT_ESTIMATE * index,
      index,
    }),
    []
  );

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
    if (isNearBottom) {
      setTimeout(() => scrollToBottom(true, true), 200);
    }
  }, [isNearBottom, scrollToBottom]);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

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
      <View style={[styles.chatHeader, { paddingTop: insets.top + 20 }]}>
        {onBack && (
          <IconButton
            icon="chevron-left"
            iconColor={defaultTheme.colors.onPrimary}
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
            labelStyle={{ color: defaultTheme.colors.primary }}
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
            <Ionicons name="call-outline" size={22} color={defaultTheme.colors.onPrimary} />
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
              <Ionicons name="videocam-outline" size={22} color={defaultTheme.colors.onPrimary} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [onBack, otherUser, formatMessageTime, videoCallPulseAnim, insets.top]);

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <View style={styles.chatContainer}>
        {renderHeader()}
        <SafeAreaView style={styles.chatSafeArea} edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Calculate content padding - adjust based on keyboard state
  const contentPaddingBottom = useMemo(() => {
    // When keyboard is open: minimal spacing (input sits right above keyboard)
    // When keyboard is closed: normal spacing (input at bottom)
    if (keyboardHeight > 0) {
      // Keyboard open - minimal spacing between input and keyboard
      return 60; // Just enough for input bar + small buffer
    } else {
      // Keyboard closed - normal spacing at bottom
      return 80; // More space when keyboard is closed
    }
  }, [keyboardHeight]);

  return (
    <View style={styles.chatContainer}>
      {renderHeader()}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <SafeAreaView style={styles.chatSafeArea} edges={[]}>
          <View style={styles.contentWrapper}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              contentContainerStyle={[
                styles.messagesContent,
                { 
                  paddingBottom: contentPaddingBottom,
                  flexGrow: 1,
                }
              ]}
              style={styles.messagesList}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.5}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
              maintainVisibleContentPosition={
                isNearBottom && messages.length > 0
                  ? { minIndexForVisible: messages.length - 1 }
                  : undefined
              }
            />

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
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatSafeArea: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  messagesList: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: defaultTheme.colors.primary,
  },
  headerBackButton: {
    margin: -8,
  },
  headerAvatar: {
    marginRight: 12,
    backgroundColor: defaultTheme.colors.onPrimary,
  },
  headerAvatarText: {
    backgroundColor: defaultTheme.colors.onPrimary,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: defaultTheme.colors.onPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: defaultTheme.colors.onPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  consecutiveMessage: {
    marginTop: 2,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  replyPreview: {
    backgroundColor: defaultTheme.colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: defaultTheme.colors.primary,
  },
  replyPreviewText: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: defaultTheme.colors.onSurfaceVariant,
  },
});

export default ChatRoom;
