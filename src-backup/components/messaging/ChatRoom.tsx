import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Avatar,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { defaultTheme } from '../../styles/theme';
import { Message, Conversation } from '../../types/database';

interface ChatRoomProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  loading?: boolean;
}

export default function ChatRoom({
  conversation,
  messages,
  onSendMessage,
  onLoadMore,
  loading = false,
}: ChatRoomProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const messageTime = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <Avatar.Text
            size={32}
            label="U"
            style={styles.messageAvatar}
          />
        )}
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownTime : styles.otherTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <Card style={styles.headerCard}>
      <Card.Content style={styles.headerContent}>
        <Avatar.Text size={40} label="U" style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Property Owner</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <IconButton icon="phone" size={24} onPress={() => Alert.alert('Coming Soon', 'Voice call feature will be available soon!')} />
        <IconButton icon="video" size={24} onPress={() => Alert.alert('Coming Soon', 'Video call feature will be available soon!')} />
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderHeader()}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        inverted={false}
        showsVerticalScrollIndicator={false}
      />

      <Divider />

      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.messageInput}
          multiline
          maxLength={1000}
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
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
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
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
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: defaultTheme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: defaultTheme.colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownText: {
    color: defaultTheme.colors.onPrimary,
  },
  otherText: {
    color: defaultTheme.colors.onSurface,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTime: {
    color: defaultTheme.colors.onPrimary,
    opacity: 0.8,
  },
  otherTime: {
    color: defaultTheme.colors.onSurfaceVariant,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: defaultTheme.colors.surface,
  },
  messageInput: {
    backgroundColor: defaultTheme.colors.surface,
  },
}); 