import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Title,
  Avatar,
  Divider,
  Button,
  Searchbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { auth } from '../../src/services/firebase/firebaseConfig';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/hooks/useAuth';
import { defaultTheme } from '../../src/styles/theme';
import { Conversation } from '../../src/types/database';
import { SafeAreaView } from 'react-native-safe-area-context';

// Utility function to format timestamps
const formatTimestamp = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMs = now.getTime() - messageTime.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return messageTime.toLocaleDateString();
  }
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const { conversations, loading, error, refreshConversations, unreadCount, isOnline } = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authCheckDone, setAuthCheckDone] = useState(false);

  // 🔍 COMPREHENSIVE DEBUGGING
  useEffect(() => {
    console.log('🔍 ===== MESSAGES SCREEN DEBUG =====');
    console.log('🔍 User:', user);
    console.log('🔍 User UID:', user?.uid);
    console.log('🔍 Loading:', loading);
    console.log('🔍 Error:', error);
    console.log('🔍 Conversations COUNT:', conversations?.length);
    console.log('🔍 Conversations DATA:', conversations);
    console.log('🔍 Conversations RAW:', JSON.stringify(conversations, null, 2));

    // Check if it's an array
    console.log('🔍 Is Array?:', Array.isArray(conversations));

    // Check if empty array or null/undefined
    if (conversations && Array.isArray(conversations)) {
      console.log('🔍 First conversation:', conversations[0]);
      console.log('🔍 All IDs:', conversations.map(c => c?.id));
    }

    console.log('🔍 Unread Count:', unreadCount);
    console.log('🔍 Is Online:', isOnline);
    console.log('🔍 ===== END DEBUG =====');
  }, [conversations, loading, error, user]);

  // 🔍 DEBUG: Check what useAuth() returns
  useEffect(() => {
    console.log('🔍 DEBUG - useAuth() user object:', {
      hasUser: !!user,
      user: user,
      userEmail: user?.email,
      userUid: user?.uid,
      allKeys: user ? Object.keys(user) : 'no user'
    });

    // Check if it's actually Firebase auth issue
    console.log('🔍 Firebase auth currentUser:', auth.currentUser);
  }, [user]);

  // Auth check timeout protection
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckDone(true);
      console.log('⏰ Auth check timeout reached');
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("📱 Messages Screen - User:", user?.uid);
    console.log("📱 Conversations count:", conversations?.length || 0);
    console.log("📱 Conversations data:", conversations);
    console.log("📱 Error:", error);
    console.log("📱 Loading:", loading);
    console.log("📱 Search query:", searchQuery);
  }, [conversations, error, loading, searchQuery]);

  useEffect(() => {
    const filtered = conversations.filter(conversation => {
      if (!searchQuery) return true;
      return conversation.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (conversation.property_id && conversation.property_id.toLowerCase().includes(searchQuery.toLowerCase()));
    });
    console.log("📱 Filtered conversations count:", filtered?.length || 0);
  }, [conversations, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    // Since we don't have user names yet, we'll filter by conversation ID or property ID
    return conversation.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (conversation.property_id && conversation.property_id.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleConversationPress = (conversation: Conversation) => {
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    try {
      // Validate conversation data
      if (!item || !item.id) {
        console.error('Invalid conversation item:', item);
        return null;
      }

      // For now, assume conversations are unread if less than 1 hour old
      const lastMessageTime = item.last_message_at ? new Date(item.last_message_at).getTime() : 0;
      const isUnread = !isNaN(lastMessageTime) && (new Date().getTime() - lastMessageTime) < (1000 * 60 * 60);

      return (
        <TouchableOpacity
          style={[styles.conversationCard, isUnread && styles.unreadCard]}
          onPress={() => handleConversationPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.conversationContent}>
            <Avatar.Text
              size={50}
              label="U"
              style={styles.avatar}
            />
            <View style={styles.conversationInfo}>
              <Title style={[styles.conversationName, isUnread && styles.unreadText]}>
                Unknown User
              </Title>
              <Text style={[styles.conversationPreview, isUnread && styles.unreadText]} numberOfLines={1}>
                Tap to start chatting
              </Text>
              <Text style={[styles.conversationTime, isUnread && styles.unreadTime]}>
                {item.last_message_at ? formatTimestamp(item.last_message_at) : 'Unknown time'}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadIndicator} />}
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering conversation:', error, item);
      return null;
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Title style={styles.emptyTitle}>No Conversations Yet</Title>
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
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Title style={styles.emptyTitle}>No Results Found</Title>
      <Text style={styles.emptyText}>
        Try adjusting your search terms
      </Text>
    </View>
  );

  // Show loading spinner only for initial data fetch, not auth check
  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Chats</Title>
        </View>
        <SafeAreaView style={styles.content} edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
            <Text style={styles.loadingText}>
              Loading conversations...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Separate auth check with timeout protection
  if (!user && authCheckDone) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Chats</Title>
        </View>
        <SafeAreaView style={styles.content} edges={[]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🔐</Text>
            <Title style={styles.errorTitle}>Authentication Required</Title>
            <Text style={styles.errorText}>
              Please sign in to view your messages
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/(auth)/login')}
              style={styles.retryButton}
            >
              Sign In
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // If no user but timeout not reached, show minimal loading
  if (!user && !authCheckDone) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Chats</Title>
        </View>
        <SafeAreaView style={styles.content} edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
            <Text style={styles.loadingText}>
              Checking authentication...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Chats</Title>
          {!isOnline && (
            <View style={styles.offlineIndicator}>
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages List with Search Bar */}
      <SafeAreaView style={styles.content} edges={[]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search conversations..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
        </View>

        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.conversationList, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={searchQuery ? renderEmptySearch : renderEmpty}
        />
      </SafeAreaView>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: defaultTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  offlineIndicator: {
    backgroundColor: defaultTheme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: defaultTheme.colors.onError,
    fontSize: 12,
    fontWeight: '600',
  },
  conversationList: {
    padding: 20,
    paddingTop: 16,
  },
  conversationCard: {
    backgroundColor: defaultTheme.colors.surface,
    marginBottom: 12,
    elevation: 1,
    borderRadius: 8,
    padding: 16,
    position: 'relative',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    borderRadius: 25,
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
  unreadCard: {
    backgroundColor: defaultTheme.colors.primaryContainer,
    borderLeftWidth: 4,
    borderLeftColor: defaultTheme.colors.primary,
  },
  unreadText: {
    color: defaultTheme.colors.onPrimaryContainer,
    fontWeight: '700',
  },
  unreadTime: {
    color: defaultTheme.colors.primary,
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: defaultTheme.colors.primary,
    position: 'absolute',
    right: 16,
    top: 16,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 120,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: defaultTheme.colors.background,
  },
  searchBar: {
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  searchInput: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});
