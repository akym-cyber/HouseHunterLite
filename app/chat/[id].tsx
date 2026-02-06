import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/hooks/useAuth';
import ChatRoom from '../../src/components/messaging/ChatRoom';
import { useTheme } from '../../src/theme/useTheme';
import { propertyHelpers, userHelpers } from '../../src/services/firebase/firebaseHelpers';
import { Conversation, Message, User, MessageMedia, VoiceUploadPayload } from '../../src/types/database';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../src/services/firebase/firebaseConfig';
import { confirmAction } from '../../src/components/chat/ConfirmationModal';
import { uploadVoiceMessage } from '../../src/services/firebase/voiceMessageService';
import * as FileSystem from 'expo-file-system/legacy';

const getOtherParticipantId = (conversation: Conversation, currentUserId?: string | null): string | null => {
  if (!currentUserId) return null;
  if (Array.isArray(conversation.participants) && conversation.participants.length > 0) {
    return conversation.participants.find(id => id !== currentUserId) || conversation.participants[0] || null;
  }
  if (conversation.participant1_id && conversation.participant2_id) {
    return conversation.participant1_id === currentUserId
      ? conversation.participant2_id
      : conversation.participant1_id;
  }
  return null;
};

const getUserNameParts = (profile?: User | null): { firstName: string; lastName: string } => {
  if (!profile) return { firstName: 'Unknown', lastName: 'User' };
  const first = profile.firstName?.trim() || '';
  const last = profile.lastName?.trim() || '';
  if (first || last) return { firstName: first || 'Unknown', lastName: last };
  if (profile.name && profile.name.trim()) {
    const parts = profile.name.trim().split(/\s+/);
    return { firstName: parts[0] || 'Unknown', lastName: parts.slice(1).join(' ') };
  }
  if (profile.email) {
    return { firstName: profile.email.split('@')[0], lastName: '' };
  }
  return { firstName: 'Unknown', lastName: 'User' };
};

const getAvatarUrl = (profile?: User | null): string | undefined => {
  return profile?.avatarUrl || profile?.photoURL || undefined;
};

export default function ChatScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { conversations, loading, sendMessage, deleteMessageForMe, deleteMessageForEveryone, markMessageAsRead } = useMessages();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [propertyRefs, setPropertyRefs] = useState<Property[]>([]);
  const uploadTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Find the conversation from the conversations list
  useEffect(() => {
    if (conversations.length > 0 && id) {
      const foundConversation = conversations.find(conv => conv.id === id);
      if (foundConversation) {
        setConversation(foundConversation);
      }
    }
  }, [conversations, id]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeUser: (() => void) | undefined;

    const loadOtherUser = async () => {
      if (!conversation || !user?.uid) {
        setOtherUser(null);
        return;
      }

      const otherId = getOtherParticipantId(conversation, user.uid);
      if (!otherId) {
        setOtherUser(null);
        return;
      }

      const result = await userHelpers.getUserById(otherId);
      if (!isMounted) return;

      if (result.data) {
        setOtherUser(result.data);
        const docId = result.data.id;
        if (docId) {
          const userRef = doc(db, 'users', docId);
          unsubscribeUser = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              setOtherUser({ id: snapshot.id, ...snapshot.data() } as User);
            }
          });
        }
      } else {
        setOtherUser(null);
      }
    };

    loadOtherUser();

    return () => {
      isMounted = false;
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [conversation, user?.uid]);

  useEffect(() => {
    if (!conversation?.id) return;

    setLoadingMessages(true);
    const messagesRef = collection(db, `conversations/${conversation.id}/messages`);
    const q = query(messagesRef, orderBy('created_at', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        conversation_id: conversation.id,
        ...doc.data(),
      } as Message));
      setChatMessages(liveMessages);
      setLoadingMessages(false);

      if (user?.uid && conversation?.id) {
        const unreadFromOther = liveMessages.filter(
          (msg) => msg.sender_id !== user.uid && !msg.is_read
        );
        if (unreadFromOther.length > 0) {
          unreadFromOther.forEach((msg) => {
            markMessageAsRead(conversation.id, msg.id).catch(() => {});
          });
        }
      }
    }, (snapshotError) => {
      console.error('Failed to listen to messages:', snapshotError);
      setLoadingMessages(false);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    });

    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    return () => {
      for (const timer of uploadTimersRef.current.values()) {
        clearInterval(timer);
      }
      uploadTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!conversation || !user?.uid) return;

    const otherId = getOtherParticipantId(conversation, user.uid);
    if (!otherId) {
      setPropertyRefs([]);
      return;
    }

    const relatedConversations = conversations.filter((conv) => {
      const convOther = getOtherParticipantId(conv, user.uid);
      return convOther === otherId;
    });

    const ids = Array.from(new Set(
      relatedConversations.flatMap((conv) => [
        ...(conv.propertyReferences || []),
        ...(conv.property_id ? [conv.property_id] : []),
      ])
    ));

    if (ids.length === 0) {
      setPropertyRefs([]);
      return;
    }

    let isMounted = true;
    Promise.all(ids.map((propertyId) => propertyHelpers.getPropertyById(propertyId)))
      .then((results) => {
        if (!isMounted) return;
        const refs = results
          .filter((result) => !!result.data)
          .map((result) => result.data!) as Property[];
        setPropertyRefs(refs);
      });

    return () => {
      isMounted = false;
    };
  }, [conversation, conversations, user?.uid]);

  // Handle sending a message
  const handleSendMessage = async (content: string, replyTo?: string, media?: any[], messageType?: Message['message_type'], propertyOfferId?: string) => {
    if (!conversation || !user?.uid) return;

    const trimmed = content.trim();
    const hasMedia = !!(media && media.length > 0);
    if (!trimmed && !hasMedia && !propertyOfferId) return;

    const resolvedMessageType = messageType
      || (media?.[0]?.type === 'image' ? 'image'
        : media?.[0]?.type === 'audio' || media?.[0]?.type === 'voice' ? 'audio'
        : media?.[0]?.type === 'document' ? 'file'
        : undefined)
      || (propertyOfferId ? 'property_offer' : 'text');

    const fallbackContent = resolvedMessageType === 'audio'
      ? 'Voice message'
      : resolvedMessageType === 'image'
        ? 'Photo'
        : hasMedia
          ? 'Attachment'
          : '';

    try {
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_id: user.uid,
        content: trimmed || fallbackContent,
        message_type: resolvedMessageType,
        is_read: false,
        created_at: new Date().toISOString(),
        status: 'sending',
        property_offer_id: propertyOfferId,
      };

      setChatMessages(prev => [...prev, optimisticMessage]);

      const result = await sendMessage({
        conversationId: conversation.id,
        content: trimmed || fallbackContent,
        messageType: resolvedMessageType,
        attachmentUrl: media?.[0]?.url, // Handle media if provided
        media,
        propertyOfferId,
      });

      if (!result.success) {
        setChatMessages(prev =>
          prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
        );
        Alert.alert('Error', result.error || 'Failed to send message');
        return;
      }

      if (result.data) {
        setChatMessages(prev =>
          prev.map(msg => msg.id === tempId ? { ...result.data, status: 'sent' } : msg)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev =>
        prev.map(msg => msg.status === 'sending' ? { ...msg, status: 'failed' } : msg)
      );
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const updateMessageById = useCallback((id: string, updater: (msg: Message) => Message) => {
    setChatMessages(prev => prev.map(msg => msg.id === id ? updater(msg) : msg));
  }, []);

  const startProgress = useCallback((messageId: string) => {
    if (uploadTimersRef.current.has(messageId)) return;
    let progress = 0.05;
    const timer = setInterval(() => {
      progress = Math.min(progress + 0.08, 0.9);
      updateMessageById(messageId, msg => ({ ...msg, upload_progress: progress }));
    }, 400);
    uploadTimersRef.current.set(messageId, timer);
  }, [updateMessageById]);

  const stopProgress = useCallback((messageId: string) => {
    const timer = uploadTimersRef.current.get(messageId);
    if (timer) {
      clearInterval(timer);
      uploadTimersRef.current.delete(messageId);
    }
  }, []);

  const performVoiceUpload = useCallback(async (
    messageId: string,
    voiceData: VoiceUploadPayload
  ) => {
    if (!conversation || !user?.uid) return;
    startProgress(messageId);

    try {
      const upload = await uploadVoiceMessage({
        uri: voiceData.uri,
        blob: voiceData.blob,
        format: voiceData.format,
        mimeType: voiceData.mimeType,
        conversationId: conversation.id,
        userId: user.uid,
      });

      stopProgress(messageId);

      if (!upload.success || !upload.url) {
        throw new Error(upload.error || 'Voice upload failed');
      }

      updateMessageById(messageId, msg => ({
        ...msg,
        upload_status: 'uploaded',
        upload_progress: 1,
        attachment_url: upload.url,
        media: [{
          id: `${messageId}-media`,
          type: 'audio',
          url: upload.url,
          duration: voiceData.duration,
          waveform: voiceData.waveform,
          file_size: upload.size || 0,
          mime_type: voiceData.mimeType,
          format: voiceData.format,
        }],
      }));

      const remoteMedia: MessageMedia[] = [{
        id: `${messageId}-media`,
        type: 'audio',
        url: upload.url,
        duration: voiceData.duration,
        waveform: voiceData.waveform,
        file_size: upload.size || 0,
        mime_type: voiceData.mimeType,
        format: voiceData.format,
      }];

      const result = await sendMessage({
        conversationId: conversation.id,
        content: 'Voice message',
        messageType: 'audio',
        attachmentUrl: upload.url,
        media: remoteMedia,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to send voice message');
      }

      updateMessageById(messageId, () => ({
        ...result.data!,
        status: 'sent',
      }));

      if (Platform.OS !== 'web') {
        FileSystem.deleteAsync(voiceData.uri, { idempotent: true }).catch(() => {});
      }
    } catch (error: any) {
      stopProgress(messageId);
      updateMessageById(messageId, msg => ({
        ...msg,
        upload_status: 'failed',
        status: 'failed',
        retry_count: (msg.retry_count || 0) + 1,
      }));
      Alert.alert('Error', error?.message || 'Failed to send voice message. Tap to retry.');
    }
  }, [conversation, user?.uid, sendMessage, startProgress, stopProgress, updateMessageById]);

  const handleSendVoiceMessage = useCallback(async (voiceData: VoiceUploadPayload) => {
    if (!conversation || !user?.uid) return;

    const tempId = `voice-${Date.now()}`;
    const optimisticMedia: MessageMedia[] = [{
      id: `${tempId}-media`,
      type: 'audio',
      url: voiceData.uri,
      duration: voiceData.duration,
      waveform: voiceData.waveform,
      mime_type: voiceData.mimeType,
      format: voiceData.format,
    }];

    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: user.uid,
      content: 'Voice message',
      message_type: 'audio',
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending',
      upload_status: 'uploading',
      upload_progress: 0.02,
      local_uri: voiceData.uri,
      media: optimisticMedia,
      retry_count: 0,
    };

    setChatMessages(prev => [...prev, optimisticMessage]);
    await performVoiceUpload(tempId, voiceData);
  }, [conversation, user?.uid, performVoiceUpload]);

  const handleRetryVoice = useCallback(async (message: Message) => {
    if (!message.local_uri || !conversation || !user?.uid) return;
    if ((message.retry_count || 0) >= 3) {
      Alert.alert('Retry limit reached', 'Please record a new voice message.');
      return;
    }

    updateMessageById(message.id, msg => ({
      ...msg,
      upload_status: 'uploading',
      upload_progress: 0.02,
      status: 'sending',
    }));

    const existingMedia = message.media?.[0];
    const fallbackFormat = existingMedia?.format
      || (existingMedia?.mime_type?.includes('webm') ? 'webm' : 'm4a');
    const fallbackMime = existingMedia?.mime_type
      || (fallbackFormat === 'webm' ? 'audio/webm' : 'audio/m4a');

    await performVoiceUpload(message.id, {
      uri: message.local_uri,
      duration: existingMedia?.duration || 0,
      waveform: existingMedia?.waveform || [],
      format: fallbackFormat as 'm4a' | 'webm',
      mimeType: fallbackMime,
    });
  }, [conversation, user?.uid, updateMessageById, performVoiceUpload]);

  // Handle loading more messages (pagination)
  const handleLoadMore = async () => {
    // TODO: Implement pagination if needed
    console.log('Load more messages requested');
  };

  const handleSendPropertyOffer = async (propertyId: string) => {
    if (!conversation) return;
    await handleSendMessage('Property offer', undefined, undefined, 'property_offer', propertyId);
  };

  const handleDeleteMessageForMe = async (message: Message) => {
    if (!user?.uid || !conversation) return;

    const result = await deleteMessageForMe(conversation.id, message.id, user.uid);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to delete message');
    } else {
      setChatMessages(prev => prev.filter(item => item.id !== message.id));
    }
  };

  const handleDeleteMessageForEveryone = async (message: Message) => {
    if (!user?.uid || !conversation) return;

    confirmAction({
      title: 'Delete Message',
      message: 'Delete this message for everyone? This cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        const result = await deleteMessageForEveryone(conversation.id, message.id, user.uid);
        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to delete message');
          return;
        }
        setChatMessages(prev =>
          prev.map(item =>
            item.id === message.id
              ? { ...item, deleted_for_everyone: true, deleted_by: user.uid, content: '' }
              : item
          )
        );
      },
    });
  };

  // Show loading while conversation is being fetched
  if (!conversation && loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  // Show error if conversation not found
  if (!conversation && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>💬</Text>
          <Text style={styles.errorTitle}>Conversation Not Found</Text>
          <Text style={styles.errorText}>
            The conversation you're looking for doesn't exist or has been deleted.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  // Show loading while messages are being fetched
  if (loadingMessages) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  const otherId = conversation && user?.uid ? getOtherParticipantId(conversation, user.uid) : null;
  const nameParts = getUserNameParts(otherUser);
  const avatarUrl = getAvatarUrl(otherUser);
  const lastSeen = otherUser?.lastSeen || otherUser?.updatedAt || otherUser?.createdAt;

  return (
    <View style={styles.container}>
      <ChatRoom
        key={`chatroom-${conversation.id}-${user?.uid || 'guest'}`}
        conversation={conversation!}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        onLoadMore={handleLoadMore}
        loading={loadingMessages}
        onBack={() => router.back()}
        onDeleteMessageForMe={handleDeleteMessageForMe}
        onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
        onSendVoiceMessage={handleSendVoiceMessage}
        onRetryVoice={handleRetryVoice}
        otherUser={otherId ? {
          id: otherId,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          avatarUrl,
          isOnline: otherUser?.isOnline ?? false,
          lastSeen,
        } : undefined}
        propertyReferences={propertyRefs}
        onPropertyPress={(propertyId) => router.push(`/property/${propertyId}`)}
        onSendPropertyOffer={handleSendPropertyOffer}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});
