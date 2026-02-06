// UPDATED ChatBubble.tsx - ADDED otherUserAvatar prop
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { Message } from '../../types/database';
import { useTheme } from '../../theme/useTheme';
import PropertyOfferMessage from './PropertyOfferMessage';
import AudioPlayer from './AudioPlayer';

interface ChatBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  formatMessageTime: (timestamp: string) => string;
  getMessageStatusIcon: (status?: string) => string | null;
  isSending?: boolean;
  onRetry?: (messageId: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwnMessage,
  formatMessageTime,
  getMessageStatusIcon,
  isSending = false,
  onRetry,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Helper function to detect short messages
  const isShortMessage = (text: string) => text.length <= 20;

  const isDeletedForEveryone = !!message.deleted_for_everyone;
  const displayContent = isDeletedForEveryone ? 'This message was deleted' : message.content;
  const audioMedia = message.media?.find(item => item.type === 'audio' || item.type === 'voice');
  const attachmentAudioUrl = message.message_type === 'audio' ? message.attachment_url : undefined;
  const remoteUrl =
    (attachmentAudioUrl && attachmentAudioUrl.startsWith('http') ? attachmentAudioUrl : undefined)
    || (audioMedia?.url && audioMedia.url.startsWith('http') ? audioMedia.url : undefined);
  const localUri =
    message.local_uri
    || (audioMedia?.url && !audioMedia.url.startsWith('http') ? audioMedia.url : undefined);
  const audioFormat =
    audioMedia?.format
    || (audioMedia?.mime_type?.includes('webm') ? 'webm'
      : audioMedia?.mime_type?.includes('m4a') || audioMedia?.mime_type?.includes('mp4')
        ? 'm4a'
        : undefined)
    || (remoteUrl?.toLowerCase().includes('.webm') ? 'webm'
      : remoteUrl?.toLowerCase().includes('.m4a') || remoteUrl?.toLowerCase().includes('.mp4')
        ? 'm4a'
        : undefined);
  const audioMimeType = audioMedia?.mime_type
    || (audioFormat === 'webm' ? 'audio/webm' : audioFormat === 'm4a' ? 'audio/m4a' : undefined);
  const isAudioMessageType = message.message_type === 'audio' || audioMedia?.type === 'audio' || audioMedia?.type === 'voice';
  const shouldRenderAudio = isAudioMessageType && !isDeletedForEveryone && (!!remoteUrl || !!localUri);

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
  const getStatusDisplay = () => {
    if (isSending || message.status === 'sending') {
      return { icon: '\u23F3', color: theme.app.chatBubbleSentMeta, size: 9 };
    }

    if (message.status === 'failed') {
      return { icon: '\u274C', color: theme.app.chatStatusError, size: 9, hasRetry: true };
    }

    if (message.is_read) {
      return { icon: '\u2713\u2713', color: theme.app.warning, size: 9 };
    }

    if (message.status === 'sent' || !message.status) {
      return { icon: '\u2713', color: theme.app.chatBubbleSentMeta, size: 9 };
    }

    if (message.status === 'delivered') {
      return { icon: '\u2713\u2713', color: theme.app.chatBubbleSentMeta, size: 9 };
    }

    return { icon: '\u2713', color: theme.app.chatBubbleSentMeta, size: 9 };
  };

  const statusDisplay = getStatusDisplay();
  const isPropertyOffer = message.message_type === 'property_offer' && !!message.property_offer_id;
  return (
    <View style={[
      styles.messageRow,
      isOwnMessage ? styles.ownRow : styles.otherRow,
    ]}>
      <View style={[
        styles.bubbleContainer,
        shouldRenderAudio && styles.audioBubbleContainer,
        isOwnMessage ? styles.ownBubbleContainer : styles.otherBubbleContainer,
      ]}>
        <Animated.View
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
            isPropertyOffer && styles.propertyOfferBubble,
            !isPropertyOffer && !shouldRenderAudio && isShortMessage(displayContent) && styles.shortBubble,
            shouldRenderAudio && styles.audioBubble,
            isDeletedForEveryone && styles.deletedBubble,
            {
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {isPropertyOffer ? (
            <PropertyOfferMessage propertyId={message.property_offer_id!} />
          ) : shouldRenderAudio ? (
            <AudioPlayer
              remoteUrl={remoteUrl}
              duration={audioMedia?.duration}
              waveform={audioMedia?.waveform}
              isOwnMessage={isOwnMessage}
              uploadStatus={message.upload_status}
              uploadProgress={message.upload_progress}
              sentTime={formatMessageTime(message.created_at)}
              showDebug={__DEV__}
              format={audioFormat}
              mimeType={audioMimeType}
              statusIcon={isOwnMessage && !isDeletedForEveryone ? statusDisplay.icon : undefined}
              statusColor={isOwnMessage && !isDeletedForEveryone ? statusDisplay.color : undefined}
              statusSize={isOwnMessage && !isDeletedForEveryone ? statusDisplay.size : undefined}
              onRetry={onRetry ? () => onRetry(message.id) : undefined}
            />
          ) : (
            <Text style={[
              styles.text,
              isOwnMessage ? styles.ownText : styles.otherText,
              isDeletedForEveryone && styles.deletedText,
            ]}>
              {displayContent}
            </Text>
          )}

          {!shouldRenderAudio && (
            <View style={styles.footer}>
              <Text style={[
                styles.time,
                isOwnMessage ? styles.ownTime : styles.otherTime
              ]}>
                {formatMessageTime(message.created_at)}
              </Text>

              {isOwnMessage && !isDeletedForEveryone && statusDisplay.hasRetry ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => onRetry?.(message.id)}
                >
                  <Text style={[styles.statusIcon, { color: statusDisplay.color, fontSize: statusDisplay.size }]}>
                    {statusDisplay.icon}
                  </Text>
                </TouchableOpacity>
              ) : isOwnMessage && !isDeletedForEveryone ? (
                <Text style={[styles.statusIcon, { color: statusDisplay.color, fontSize: statusDisplay.size }]}>
                  {statusDisplay.icon}
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  // Message row
  messageRow: {
    width: '100%',
    marginVertical: 0,
    flexShrink: 1,
    flexDirection: 'row',
  },
  ownRow: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  
  // Bubble container
  bubbleContainer: {
    maxWidth: '100%',
  },
  ownBubbleContainer: {
    alignItems: 'flex-end',
    marginRight: 4,
    maxWidth: '88%',
  },
  otherBubbleContainer: {
    alignItems: 'flex-start',
    marginLeft: 4,
    maxWidth: '98%',
  },
  // Bubble styling - COMPACT VERSION
  bubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 12,
    minWidth: 0,
    maxWidth: '100%',
    marginBottom: 0,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column', // Ensures column layout
    
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
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
    backgroundColor: theme.app.chatBubbleSent,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: theme.app.chatBubbleReceived,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
  },
  deletedBubble: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  
  // Text styling
  text: {
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlign: 'left',
    ...Platform.select({
      android: { textAlignVertical: 'top' },
    }),
  },
  ownText: {
    color: theme.app.chatBubbleSentText,
  },
  otherText: {
    color: theme.app.chatBubbleReceivedText,
  },
  deletedText: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    fontSize: 13,
  },
  
  // Footer - COMPACT
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 0,
  },
  time: {
    fontSize: 11,
    opacity: 0.7,
  },
  ownTime: {
    color: theme.app.chatBubbleSentMeta,
  },
  otherTime: {
    color: theme.app.chatBubbleReceivedMeta,
  },
  statusIcon: {
    fontSize: 10,
    color: theme.app.chatBubbleSentMeta,
    marginLeft: 6,
  },
  retryButton: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: theme.app.overlayLight,
  },
  shortBubble: {
    paddingHorizontal: 12,
    minWidth: 0,
  },
  audioBubble: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  audioBubbleContainer: {
    width: '66%',
    maxWidth: '66%',
  },
  propertyOfferBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatBubble;

