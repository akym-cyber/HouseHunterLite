import { useState, useEffect, useCallback } from 'react';
import { messageHelpers } from '../services/firebase/messageHelpers';
import { Message, Conversation, Inquiry } from '../types/database';
import { useAuth } from './useAuth';
import { collection, query, where, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
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
  messageType?: 'text' | 'image' | 'file' | 'location';
  attachmentUrl?: string;
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

  // Real-time conversation listener
  useEffect(() => {
    if (!user) {
      console.log('🔍 useMessages: No user, skipping conversation listener');
      return;
    }

    console.log('🔍 useMessages: Setting up conversation listener for user:', user.id);
    setState(prev => ({ ...prev, loading: true, error: null }));

    const conversationsRef = collection(db, 'conversations');

    // Listen for conversations where user is participant1
    const q1 = query(
      conversationsRef,
      where('participant1_id', '==', user.id),
      orderBy('last_message_at', 'desc')
    );

    // Listen for conversations where user is participant2
    const q2 = query(
      conversationsRef,
      where('participant2_id', '==', user.id),
      orderBy('last_message_at', 'desc')
    );

    const unsubscribe1 = onSnapshot(q1, (snapshot1) => {
      console.log('🔍 useMessages: participant1 snapshot received, docs count:', snapshot1.docs.length);
      const unsubscribe2 = onSnapshot(q2, (snapshot2) => {
        console.log('🔍 useMessages: participant2 snapshot received, docs count:', snapshot2.docs.length);

        const conversations1 = snapshot1.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Conversation));

        const conversations2 = snapshot2.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Conversation));

        console.log('🔍 useMessages: conversations1:', conversations1);
        console.log('🔍 useMessages: conversations2:', conversations2);

        // Combine and sort conversations
        const allConversations = [...conversations1, ...conversations2]
          .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        console.log('🔍 useMessages: allConversations count:', allConversations.length);

        // Calculate unread count (conversations < 1 hour old)
        const unread = allConversations.filter(conv =>
          new Date().getTime() - new Date(conv.last_message_at).getTime() < (1000 * 60 * 60)
        ).length;

        setUnreadCount(unread);
        setState(prev => ({
          ...prev,
          conversations: allConversations,
          loading: false,
          error: null,
        }));
      });

      return unsubscribe2;
    }, (error) => {
      console.error('🔍 useMessages: Real-time conversations error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load conversations',
      }));
    });

    return () => unsubscribe1();
  }, [user]);

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

      const result = await messageHelpers.getConversationsByUser(user!.id);

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
        sender_id: user.id,
        content: messageData.content,
        message_type: messageData.messageType || 'text',
        attachment_url: messageData.attachmentUrl,
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

      const result = await messageHelpers.createConversation({
        property_id: propertyId,
        participant1_id: user.id,
        participant2_id: otherUserId,
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
        tenant_id: user.id,
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

  const markMessageAsRead = async (messageId: string) => {
    try {
      const result = await messageHelpers.markMessageAsRead(messageId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Update the message in the current messages list
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        ),
      }));

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to mark message as read' };
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
    sendInquiry,
    markMessageAsRead,
    refreshConversations,
    clearMessages,
  };
};
