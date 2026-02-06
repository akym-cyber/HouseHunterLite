import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
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
import { useTheme } from '../../src/theme/useTheme';
import { userHelpers } from '../../src/services/firebase/firebaseHelpers';
import { Conversation, User } from '../../src/types/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeableChatRow from '../../src/components/chat/SwipeableChatRow';
import { confirmAction } from '../../src/components/chat/ConfirmationModal';
import { showMessageActions } from '../../src/components/chat/MessageActions';

const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }
  return null;
};

// Utility function to format timestamps
const formatTimestamp = (timestamp: any) => {
  const messageTime = timestampToDate(timestamp);
  if (!messageTime) {
    return 'Unknown time';
  }

  const now = new Date();
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

const getDisplayName = (profile?: User | null): string => {
  if (!profile) return 'Unknown User';
  const first = profile.firstName?.trim();
  const last = profile.lastName?.trim();
  if (first || last) {
    return `${first || ''} ${last || ''}`.trim();
  }
  if (profile.name && profile.name.trim()) {
    return profile.name.trim();
  }
  if (profile.email) {
    return profile.email.split('@')[0];
  }
  return 'Unknown User';
};

const getInitial = (name: string): string => {
  const initial = name.trim().charAt(0);
  return (initial || 'U').toUpperCase();
};

const getAvatarUrl = (profile?: User | null): string | undefined => {
  return profile?.avatarUrl || profile?.photoURL || undefined;
};

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { conversations, loading, error, refreshConversations, unreadCount, isOnline, deleteConversation } = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authCheckDone, setAuthCheckDone] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, User | null>>({});
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      const queryText = searchQuery.toLowerCase();
      const otherId = getOtherParticipantId(conversation, user?.uid);
      const otherUser = otherId ? userProfiles[otherId] : null;
      const displayName = getDisplayName(otherUser).toLowerCase();

      return conversation.id.toLowerCase().includes(queryText) ||
             (conversation.property_id && conversation.property_id.toLowerCase().includes(queryText)) ||
             displayName.includes(queryText);
    });
    console.log("📱 Filtered conversations count:", filtered?.length || 0);
  }, [conversations, searchQuery, user?.uid, userProfiles]);

  const mergedConversations = useMemo(() => {
    if (!user?.uid) return conversations;

    const byOwner = new Map<string, { base: Conversation; refs: Set<string> }>();

    conversations.forEach((conv) => {
      const key = conv.ownerId || getOtherParticipantId(conv, user.uid) || conv.id;
      const refs = new Set<string>([
        ...(conv.propertyReferences || []),
        ...(conv.property_id ? [conv.property_id] : []),
      ]);

      const existing = byOwner.get(key);
      if (!existing) {
        byOwner.set(key, { base: conv, refs });
        return;
      }

      // Keep the most recent conversation as the base
      const existingTime = new Date(existing.base.last_message_at).getTime();
      const nextTime = new Date(conv.last_message_at).getTime();
      if (nextTime > existingTime) {
        byOwner.set(key, { base: conv, refs: new Set([...existing.refs, ...refs]) });
      } else {
        existing.refs = new Set([...existing.refs, ...refs]);
      }
    });

    return Array.from(byOwner.values()).map(({ base, refs }) => ({
      ...base,
      propertyReferences: Array.from(refs),
    }));
  }, [conversations, user?.uid]);

  useEffect(() => {
    if (!user?.uid || mergedConversations.length === 0) return;

    const otherIds = Array.from(new Set(
      mergedConversations
        .map(conversation => getOtherParticipantId(conversation, user.uid))
        .filter((id): id is string => !!id)
    ));

    const missingIds = otherIds.filter(id => userProfiles[id] === undefined);
    if (missingIds.length === 0) return;

    let isMounted = true;

    const loadProfiles = async () => {
      for (const id of missingIds) {
        const result = await userHelpers.getUserById(id);
        if (!isMounted) return;
        setUserProfiles(prev => ({ ...prev, [id]: result.data ?? null }));
      }
    };

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [mergedConversations, user?.uid, userProfiles]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  // Filter conversations based on search query
  const filteredConversations = mergedConversations.filter(conversation => {
    if (!searchQuery) return true;
    const queryText = searchQuery.toLowerCase();
    const otherId = getOtherParticipantId(conversation, user?.uid);
    const otherUser = otherId ? userProfiles[otherId] : null;
    const displayName = getDisplayName(otherUser).toLowerCase();

    return conversation.id.toLowerCase().includes(queryText) ||
           (conversation.property_id && conversation.property_id.toLowerCase().includes(queryText)) ||
           displayName.includes(queryText);
  });

  const handleConversationPress = (conversation: Conversation) => {
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    confirmAction({
      title: 'Delete Conversation',
      message: 'Delete this conversation? This cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        const result = await deleteConversation(conversation.id);
        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to delete conversation');
        }
      },
    });
  };

  const handleConversationLongPress = (conversation: Conversation) => {
    showMessageActions('Conversation Options', [
      {
        label: 'Delete Chat',
        onPress: () => handleDeleteConversation(conversation),
        destructive: true,
      },
    ]);
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    try {
      // Validate conversation data
      if (!item || !item.id) {
        console.error('Invalid conversation item:', item);
        return null;
      }

      const otherId = getOtherParticipantId(item, user?.uid);
      const otherUser = otherId ? userProfiles[otherId] : null;
      const displayName = getDisplayName(otherUser);
      const avatarUrl = getAvatarUrl(otherUser);
      const initial = getInitial(displayName);

      const lastMessageDate = timestampToDate(item.last_message_at);
      const lastMessageTime = lastMessageDate ? lastMessageDate.getTime() : 0;
      const isUnread = lastMessageTime > 0 && (new Date().getTime() - lastMessageTime) < (1000 * 60 * 60);

      const propertyCount = item.propertyReferences?.length || (item.property_id ? 1 : 0);
      const previewText = propertyCount > 1 ? `${propertyCount} properties` : 'Tap to start chatting';

      return (
        <SwipeableChatRow
          style={[styles.conversationCard, isUnread && styles.unreadCard]}
          onPress={() => handleConversationPress(item)}
          onLongPress={() => handleConversationLongPress(item)}
          onDelete={() => handleDeleteConversation(item)}
        >
          <View style={styles.conversationContent}>
            {avatarUrl ? (
              <Avatar.Image
                size={50}
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={50}
                label={initial}
                style={styles.avatar}
              />
            )}
            <View style={styles.conversationInfo}>
              <Title style={[styles.conversationName, isUnread && styles.unreadText]}>
                {displayName}
              </Title>
              <Text style={[styles.conversationPreview, isUnread && styles.unreadText]} numberOfLines={1}>
                {previewText}
              </Text>
              <Text style={[styles.conversationTime, isUnread && styles.unreadTime]}>
                {formatTimestamp(item.last_message_at)}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadIndicator} />}
        </SwipeableChatRow>
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
          keyExtractor={(item) => item.ownerId || getOtherParticipantId(item, user?.uid) || item.id}
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: theme.colors.primary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  offlineIndicator: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: theme.colors.onError,
    fontSize: 12,
    fontWeight: '600',
  },
  conversationList: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
  conversationCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: 2,
    elevation: 1,
    borderRadius: 8,
    padding: 6,
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
    marginBottom: 1,
  },
  conversationPreview: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
  },
  emptyButton: {
    marginTop: 16,
  },
  unreadCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  unreadText: {
    color: theme.colors.onPrimaryContainer,
    fontWeight: '700',
  },
  unreadTime: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 120,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: theme.app.background,
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
