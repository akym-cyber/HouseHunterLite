import React, { useState, useEffect, useRef, useMemo, useCallback, } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Clipboard,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Card,
  Avatar,
  IconButton,
  Divider,
  FAB,
  Chip,
  Banner,
  ProgressBar,
  Modal,
  Portal,
  Searchbar,
} from 'react-native-paper';
// import * as Haptics from 'expo-haptics'; // Optional: install expo-haptics for haptic feedback
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
// import { Audio } from 'expo-av';
// import * as FileSystem from 'expo-file-system';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as FileSystem from 'expo-file-system';
// import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../hooks/useAuth';
import useKeyboardVisibility from '../../hooks/useKeyboardVisibility';
import { defaultTheme } from '../../styles/theme';

import { getBubbleStyle } from '../../utils/bubbleShapes';
import { Message, Conversation, SearchFilter, Property } from '../../types/database';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// Property-specific chat enhancements
import PropertyContextSidebar from './PropertyContextSidebar';
import PaymentIntegration from './PaymentIntegration';
import PropertyBot from './PropertyBot';
import ChatBubble from './ChatBubble';
import DateSeparator from './DateSeparator';
import TypingIndicator from './TypingIndicator';
import ReactionButton from './ReactionButton';
import NewMessageHint from './NewMessageHint';
import ReactionHistoryPopup from './ReactionHistoryPopup';
import FloatingReaction from './FloatingReaction';
import MessageHighlight from './MessageHighlight';
import ReactionReplay from './ReactionReplay';
import MessageEmotionPulse from './MessageEmotionPulse';
import FloatingQuickReply from './FloatingQuickReply';
import MessageBreathing from './MessageBreathing';
import ChatInputBar from './ChatInputBar';

interface ChatRoomProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, replyTo?: string, media?: any[]) => Promise<void>;
  onLoadMore: () => Promise<void>;
  loading?: boolean;
  otherUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

function ChatRoom({
  conversation,
  messages,
  onSendMessage,
  onLoadMore,
  loading = false,
  otherUser,
  property, // Add property prop
}: ChatRoomProps & { property?: Property }) {
  const { user } = useAuth();
  const isKeyboardVisible = useKeyboardVisibility();


  const [longPressingMessageId, setLongPressingMessageId] = useState<string | null>(null);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
 const flatListRef = useRef<FlatList<Message>>(null);

  // Video call pulse animation
  const videoCallPulseAnim = useRef(new Animated.Value(0)).current;

  // Start video call pulse animation
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
    };
  }, [videoCallPulseAnim]);

  // Centralized scroll function to prevent layout thrashing and Reanimated issues
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, scrollToBottom]);

  // Keyboard listeners for smooth animations
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollToBottom();
        }, 100);
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
  }, []);

  // Track scroll position to show/hide new message hint
  const [isNearBottom, setIsNearBottom] = useState(true);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    setIsNearBottom(isNearBottom);

    if (isNearBottom) {
      // Reset new message count when user scrolls to bottom
    }
  }, []);

  const handleNewMessageHintPress = useCallback(() => {
    scrollToBottom();
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setNewMessage(text);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const newMessageObj = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: user?.id || 'propertyOwnerId', // Get from auth
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    try {
      // Save to database via parent component
      await onSendMessage(newMessageObj.content, replyingTo?.id);

      // Update local state immediately for better UX
      // This will be replaced when real-time updates come in
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Clear reply state
      setReplyingTo(null);

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Handle retry for failed messages
  const handleRetry = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      // Retry sending the message
      await onSendMessage(message.content, undefined); // Don't pass replyTo for retry
      Alert.alert('Success', 'Message sent successfully!');
    } catch (error) {
      console.error('Failed to retry message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [messages, onSendMessage]);

  // Message status indicators
  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '✓';
    }
  };

  // Format timestamp - Telegram style with relative time
  const formatMessageTime = useCallback((timestamp: any) => {
    try {
      const now = new Date();
      let messageTime: Date;

      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        messageTime = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else if (typeof timestamp === 'string') {
        if (timestamp.includes('T')) {
          messageTime = new Date(timestamp);
        } else if (timestamp.match(/^\d+$/)) {
          messageTime = new Date(parseInt(timestamp));
        } else {
          messageTime = new Date(timestamp);
        }
      } else if (typeof timestamp === 'number') {
        messageTime = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        messageTime = timestamp;
      } else {
        messageTime = new Date(timestamp);
      }

      if (isNaN(messageTime.getTime())) {
        return 'now';
      }

      const diffInMs = now.getTime() - messageTime.getTime();

      // Difference in minutes, hours, days
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      // Less than 1 minute ago
      if (diffInMinutes < 1) {
        return 'just now';
      }

      // Less than 1 hour ago
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
      }

      // Less than 24 hours ago
      if (diffInHours < 24) {
        return `${diffInHours}h`;
      }

      // Yesterday (24-48 hours ago)
      if (diffInDays === 1) {
        return 'Yesterday';
      }

      // Less than 7 days ago
      if (diffInDays < 7) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return daysOfWeek[messageTime.getDay()];
      }

      // Older than 7 days - show date (like "Oct 11")
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[messageTime.getMonth()];
      const day = messageTime.getDate();

      // If same year, show "Oct 11"
      if (messageTime.getFullYear() === now.getFullYear()) {
        return `${month} ${day}`;
      }

      // Different year, show "Oct 11, 2023"
      return `${month} ${day}, ${messageTime.getFullYear()}`;
    } catch (error) {
      console.warn('Error formatting timestamp:', timestamp, error);
      return 'now';
    }
  }, []);

  // Helper function to convert timestamp to Date
  const timestampToDate = useCallback((timestamp: any): Date => {
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    } else if (typeof timestamp === 'string') {
      if (timestamp.includes('T')) {
        return new Date(timestamp);
      } else if (timestamp.match(/^\d+$/)) {
        return new Date(parseInt(timestamp));
      } else {
        return new Date(timestamp);
      }
    } else if (typeof timestamp === 'number') {
      return new Date(timestamp);
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else {
      return new Date(timestamp);
    }
  }, []);

  // Date separators
  const getDateSeparator = useCallback((messages: Message[], index: number) => {
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

  // Helper function to check if messages are consecutive from same sender
  const isConsecutiveFromSameSender = useCallback((currentIndex: number) => {
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

  const renderMessage = useMemo(() => ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
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
            isConsecutive && styles.consecutiveMessage
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPressIn={() => setLongPressingMessageId(item.id)}
          onPressOut={() => setLongPressingMessageId(null)}
          disabled={isKeyboardVisible}
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

            <MessageBreathing
              reactions={item.reactions || {}}
              replyCount={0}
            >
              <MessageEmotionPulse reactions={item.reactions || {}}>
                <ChatBubble
                  message={item}
                  isOwnMessage={isOwnMessage}
                  formatMessageTime={formatMessageTime}
                  getMessageStatusIcon={getMessageStatusIcon}
                  isSending={item.status === 'sending'}
                  onRetry={handleRetry}
                />
              </MessageEmotionPulse>
            </MessageBreathing>

            {item.reactions && Object.keys(item.reactions).length > 0 && (
              <View style={styles.reactionsContainer}>
                {Object.entries(item.reactions).map(([emoji, userIds]) => (
                  <ReactionButton
                    key={emoji}
                    emoji={emoji}
                    count={userIds.length}
                    messageId={item.id}
                  />
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </>
    );
  }, [messages, user?.id, otherUser, formatMessageTime, getDateSeparator, isKeyboardVisible, longPressingMessageId, isConsecutiveFromSameSender, handleRetry]);

  const handleMessageLongPress = useCallback((message: Message, event?: any) => {
    if (hapticsEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const position = event?.nativeEvent
      ? {
          x: event.nativeEvent.pageX || 0,
          y: event.nativeEvent.pageY || 0,
          width: 0,
          height: 0,
        }
      : { x: 100, y: 200, width: 0, height: 0 };

    // For now, just show a simple alert
    Alert.alert(
      'Message Options',
      'Choose an action',
      [
        { text: 'Copy', onPress: () => Clipboard.setString(message.content) },
        { text: 'Reply', onPress: () => setReplyingTo(message) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [hapticsEnabled]);

  const renderHeader = () => {
    const handlePhoneCall = async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const phoneNumber = '+254794252032'; // Replace with actual contact number

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
        // Future video call integration
      } catch (error) {
        console.error('Video call error:', error);
      }
    };

    return (
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Image
            size={40}
            source={{ uri: otherUser?.avatarUrl }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Property Owner'}
            </Text>
            <Text style={styles.headerStatus}>
              {otherUser?.isOnline ? 'Online' : otherUser?.lastSeen ? `Last seen ${formatMessageTime(otherUser.lastSeen)}` : 'Offline'}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={handlePhoneCall}
            >
              <Ionicons name="call-outline" size={24} color={defaultTheme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={handleVideoCall}
            >
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
                <Ionicons name="videocam-outline" size={24} color={defaultTheme.colors.primary} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      {renderHeader()}
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight + 80 }}
          onContentSizeChange={scrollToBottom}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Clean Chat Input Bar Component */}
        <ChatInputBar
          value={newMessage}
          onChangeText={setNewMessage}
          onSend={handleSend}
          isFocused={isInputFocused}
          onFocus={() => {
            setIsInputFocused(true);
            scrollToBottom();
          }}
          onBlur={() => setIsInputFocused(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenHeight < 700;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  headerCard: {
    margin: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerAvatar: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: isSmallScreen ? 11 : 12,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: isSmallScreen ? 12 : 16,
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: isSmallScreen ? 12 : 16,
    alignItems: 'flex-end',
  },
  consecutiveMessage: {
    marginTop: isSmallScreen ? 2 : 4,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    minWidth: Platform.select({
      ios: 70,
      android: 60,
      default: 50,
    }),
    minHeight: 40,
    padding: isSmallScreen ? 10 : 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  longMessageText: {
    lineHeight: isSmallScreen ? 22 : 24,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: isSmallScreen ? 9 : 10,
    marginTop: 4,
  },
  ownTime: {
    color: defaultTheme.colors.onPrimary,
    opacity: 0.8,
  },
  otherTime: {
    color: defaultTheme.colors.onSurfaceVariant,
  },
  replyContainer: {
    backgroundColor: defaultTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: defaultTheme.colors.outline,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: defaultTheme.colors.primary,
    fontWeight: '600',
  },
  replyMessage: {
    fontSize: 14,
    color: defaultTheme.colors.onSurface,
    marginTop: 2,
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
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIcon: {
    fontSize: 12,
    color: defaultTheme.colors.onPrimary,
    opacity: 0.8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  absoluteInput: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  absoluteReply: {
    position: 'absolute',
    bottom: 80, // Above the input
    left: 0,
    right: 0,
  },
});

export default ChatRoom;  