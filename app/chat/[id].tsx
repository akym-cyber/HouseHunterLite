import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, Button, Card } from 'react-native-paper';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/hooks/useAuth';
import ChatRoom from '../../src/components/messaging/ChatRoom';
import { defaultTheme } from '../../src/styles/theme';
import { Conversation, Message } from '../../src/types/database';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { conversations, messages, loading, error, fetchMessages, sendMessage } = useMessages();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Find the conversation from the conversations list
  useEffect(() => {
    if (conversations.length > 0 && id) {
      const foundConversation = conversations.find(conv => conv.id === id);
      if (foundConversation) {
        setConversation(foundConversation);
      }
    }
  }, [conversations, id]);

  // Fetch messages when conversation is found
  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!conversation?.id || !id || !isMounted) return;

      setLoadingMessages(true);
      try {
        const result = await fetchMessages(id);
        if (isMounted && result.success && result.data) {
          setChatMessages(result.data);
        } else if (isMounted && result.error) {
          console.error('Failed to fetch messages:', result.error);
          Alert.alert('Error', 'Failed to load messages. Please try again.');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching messages:', error);
          Alert.alert('Error', 'Failed to load messages. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversation?.id, id]); // Only depend on IDs, fetchMessages is stable

  // Handle sending a message
  const handleSendMessage = async (content: string, replyTo?: string, media?: any[]) => {
    if (!conversation || !content.trim()) return;

    try {
      const result = await sendMessage({
        conversationId: conversation.id,
        content: content.trim(),
        messageType: 'text',
        attachmentUrl: media?.[0]?.url, // Handle media if provided
      });

      if (result.success && result.data) {
        // Add the new message to the current messages
        setChatMessages(prev => [...prev, result.data!]);
      } else {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Handle loading more messages (pagination)
  const handleLoadMore = async () => {
    // TODO: Implement pagination if needed
    console.log('Load more messages requested');
  };

  // Show loading while conversation is being fetched
  if (!conversation && loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
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
          <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatRoom
        conversation={conversation!}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        onLoadMore={handleLoadMore}
        loading={loadingMessages}
        otherUser={{
          id: conversation!.participant1_id === user?.id ? conversation!.participant2_id : conversation!.participant1_id,
          firstName: 'Property', // TODO: Fetch actual user data
          lastName: 'Owner',
          isOnline: false, // TODO: Implement online status
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
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
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});
