import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Avatar,
  Divider,
  Button,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/hooks/useAuth';
import { defaultTheme } from '../../src/styles/theme';
import { Conversation } from '../../src/types/database';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { conversations, loading, error, refreshConversations } = useMessages();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    // TODO: Navigate to chat room
    Alert.alert('Coming Soon', 'Chat room will be available soon!');
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Card
      style={styles.conversationCard}
      onPress={() => handleConversationPress(item)}
    >
      <Card.Content style={styles.conversationContent}>
        <Avatar.Text
          size={50}
          label="U"
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <Title style={styles.conversationName}>Property Owner</Title>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            Tap to start chatting
          </Text>
          <Text style={styles.conversationTime}>
            {new Date(item.last_message_at).toLocaleDateString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Messages</Title>
      </View>
      {/* Scrollable Messages List */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.messagesList} 
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⏳</Text>
            <Title style={styles.emptyTitle}>Loading...</Title>
            <Text style={styles.emptyText}>
              Fetching your conversations
            </Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Title style={styles.emptyTitle}>No Messages Yet</Title>
            <Text style={styles.emptyText}>
              Start a conversation with property owners by viewing properties
            </Text>
            <Button
              mode="outlined"
              onPress={() => router.push('/(tabs)/search')}
              style={styles.emptyButton}
            >
              Browse Properties
            </Button>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.conversationList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: defaultTheme.colors.primary,
  },
  headerTitle: {
    color: defaultTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  conversationList: {
    padding: 20,
  },
  conversationCard: {
    marginBottom: 12,
    elevation: 1,
    borderRadius: 8,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    marginRight: 16,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationPreview: {
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
  },
  emptyButton: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  messagesList: {
    padding: 20,
  },
}); 