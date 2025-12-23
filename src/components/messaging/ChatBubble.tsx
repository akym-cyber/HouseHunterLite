// UPDATED ChatBubble.tsx - ADDED otherUserAvatar prop
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity, Image } from 'react-native';
import { Message } from '../../types/database';
import { ScreenStackHeaderRightView } from 'react-native-screens';

interface ChatBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  formatMessageTime: (timestamp: string) => string;
  getMessageStatusIcon: (status?: string) => string | null;
  isSending?: boolean;
  onRetry?: (messageId: string) => void;
  otherUserAvatar?: string; // ADD THIS LINE
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwnMessage,
  formatMessageTime,
  getMessageStatusIcon,
  isSending = false,
  onRetry,
  otherUserAvatar, // ADD THIS LINE
}) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Helper function to detect short messages
  const isShortMessage = (text: string) => {
    return text.length <= 20;
  };

  // Dynamic width calculation - MORE FLEXIBLE
  const getBubbleWidth = () => {
    const charCount = message.content.length;
    if (charCount < 10) return 'auto'; // Let content decide for very short messages
    if (charCount < 30) return '70%';
    if (charCount > 100) return '88%';
    return '80%';
  };

  // Pulsing animation for sending messages
  useEffect(() => {
    if (isSending || message.status === 'sending') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isSending, message.status, opacityAnim]);

  // Get status icon with proper styling
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'sending':
        return { icon: '⏳', color: 'rgba(255, 255, 255, 0.6)', size: 9 };
      case 'sent':
        return { icon: '✓', color: 'rgba(255, 255, 255, 0.6)', size: 9 };
      case 'delivered':
        return { icon: '✓✓', color: 'rgba(255, 255, 255, 0.6)', size: 9 };
      case 'read':
        return { icon: '✓✓', color: '#00D4AA', size: 9 }; // Green light color
      case 'failed':
        return { icon: '❌', color: '#FF3B30', size: 9, hasRetry: true };
      default:
        return { icon: '✓', color: 'rgba(255, 255, 255, 0.6)', size: 9 };
    }
  };

  const statusDisplay = getStatusDisplay(message.status);
  const showAvatar = !isOwnMessage && otherUserAvatar;

  return (
    <View style={[
      styles.messageRow,
      isOwnMessage ? styles.ownRow : styles.otherRow,
    ]}>
      {/* Avatar for other user */}
      {showAvatar && (
        <Image
          source={{ uri: otherUserAvatar }}
          style={styles.avatar}
        />
      )}
      
      <View style={[
        styles.bubbleContainer,
        isOwnMessage ? styles.ownBubbleContainer : styles.otherBubbleContainer,
        showAvatar && styles.bubbleContainerWithAvatar,
      ]}>
        <Animated.View
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
            isShortMessage(message.content) && styles.shortBubble,
            {
              width: getBubbleWidth(),
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          <Text style={[
            styles.text,
            isOwnMessage ? styles.ownText : styles.otherText,
          ]}>
            {message.content}
          </Text>

          <View style={styles.footer}>
            <Text style={[
              styles.time,
              isOwnMessage ? styles.ownTime : styles.otherTime
            ]}>
              {formatMessageTime(message.created_at)}
            </Text>

            {isOwnMessage && statusDisplay.hasRetry ? (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => onRetry?.(message.id)}
              >
                <Text style={[styles.statusIcon, { color: statusDisplay.color, fontSize: statusDisplay.size }]}>
                  {statusDisplay.icon}
                </Text>
              </TouchableOpacity>
            ) : isOwnMessage ? (
              <Text style={[styles.statusIcon, { color: statusDisplay.color, fontSize: statusDisplay.size }]}>
                {statusDisplay.icon}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Message row
  messageRow: {
    width: '100%',
    marginVertical: 4,
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  
  // Avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  
  // Bubble container
  bubbleContainer: {
    maxWidth: '90%',
  },
  bubbleContainerWithAvatar: {
    marginLeft: 0, // Reset left margin when avatar is present
  },
  ownBubbleContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  otherBubbleContainer: {
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  messageText: {
  fontSize: 16,
  lineHeight: 20, // WhatsApp uses ~1.25x line height
  includeFontPadding: false,
  textAlignVertical: 'top', // WhatsApp aligns to top
  paddingVertical: 0,
},
  // Bubble styling - COMPACT VERSION
    bubble: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 18,
    minHeight: 10,
    minWidth: 80,
    maxWidth: '600%',
    marginBottom: -18,
    alignSelf: 'flex-start',
    justifyContent: 'center', // Centers vertically
    flexDirection: 'column', // Ensures column layout
    
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
  },
  
  // Text styling
  text: {
    fontSize: 16,
    lineHeight: 17,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: -10,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#000000',
  },
  
  // Footer - COMPACT
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: -1,
  },
  time: {
    fontSize: 11,
    opacity: 0.7,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTime: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  statusIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  retryButton: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shortBubble: {
    paddingHorizontal: 12,
    minWidth: 0,
  },
});

export default ChatBubble;
