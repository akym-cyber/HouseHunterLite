import { useState, useEffect, useCallback, useRef } from 'react';
import { messageHelpers } from '../services/firebase/messageHelpers';
import { Message, Conversation, Inquiry, MessageMedia } from '../types/database';
import { useAuth } from './useAuth';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../services/firebase/firebaseConfig';
import NetInfo from '@react-native-community/netinfo';

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  loading: boolean;
  error: string | null;
}

interface SendMessageData {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'location' | 'property_offer' | 'audio';
  attachmentUrl?: string;
  media?: MessageMedia[];
  propertyOfferId?: string;
}

const toTimestampMs = (value: any): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000 + ((value.nanoseconds || 0) / 1000000);
  }
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
};

const normalizeConversationShape = (docId: string, data: any): Conversation => {
  const participantsFromArray = Array.isArray(data?.participants)
    ? data.participants.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const participantsFromParticipantIds = Array.isArray(data?.participantIds)
    ? data.participantIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];

  const participant1 = typeof data?.participant1_id === 'string' ? data.participant1_id : undefined;
  const participant2 = typeof data?.participant2_id === 'string' ? data.participant2_id : undefined;

  const mergedParticipants = Array.from(
    new Set([
      ...participantsFromArray,
      ...participantsFromParticipantIds,
      ...(participant1 ? [participant1] : []),
      ...(participant2 ? [participant2] : []),
    ])
  );

  return {
    id: docId,
    ...data,
    participants: mergedParticipants,
    participant1_id: participant1,
    participant2_id: participant2,
    last_message_at:
      data?.last_message_at ??
      data?.lastMessageAt ??
      data?.updatedAt ??
      data?.created_at ??
      data?.createdAt ??
      new Date().toISOString(),
  } as Conversation;
};

export const useMessages = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MessagesState>({
    conversations: [],
    messages: [],
    loading: true,
    error: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const deliveryListenersRef = useRef<Map<string, () => void>>(new Map());

  // Real-time conversation listener
  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, conversations: [], loading: false, error: null }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const conversationsRef = collection(db, 'conversations');
    const participantsQuery = query(conversationsRef, where('participants', 'array-contains', user.uid));
    const participantIdsQuery = query(conversationsRef, where('participantIds', 'array-contains', user.uid));
    const participant1Query = query(conversationsRef, where('participant1_id', '==', user.uid));
    const participant2Query = query(conversationsRef, where('participant2_id', '==', user.uid));

    let fromParticipants: Conversation[] = [];
    let fromParticipantIds: Conversation[] = [];
    let fromParticipant1: Conversation[] = [];
    let fromParticipant2: Conversation[] = [];
    let failedListeners = 0;

    const emitMergedConversations = () => {
      const mergedById = new Map<string, Conversation>();
      [...fromParticipants, ...fromParticipantIds, ...fromParticipant1, ...fromParticipant2].forEach((conversation) => {
        mergedById.set(conversation.id, conversation);
      });

      const merged = Array.from(mergedById.values()).sort(
        (a, b) => toTimestampMs(b.last_message_at) - toTimestampMs(a.last_message_at)
      );

      const unread = merged.filter((conv) => {
        const lastMessageAtMs = toTimestampMs(conv.last_message_at);
        return lastMessageAtMs > 0 && (Date.now() - lastMessageAtMs) < (1000 * 60 * 60);
      }).length;

      setUnreadCount(unread);
      setState(prev => ({
        ...prev,
        conversations: merged,
        loading: false,
        error: null,
      }));
    };

    const logListenerError = (label: string, error: unknown) => {
      console.error(`[useMessages] Conversation listener error (${label}):`, error);
      failedListeners += 1;
      if (failedListeners >= 3) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load conversations',
        }));
      }
    };

    const unsubscribeParticipants = onSnapshot(
      participantsQuery,
      (snapshot) => {
        fromParticipants = snapshot.docs.map((docSnap) =>
          normalizeConversationShape(docSnap.id, docSnap.data())
        );
        emitMergedConversations();
      },
      (error) => {
        logListenerError('participants', error);
      }
    );

    const unsubscribeParticipantIds = onSnapshot(
      participantIdsQuery,
      (snapshot) => {
        fromParticipantIds = snapshot.docs.map((docSnap) =>
          normalizeConversationShape(docSnap.id, docSnap.data())
        );
        emitMergedConversations();
      },
      (error) => {
        logListenerError('participantIds', error);
      }
    );

    const unsubscribeParticipant1 = onSnapshot(
      participant1Query,
      (snapshot) => {
        fromParticipant1 = snapshot.docs.map((docSnap) =>
          normalizeConversationShape(docSnap.id, docSnap.data())
        );
        emitMergedConversations();
      },
      (error) => {
        logListenerError('participant1_id', error);
      }
    );

    const unsubscribeParticipant2 = onSnapshot(
      participant2Query,
      (snapshot) => {
        fromParticipant2 = snapshot.docs.map((docSnap) =>
          normalizeConversationShape(docSnap.id, docSnap.data())
        );
        emitMergedConversations();
      },
      (error) => {
        logListenerError('participant2_id', error);
      }
    );

    return () => {
      unsubscribeParticipants();
      unsubscribeParticipantIds();
      unsubscribeParticipant1();
      unsubscribeParticipant2();
    };
  }, [user]);


  // Delivery receipts: mark inbound messages as delivered when receiver's app is active
  useEffect(() => {
    if (!user?.uid) return;

    const activeConversationIds = new Set(state.conversations.map(conv => conv.id));

    // Remove listeners for conversations no longer active
    for (const [convId, unsubscribe] of deliveryListenersRef.current.entries()) {
      if (!activeConversationIds.has(convId)) {
        unsubscribe();
        deliveryListenersRef.current.delete(convId);
      }
    }

    // Add listeners for new conversations
    state.conversations.forEach((conv) => {
      if (deliveryListenersRef.current.has(conv.id)) return;

      const messagesRef = collection(db, `conversations/${conv.id}/messages`);
      const q = query(messagesRef, orderBy('created_at', 'desc'), limit(25));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Message;
          if (data.sender_id !== user.uid && data.status !== 'delivered' && data.status !== 'read') {
            messageHelpers.markMessageAsDelivered(conv.id, docSnap.id).catch(() => {});
          }
        });
      });

      deliveryListenersRef.current.set(conv.id, unsubscribe);
    });

    return () => {
      for (const unsubscribe of deliveryListenersRef.current.values()) {
        unsubscribe();
      }
      deliveryListenersRef.current.clear();
    };
  }, [state.conversations, user?.uid]);
  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      setIsOnline(!!netState.isConnected);
    });

    NetInfo.fetch()
      .then((netState) => {
        setIsOnline(!!netState.isConnected);
      })
      .catch(() => {
        setIsOnline(false);
      });

    return () => unsubscribe();
  }, []);

  const fetchConversations = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await messageHelpers.getConversationsByUser(user!.uid);

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
        return { success: false, error: result.error };
      }

      setState(prev => ({
        ...prev,
        conversations: result.data || [],
        loading: false,
      }));

      return { success: true, data: result.data };
    } catch (error: any) {
      const errorMessage = 'Failed to fetch conversations';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await messageHelpers.getMessagesByConversation(conversationId);

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
        return { success: false, error: result.error };
      }

      setState(prev => ({
        ...prev,
        messages: result.data || [],
        loading: false,
      }));

      return { success: true, data: result.data };
    } catch (error: any) {
      const errorMessage = 'Failed to fetch messages';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const sendMessage = async (messageData: SendMessageData) => {
    try {
      const activeUserId = user?.uid ?? auth.currentUser?.uid;
      if (!activeUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.addMessage({
        conversation_id: messageData.conversationId,
        sender_id: activeUserId,
        content: messageData.content,
        message_type: messageData.messageType || 'text',
        attachment_url: messageData.attachmentUrl,
        media: messageData.media,
        property_offer_id: messageData.propertyOfferId,
        is_read: false,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Add the new message to the current messages list
      if (result.data) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, result.data!],
        }));
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to send message' };
    }
  };

  const createConversation = async (propertyId: string, otherUserId: string) => {
    try {
      const activeUserId = user?.uid ?? auth.currentUser?.uid;
      if (!activeUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      const resolvedOwnerId = user?.role === 'owner' ? activeUserId : otherUserId;

      let existingByOwner: { data: any; error: string | null } = { data: null, error: null };
      try {
        existingByOwner = await messageHelpers.findConversationByOwnerAndParticipants(
          resolvedOwnerId,
          activeUserId,
          otherUserId
        );
      } catch (lookupError: any) {
        console.warn('[useMessages] Owner conversation lookup failed, continuing with create flow:', lookupError?.message || lookupError);
      }

      if (existingByOwner.data) {
        await messageHelpers.addConversationPropertyReference(existingByOwner.data.id, propertyId);
        return { success: true, data: existingByOwner.data };
      }

      let existingByProperty: { data: any; error: string | null } = { data: null, error: null };
      try {
        existingByProperty = await messageHelpers.findConversationByPropertyAndParticipants(
          propertyId,
          activeUserId,
          otherUserId
        );
      } catch (lookupError: any) {
        console.warn('[useMessages] Property conversation lookup failed, continuing with create flow:', lookupError?.message || lookupError);
      }

      if (existingByProperty.data) {
        return { success: true, data: existingByProperty.data };
      }

      const result = await messageHelpers.createConversation({
        property_id: propertyId,
        ownerId: resolvedOwnerId,
        propertyReferences: [propertyId],
        participants: [activeUserId, otherUserId],
        createdBy: activeUserId, // Track who created the conversation
        last_message_at: new Date().toISOString(),
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Add the new conversation to the list
      if (result.data) {
        setState(prev => ({
          ...prev,
          conversations: [result.data!, ...prev.conversations],
        }));
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[useMessages] createConversation failed:', error);
      return { success: false, error: error?.message || 'Failed to create conversation' };
    }
  };

  const findConversationByProperty = async (propertyId: string, otherUserId: string) => {
    try {
      const activeUserId = user?.uid ?? auth.currentUser?.uid;
      if (!activeUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Prefer exact property-matched conversations first so Contact Owner
      // opens the existing thread for this listing instead of a different owner thread.
      const byProperty = await messageHelpers.findConversationByPropertyAndParticipants(
        propertyId,
        activeUserId,
        otherUserId
      );

      if (byProperty.error) {
        return { success: false, error: byProperty.error };
      }

      if (byProperty.data) {
        return { success: true, data: byProperty.data };
      }

      const fallback = await messageHelpers.findConversationByOwnerAndParticipants(
        otherUserId,
        activeUserId,
        otherUserId
      );

      if (fallback.error) {
        return { success: false, error: fallback.error };
      }

      return { success: true, data: fallback.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to find conversation' };
    }
  };

  const findConversationByOwner = async (ownerId: string, otherUserId: string) => {
    try {
      const activeUserId = user?.uid ?? auth.currentUser?.uid;
      if (!activeUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.findConversationByOwnerAndParticipants(
        ownerId,
        activeUserId,
        otherUserId
      );

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to find conversation' };
    }
  };

  const sendInquiry = async (inquiryData: {
    propertyId: string;
    ownerId: string;
    subject: string;
    message: string;
    moveInDate?: string;
    budget?: number;
  }) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.addInquiry({
        property_id: inquiryData.propertyId,
        tenant_id: user.uid,
        owner_id: inquiryData.ownerId,
        subject: inquiryData.subject,
        message: inquiryData.message,
        move_in_date: inquiryData.moveInDate,
        budget: inquiryData.budget,
        status: 'pending',
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to send inquiry' };
    }
  };

  const markMessageAsRead = async (conversationId: string, messageId: string) => {
    try {
      const result = await messageHelpers.markMessageAsRead(conversationId, messageId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Update the message in the current messages list
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true, status: 'read' } : msg
        ),
      }));

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to mark message as read' };
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const result = await messageHelpers.deleteConversation(conversationId);
      if (result.error) {
        return { success: false, error: result.error };
      }

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(conv => conv.id !== conversationId),
        messages: prev.messages.filter(msg => msg.conversation_id !== conversationId),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to delete conversation' };
    }
  };

  const deleteMessageForMe = async (conversationId: string, messageId: string, userId: string) => {
    try {
      const result = await messageHelpers.deleteMessageForMe(conversationId, messageId, userId);
      if (result.error) {
        return { success: false, error: result.error };
      }

      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to delete message' };
    }
  };

  const deleteMessageForEveryone = async (conversationId: string, messageId: string, userId: string) => {
    try {
      const result = await messageHelpers.deleteMessageForEveryone(conversationId, messageId, userId);
      if (result.error) {
        return { success: false, error: result.error };
      }

      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, deleted_for_everyone: true, deleted_by: userId, content: '' }
            : msg
        ),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to delete message' };
    }
  };

  const refreshConversations = async () => {
    return await fetchConversations();
  };

  const clearMessages = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  return {
    conversations: state.conversations,
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    unreadCount,
    isOnline,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    findConversationByProperty,
    findConversationByOwner,
    sendInquiry,
    markMessageAsRead,
    deleteConversation,
    deleteMessageForMe,
    deleteMessageForEveryone,
    refreshConversations,
    clearMessages,
  };
};

