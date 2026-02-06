import { useState, useEffect, useCallback, useRef } from 'react';
import { messageHelpers } from '../services/firebase/messageHelpers';
import { Message, Conversation, Inquiry, MessageMedia } from '../types/database';
import { useAuth } from './useAuth';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

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

  // Add console logs for returns
  console.log('[useMessages] returning:', {
    conversationsCount: state.conversations.length,
    loading: state.loading,
    error: state.error,
    unreadCount,
    isOnline
  });

  // Real-time conversation listener
  useEffect(() => {
    if (!user) {
      console.log('[useMessages] No user, skipping conversation listener');
      return;
    }

    console.log('[useMessages] Setting up conversation listener for user:', user.uid);
    setState(prev => ({ ...prev, loading: true, error: null }));

    const conversationsRef = collection(db, 'conversations');

    // Listen for conversations where user is in participants array
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid),
      orderBy('last_message_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[useMessages] conversations snapshot received, docs count:', snapshot.docs.length);

      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Conversation));

      console.log('[useMessages] conversations:', conversations.map(c => ({ id: c.id, participants: c.participants })));

      // Validate participants arrays
      conversations.forEach(conv => {
        if (!conv.participants || !Array.isArray(conv.participants)) {
          console.warn('[useMessages] Conversation missing valid participants array:', conv.id, conv.participants);
        }
      });

      // Sort conversations by last message time
      conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      console.log('[useMessages] sorted conversations count:', conversations.length);

      // Calculate unread count (conversations < 1 hour old)
      const unread = conversations.filter(conv =>
        new Date().getTime() - new Date(conv.last_message_at).getTime() < (1000 * 60 * 60)
      ).length;

      setUnreadCount(unread);
      setState(prev => ({
        ...prev,
        conversations: conversations,
        loading: false,
        error: null,
      }));
    }, (error) => {
      console.error('[useMessages] Real-time conversations error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load conversations',
      }));
    });

    return unsubscribe;
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
    const checkConnection = async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD' });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
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
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.addMessage({
        conversation_id: messageData.conversationId,
        sender_id: user.uid,
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
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const resolvedOwnerId = user.role === 'owner' ? user.uid : otherUserId;

      const existingByOwner = await messageHelpers.findConversationByOwnerAndParticipants(
        resolvedOwnerId,
        user.uid,
        otherUserId
      );

      if (existingByOwner.data) {
        await messageHelpers.addConversationPropertyReference(existingByOwner.data.id, propertyId);
        return { success: true, data: existingByOwner.data };
      }

      const result = await messageHelpers.createConversation({
        property_id: propertyId,
        ownerId: resolvedOwnerId,
        propertyReferences: [propertyId],
        participants: [user.uid, otherUserId],
        createdBy: user.uid, // Track who created the conversation
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
      return { success: false, error: 'Failed to create conversation' };
    }
  };

  const findConversationByProperty = async (propertyId: string, otherUserId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.findConversationByOwnerAndParticipants(
        otherUserId,
        user.uid,
        otherUserId
      );

      if (!result.data) {
        const fallback = await messageHelpers.findConversationByPropertyAndParticipants(
          propertyId,
          user.uid,
          otherUserId
        );
        return { success: true, data: fallback.data };
      }

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to find conversation' };
    }
  };

  const findConversationByOwner = async (ownerId: string, otherUserId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await messageHelpers.findConversationByOwnerAndParticipants(
        ownerId,
        user.uid,
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

