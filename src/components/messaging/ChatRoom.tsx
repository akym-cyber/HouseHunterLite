import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Alert,
  Clipboard,
  Animated,
  UIManager,
  TextInput,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Avatar,
  IconButton,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/useTheme';
import { Message, Conversation, Property } from '../../types/database';
import ChatBubble from './ChatBubble';
import DateSeparator from './DateSeparator';
import ChatInputBar from './ChatInputBar';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatRoomProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, replyTo?: string, media?: any[]) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onDeleteMessageForMe?: (message: Message) => Promise<void> | void;
  onDeleteMessageForEveryone?: (message: Message) => Promise<void> | void;
  onSendVoiceMessage?: (voiceData: any) => Promise<void> | void;
  onRetryVoice?: (message: Message) => Promise<void> | void;
  propertyReferences?: Property[];
  onPropertyPress?: (propertyId: string) => void;
  onSendPropertyOffer?: (propertyId: string) => Promise<void> | void;
  loading?: boolean;
  onBack?: () => void;
  otherUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  property?: Property;
}

const SCROLL_THRESHOLD = 100;
const TALKING_ABOUT_LIVE_MS = 3000;
const TALKING_ABOUT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'for', 'from', 'has', 'have', 'i',
  'in', 'is', 'it', 'its', 'my', 'of', 'on', 'or', 'our', 'that', 'the', 'this',
  'to', 'was', 'we', 'were', 'with', 'you', 'your', 'about',
]);
const PROPERTY_STATUS_HOT_WINDOW_MS = 10 * 60 * 1000;
const ASKING_KEYWORDS = [
  'is it available',
  'is this available',
  'still available',
  'available',
  'can i view',
  'can we view',
  'view this',
  'schedule a viewing',
  'book a viewing',
  'tour',
  'visit',
];
const AVAILABLE_KEYWORDS = [
  'yes',
  'yess',
  'available',
  'still available',
  'it is available',
  'its available',
  'currently available',
  'vacant',
  'you can view',
  'come view',
];
const RENTED_KEYWORDS = [
  'not available',
  'unavailable',
  'already rented',
  'rented',
  'sold',
  'taken',
  'occupied',
  'no longer available',
];
const VIEW_SCHEDULED_KEYWORDS = [
  'view scheduled',
  'viewing scheduled',
  'tour booked',
  'booked viewing',
  'appointment confirmed',
  'confirmed viewing',
  'see you at',
];

const normalizeMentionText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const timestampToMs = (timestamp: any): number => {
  if (!timestamp) return 0;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
    return timestamp.seconds * 1000 + ((timestamp.nanoseconds || 0) / 1000000);
  }
  if (typeof timestamp === 'object' && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  return 0;
};

const containsKeyword = (source: string, keyword: string): boolean => {
  if (!keyword) return false;
  if (keyword.includes(' ')) return source.includes(keyword);
  return ` ${source} `.includes(` ${keyword} `);
};

const includesAnyKeyword = (source: string, keywords: string[]): boolean =>
  keywords.some((keyword) => containsKeyword(source, keyword));

const formatClockLabel = (timestampMs: number): string => {
  if (!timestampMs) return '';
  try {
    return new Date(timestampMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_error) {
    return '';
  }
};

const getPropertyThumbnailUri = (propertyData?: Property | null): string | undefined => {
  if (!propertyData) return undefined;
  if (typeof propertyData.primaryImageUrl === 'string' && propertyData.primaryImageUrl.trim()) {
    return propertyData.primaryImageUrl;
  }
  const media = Array.isArray(propertyData.media) ? propertyData.media : [];
  const imageMedia = media.find((item: any) => item?.type === 'image' && typeof item?.url === 'string');
  if (imageMedia?.url) return imageMedia.url;
  const fallbackMedia = media.find((item: any) => typeof item?.thumbnailUrl === 'string' || typeof item?.thumbnail_url === 'string' || typeof item?.url === 'string');
  if (fallbackMedia?.thumbnailUrl) return fallbackMedia.thumbnailUrl;
  if (fallbackMedia?.thumbnail_url) return fallbackMedia.thumbnail_url;
  if (fallbackMedia?.url) return fallbackMedia.url;
  return undefined;
};

function ChatRoom({
  conversation,
  messages,
  onSendMessage,
  onLoadMore,
  onDeleteMessageForMe,
  onDeleteMessageForEveryone,
  propertyReferences = [],
  onPropertyPress,
  onSendPropertyOffer,
  loading = false,
  onBack,
  otherUser,
  property,
}: ChatRoomProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Message>>(null);
  const chatInputRef = useRef<TextInput | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepPinnedToBottomRef = useRef(false);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isTalkingAboutExpanded, setIsTalkingAboutExpanded] = useState(true);
  const [liveMentionPropertyIds, setLiveMentionPropertyIds] = useState<string[]>([]);
  const liveMentionResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMentionByPropertyRef = useRef<Record<string, number>>({});
  const listMessages = useMemo(() => [...messages].reverse(), [messages]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    propertyReferences.forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    if (property?.id && !map.has(property.id)) {
      map.set(property.id, property);
    }
    return map;
  }, [property, propertyReferences]);

  const propertyContextItems = useMemo(() => {
    type ContextProperty = {
      id: string;
      label: string;
      details: string;
      thumbnailUri?: string;
    };

    const map = new Map<string, ContextProperty>();

    const formatType = (propertyType?: string) =>
      propertyType
        ? `${propertyType.charAt(0).toUpperCase()}${propertyType.slice(1)}`
        : '';

    const hasBedroomHint = (normalizedLabel: string, bedrooms?: number) => {
      if (!bedrooms || bedrooms <= 0) return false;
      return (
        normalizedLabel.includes(`${bedrooms} bed`)
        || normalizedLabel.includes(`${bedrooms}bed`)
        || normalizedLabel.includes(`${bedrooms} bedroom`)
        || normalizedLabel.includes(`${bedrooms}bedroom`)
        || normalizedLabel.includes(`${bedrooms}br`)
      );
    };

    const buildContextProperty = (propertyId: string, propertyData?: Property | null): ContextProperty => {
      const rawLabel =
        propertyData?.title?.trim()
        || propertyData?.addressLine1?.trim()
        || `Property ${propertyId.slice(0, 6)}`;

      const compactLabel = rawLabel
        .replace(/\b(\w+)(\s+\1\b)+/gi, '$1')
        .replace(/\s+/g, ' ')
        .trim();

      const normalizedLabel = normalizeMentionText(compactLabel);
      const bedroomCount = typeof propertyData?.bedrooms === 'number' ? propertyData.bedrooms : 0;
      const bedroomLabel = bedroomCount > 0 ? `${bedroomCount}BR` : '';
      const typeLabel = formatType(propertyData?.propertyType);

      const detailParts: string[] = [];
      if (bedroomLabel && !hasBedroomHint(normalizedLabel, bedroomCount)) {
        detailParts.push(bedroomLabel);
      }
      if (typeLabel && !normalizedLabel.includes(normalizeMentionText(typeLabel))) {
        detailParts.push(typeLabel);
      }
      if (detailParts.length === 0 && propertyData?.city?.trim()) {
        detailParts.push(propertyData.city.trim());
      }

      return {
        id: propertyId,
        label: compactLabel,
        details: detailParts.join(' | '),
        thumbnailUri: getPropertyThumbnailUri(propertyData),
      };
    };

    propertyReferences.forEach((item) => {
      if (!item?.id) return;
      map.set(item.id, buildContextProperty(item.id, item));
    });

    if (property?.id && !map.has(property.id)) {
      map.set(property.id, buildContextProperty(property.id, property));
    }

    const legacyConversationPropertyId =
      (conversation as any).property_id || (conversation as any).propertyId;
    if (
      typeof legacyConversationPropertyId === 'string'
      && legacyConversationPropertyId
      && !map.has(legacyConversationPropertyId)
    ) {
      const legacyProperty = propertyById.get(legacyConversationPropertyId);
      map.set(legacyConversationPropertyId, buildContextProperty(legacyConversationPropertyId, legacyProperty));
    }

    return Array.from(map.values());
  }, [conversation, property, propertyById, propertyReferences]);

  const buildPropertyKeywords = useCallback((propertyId: string, fallbackLabel: string): string[] => {
    const propertyData = propertyById.get(propertyId);
    const keywordSet = new Set<string>();

    const addKeyword = (rawValue?: string | null) => {
      if (!rawValue) return;
      const normalized = normalizeMentionText(rawValue);
      if (!normalized) return;
      keywordSet.add(normalized);
      normalized.split(' ').forEach((token) => {
        if (TALKING_ABOUT_STOP_WORDS.has(token)) return;
        if (token.length >= 4 || /\d/.test(token)) {
          keywordSet.add(token);
        }
      });
    };

    addKeyword(fallbackLabel);
    addKeyword(propertyData?.title);
    addKeyword(propertyData?.addressLine1);
    addKeyword(propertyData?.estate);
    addKeyword(propertyData?.building);
    addKeyword(propertyData?.city);
    addKeyword(propertyData?.propertyType);

    if (typeof propertyData?.bedrooms === 'number' && propertyData.bedrooms > 0) {
      const beds = `${propertyData.bedrooms}`;
      addKeyword(`${beds}bed`);
      addKeyword(`${beds} bed`);
      addKeyword(`${beds}bedroom`);
      addKeyword(`${beds} bedroom`);
      addKeyword(`${beds}br`);
      addKeyword(`${beds} br`);
    }

    return Array.from(keywordSet);
  }, [propertyById]);

  const talkingAboutItems = useMemo(() => {
    const paddedContains = (source: string, keyword: string) => {
      if (!keyword) return false;
      if (keyword.includes(' ')) return source.includes(keyword);
      return ` ${source} `.includes(` ${keyword} `);
    };

    return propertyContextItems
      .map((item) => {
        const keywords = buildPropertyKeywords(item.id, item.label);
        const mentionTimes: number[] = [];

        const pushMentionTime = (rawTimestamp: any) => {
          const timestampMs = timestampToMs(rawTimestamp);
          if (timestampMs > 0) {
            mentionTimes.push(timestampMs);
          }
        };

        messages.forEach((message) => {
          if ((message as any).deleted_for_everyone) return;

          if ((message as any).property_offer_id && (message as any).property_offer_id === item.id) {
            pushMentionTime(
              (message as any).created_at
              ?? (message as any).createdAt
              ?? (message as any).updated_at
              ?? (message as any).updatedAt
            );
          }

          if (typeof message.content !== 'string' || !message.content.trim()) return;

          const normalizedContent = normalizeMentionText(message.content);
          if (!normalizedContent) return;

          const isMentioned = keywords.some((keyword) => paddedContains(normalizedContent, keyword));
          if (!isMentioned) return;

          pushMentionTime(
            (message as any).created_at
            ?? (message as any).createdAt
            ?? (message as any).updated_at
            ?? (message as any).updatedAt
          );
        });

        const mentionTimesMs = Array.from(new Set(mentionTimes)).sort((a, b) => b - a);
        const lastMentionAtMs = mentionTimesMs[0] || 0;

        return {
          id: item.id,
          label: item.label,
          details: item.details,
          thumbnailUri: item.thumbnailUri,
          mentionTimesMs,
          lastMentionAtMs,
        };
      })
      .sort((a, b) => (b.lastMentionAtMs - a.lastMentionAtMs) || a.label.localeCompare(b.label));
  }, [buildPropertyKeywords, messages, propertyContextItems]);

  const propertyStatusById = useMemo(() => {
    type StatusKind = 'neutral' | 'pending' | 'available' | 'rented' | 'viewing';
    type StatusMeta = {
      kind: StatusKind;
      iconName: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      statusText?: string;
      statusAtMs: number;
      isHot: boolean;
    };

    const map = new Map<string, StatusMeta>();
    const now = Date.now();

    const fallbackOwnerId = (conversation as any).ownerId;

    propertyContextItems.forEach((item) => {
      const propertyData = propertyById.get(item.id);
      const ownerId =
        propertyData?.ownerId
        || fallbackOwnerId
        || (otherUser?.id && otherUser.id !== user?.uid ? otherUser.id : undefined);

      const keywords = buildPropertyKeywords(item.id, item.label);
      const hasSinglePropertyContext = propertyContextItems.length === 1;

      let latestAskAtMs = 0;
      let latestOwnerReplyAtMs = 0;
      let latestEvent:
        | {
            kind: Exclude<StatusKind, 'neutral' | 'pending'>;
            atMs: number;
          }
        | null = null;

      messages.forEach((message) => {
        if ((message as any).deleted_for_everyone) return;

        const senderId =
          (message as any).sender_id
          || (message as any).senderId
          || '';

        const atMs = timestampToMs(
          (message as any).created_at
          ?? (message as any).createdAt
          ?? (message as any).updated_at
          ?? (message as any).updatedAt
        );
        if (!atMs) return;

        const normalizedContent = normalizeMentionText(message.content || '');
        const propertyOfferMatch = (message as any).property_offer_id === item.id;
        const propertyMentioned = normalizedContent
          ? keywords.some((keyword) => containsKeyword(normalizedContent, keyword))
          : false;

        const isPropertyRelevant = propertyOfferMatch || propertyMentioned || (hasSinglePropertyContext && !!normalizedContent);
        if (!isPropertyRelevant) return;

        const isOwnerMessage = ownerId ? senderId === ownerId : senderId === otherUser?.id;
        if (isOwnerMessage) {
          latestOwnerReplyAtMs = Math.max(latestOwnerReplyAtMs, atMs);
          if (!normalizedContent) return;

          let kind: Exclude<StatusKind, 'neutral' | 'pending'> | null = null;
          if (includesAnyKeyword(normalizedContent, RENTED_KEYWORDS)) {
            kind = 'rented';
          } else if (includesAnyKeyword(normalizedContent, VIEW_SCHEDULED_KEYWORDS)) {
            kind = 'viewing';
          } else if (includesAnyKeyword(normalizedContent, AVAILABLE_KEYWORDS)) {
            kind = 'available';
          }

          if (kind && (!latestEvent || atMs >= latestEvent.atMs)) {
            latestEvent = { kind, atMs };
          }
          return;
        }

        if (!normalizedContent) return;
        if (includesAnyKeyword(normalizedContent, ASKING_KEYWORDS)) {
          latestAskAtMs = Math.max(latestAskAtMs, atMs);
        }
      });

      let kind: StatusKind = 'neutral';
      let statusAtMs = 0;

      if (latestAskAtMs > 0 && latestAskAtMs > latestOwnerReplyAtMs) {
        kind = 'pending';
        statusAtMs = latestAskAtMs;
      } else if (latestEvent) {
        kind = latestEvent.kind;
        statusAtMs = latestEvent.atMs;
      } else if (propertyData?.status === 'rented' || propertyData?.status === 'unavailable') {
        kind = 'rented';
      }

      const mentionMeta = talkingAboutItems.find((talkingItem) => talkingItem.id === item.id);
      const lastMentionAtMs = mentionMeta?.lastMentionAtMs || 0;
      const isHot =
        liveMentionPropertyIds.includes(item.id)
        || (statusAtMs > 0 && now - statusAtMs <= PROPERTY_STATUS_HOT_WINDOW_MS)
        || (lastMentionAtMs > 0 && now - lastMentionAtMs <= PROPERTY_STATUS_HOT_WINDOW_MS);

      const statusTimeLabel = formatClockLabel(statusAtMs);

      let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
      let iconColor = theme.colors.onPrimary;
      let statusText: string | undefined;

      if (kind === 'available') {
        iconName = 'checkmark-circle';
        iconColor = '#34D399';
        statusText = statusTimeLabel ? `Available now | ${statusTimeLabel}` : 'Available now!';
      } else if (kind === 'pending') {
        iconName = 'hourglass-outline';
        iconColor = '#FBBF24';
        statusText = statusTimeLabel ? `Awaiting reply | ${statusTimeLabel}` : 'Awaiting reply';
      } else if (kind === 'rented') {
        iconName = 'close-circle';
        iconColor = '#F87171';
        statusText = 'No longer available';
      } else if (kind === 'viewing') {
        iconName = 'eye';
        iconColor = '#93C5FD';
        statusText = statusTimeLabel ? `Tour booked | ${statusTimeLabel}` : 'Tour booked';
      }

      map.set(item.id, {
        kind,
        iconName,
        iconColor,
        statusText,
        statusAtMs,
        isHot,
      });
    });

    return map;
  }, [
    buildPropertyKeywords,
    conversation,
    liveMentionPropertyIds,
    messages,
    otherUser?.id,
    propertyById,
    propertyContextItems,
    talkingAboutItems,
    theme.colors.onPrimary,
    user?.uid,
  ]);

  // Video call pulse animation
  const videoCallPulseAnim = useRef(new Animated.Value(0)).current;

  // Initialize pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(videoCallPulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(videoCallPulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => {
      pulseAnimation.stop();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      if (liveMentionResetTimeoutRef.current) {
        clearTimeout(liveMentionResetTimeoutRef.current);
      }
    };
  }, [videoCallPulseAnim]);

  useEffect(() => {
    if (talkingAboutItems.length === 0) {
      setLiveMentionPropertyIds([]);
      lastMentionByPropertyRef.current = {};
      return;
    }

    const nextMentionMap: Record<string, number> = {};
    const newlyMentioned: string[] = [];

    talkingAboutItems.forEach((item) => {
      nextMentionMap[item.id] = item.lastMentionAtMs;
      const previousMentionAt = lastMentionByPropertyRef.current[item.id] || 0;
      if (item.lastMentionAtMs > 0 && item.lastMentionAtMs > previousMentionAt) {
        newlyMentioned.push(item.id);
      }
    });

    lastMentionByPropertyRef.current = nextMentionMap;

    if (newlyMentioned.length === 0) return;

    setLiveMentionPropertyIds((prev) => Array.from(new Set([...prev, ...newlyMentioned])));
    if (liveMentionResetTimeoutRef.current) {
      clearTimeout(liveMentionResetTimeoutRef.current);
    }
    liveMentionResetTimeoutRef.current = setTimeout(() => {
      setLiveMentionPropertyIds([]);
    }, TALKING_ABOUT_LIVE_MS);
  }, [talkingAboutItems]);

  const performScrollToBottom = useCallback((animated = false) => {
    if (!flatListRef.current) return;
    // In inverted mode, offset 0 is the visual bottom (latest messages).
    flatListRef.current.scrollToOffset({ offset: 0, animated });
  }, []);

  // Smart scroll to bottom
  const scrollToBottom = useCallback((animated = true, force = false) => {
    if (force || isNearBottom) {
      requestAnimationFrame(() => {
        performScrollToBottom(animated);
      });
    }
  }, [isNearBottom, performScrollToBottom]);

  const scrollToBottomInstant = useCallback(() => {
    if (!flatListRef.current) return;
    requestAnimationFrame(() => {
      performScrollToBottom(false);
    });
  }, [performScrollToBottom]);

  const kickToExactBottom = useCallback((animated = false) => {
    performScrollToBottom(animated);
    requestAnimationFrame(() => {
      performScrollToBottom(false);
    });
  }, [performScrollToBottom]);

  const scheduleAutoScroll = useCallback((delayMs: number) => {
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    if (delayMs <= 0) {
      if (!isUserScrollingRef.current) {
        scrollToBottom(true, true);
      }
      return;
    }

    autoScrollTimeoutRef.current = setTimeout(() => {
      if (!isUserScrollingRef.current) {
        scrollToBottom(true, true);
      }
    }, delayMs);
  }, [scrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;

    // In inverted lists, offset 0 means we are pinned to latest messages.
    const nowNearBottom = contentOffset.y < SCROLL_THRESHOLD;
    setIsNearBottom(nowNearBottom);
    if (nowNearBottom) {
      keepPinnedToBottomRef.current = true;
    }

    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    keepPinnedToBottomRef.current = false;
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 500);
  }, []);

  // Scroll to latest on new messages when user is already near bottom.
  useEffect(() => {
    if (messages.length > 0 && isNearBottom && !isUserScrollingRef.current) {
      scheduleAutoScroll(0);
      return () => {
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
          autoScrollTimeoutRef.current = null;
        }
      };
    }
  }, [messages.length, isNearBottom, scheduleAutoScroll]);

  // Format timestamp
  const formatMessageTime = useCallback((timestamp: any): string => {
    try {
      const now = new Date();
      let messageTime: Date;

      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        messageTime = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else if (typeof timestamp === 'string') {
        messageTime = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        messageTime = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        messageTime = timestamp;
      } else {
        return 'now';
      }

      if (isNaN(messageTime.getTime())) {
        return 'now';
      }

      const diffInMs = now.getTime() - messageTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return daysOfWeek[messageTime.getDay()];
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[messageTime.getMonth()];
      const day = messageTime.getDate();

      if (messageTime.getFullYear() === now.getFullYear()) {
        return `${month} ${day}`;
      }

      return `${month} ${day}, ${messageTime.getFullYear()}`;
    } catch (error) {
      return 'now';
    }
  }, []);

  const formatMessageClock = useCallback((timestamp: any): string => {
    try {
      let messageTime: Date;

      if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        messageTime = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else if (typeof timestamp === 'string') {
        messageTime = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        messageTime = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        messageTime = timestamp;
      } else {
        messageTime = new Date();
      }

      if (isNaN(messageTime.getTime())) {
        messageTime = new Date();
      }

      return messageTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  }, []);

  const getMessageStatusIcon = useCallback((status?: string): string | null => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '✓';
    }
  }, []);

  const timestampToDate = useCallback((timestamp: any): Date => {
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      return new Date(timestamp);
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }, []);

  const formatDateLabel = useCallback((messageDate: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return messageDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const getDateSeparator = useCallback((items: Message[], index: number): string | null => {
    const currentMessage = items[index];
    const olderMessage = index < items.length - 1 ? items[index + 1] : null;

    const currentDate = timestampToDate(currentMessage.created_at).toDateString();
    const olderDate = olderMessage
      ? timestampToDate(olderMessage.created_at).toDateString()
      : null;

    // The visual top date chip is rendered via ListFooterComponent in inverted mode.
    if (index === items.length - 1) {
      return null;
    }

    if (currentDate !== olderDate) {
      return formatDateLabel(timestampToDate(currentMessage.created_at));
    }

    return null;
  }, [formatDateLabel, timestampToDate]);

  const renderTopDateSeparator = useCallback(() => {
    if (listMessages.length === 0) return null;
    const oldestMessage = listMessages[listMessages.length - 1];
    const dateText = formatDateLabel(timestampToDate(oldestMessage.created_at));
    return (
      <View style={styles.dateSeparatorWrap}>
        <DateSeparator dateText={dateText} />
      </View>
    );
  }, [formatDateLabel, listMessages, styles.dateSeparatorWrap, timestampToDate]);

  const isConsecutiveFromSameSender = useCallback((currentIndex: number): boolean => {
    if (currentIndex >= listMessages.length - 1) return false;

    const currentMessage = listMessages[currentIndex];
    const olderMessage = listMessages[currentIndex + 1];

    const sameSender = currentMessage.sender_id === olderMessage.sender_id;
    const currentTime = timestampToDate(currentMessage.created_at);
    const olderTime = timestampToDate(olderMessage.created_at);
    const timeDiff = currentTime.getTime() - olderTime.getTime();
    const withinTimeWindow = timeDiff < (5 * 60 * 1000);

    return sameSender && withinTimeWindow;
  }, [listMessages, timestampToDate]);

  const handleRetry = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await onSendMessage(message.content, undefined);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend message. Please try again.');
    }
  }, [messages, onSendMessage]);

  const handleMessageLongPress = useCallback((message: Message) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedMessageId(message.id);
    const isOwnMessage = message.sender_id === user?.uid;
    const canCopy = !!message.content;
    const buttons: any[] = [
      ...(canCopy
        ? [{
            text: 'Copy',
            onPress: () => {
              Clipboard.setString(message.content);
              setSelectedMessageId(null);
            },
          }]
        : []),
      {
        text: 'Reply',
        onPress: () => {
          setReplyingTo(message);
          setSelectedMessageId(null);
        },
      },
      ...(onDeleteMessageForMe
        ? [{
            text: 'Delete for me',
            style: 'destructive',
            onPress: () => {
              setSelectedMessageId(null);
              Promise.resolve(onDeleteMessageForMe(message)).catch(() => {});
            },
          }]
        : []),
      ...(isOwnMessage && onDeleteMessageForEveryone
        ? [{
            text: 'Delete for everyone',
            style: 'destructive',
            onPress: () => {
              setSelectedMessageId(null);
              Promise.resolve(onDeleteMessageForEveryone(message)).catch(() => {});
            },
          }]
        : []),
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => setSelectedMessageId(null),
      },
    ];

    Alert.alert(
      'Message Options',
      'Choose an action',
      buttons,
      {
        cancelable: true,
        onDismiss: () => setSelectedMessageId(null),
      }
    );
  }, [onDeleteMessageForEveryone, onDeleteMessageForMe, user?.uid]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.uid;
    const dateSeparator = getDateSeparator(listMessages, index);
    const isConsecutive = isConsecutiveFromSameSender(index);
    const shouldShowAvatar = !isOwnMessage && !isConsecutive;
    const isSelected = selectedMessageId === item.id;

    return (
      <>
        <TouchableOpacity
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            isConsecutive && styles.consecutiveMessage,
            isSelected && styles.selectedMessageContainer,
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          onPress={() => {
            if (selectedMessageId) setSelectedMessageId(null);
          }}
          delayLongPress={500}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.9}
        >
          {shouldShowAvatar && (
            otherUser?.avatarUrl ? (
              <Avatar.Image
                size={32}
                source={{ uri: otherUser.avatarUrl }}
                style={styles.messageAvatar}
              />
            ) : (
              <Avatar.Text
                size={32}
                label={otherUser?.firstName?.[0] || 'U'}
                style={styles.messageAvatar}
              />
            )
          )}

          <View
            style={[
              styles.messageContent,
              shouldShowAvatar && styles.otherMessageContent,
              !isOwnMessage && !shouldShowAvatar && styles.otherMessageContentIndented,
            ]}
          >
            {item.reply_to && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewText}>Replying to message</Text>
              </View>
            )}

            <ChatBubble
              message={item}
              isOwnMessage={isOwnMessage}
              formatMessageTime={formatMessageClock}
              getMessageStatusIcon={getMessageStatusIcon}
              isSending={item.status === 'sending'}
              onRetry={handleRetry}
              otherUserAvatar={otherUser?.avatarUrl}
            />
          </View>
        </TouchableOpacity>

        {dateSeparator && (
          <View style={styles.dateSeparatorWrap}>
            <DateSeparator dateText={dateSeparator} />
          </View>
        )}
      </>
    );
  }, [
    listMessages,
    user?.uid,
    otherUser,
    getMessageStatusIcon,
    getDateSeparator,
    isConsecutiveFromSameSender,
    handleRetry,
    handleMessageLongPress,
    selectedMessageId,
  ]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    
    setNewMessage('');
    
    setSending(true);

    try {
      await onSendMessage(messageContent, replyingTo?.id);
      setReplyingTo(null);
      
      scrollToBottomInstant();
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        Alert.alert(
          'Permission Error',
          'You do not have permission to send messages in this conversation. Please contact support.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage || 'Failed to send message. Please try again.');
      }
      
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, replyingTo, onSendMessage, scrollToBottomInstant]);

  const handleSendMedia = useCallback(async (media: any[], messageType: Message['message_type']) => {
    if (sending || !media || media.length === 0) return;

    setSending(true);
    try {
      await onSendMessage('', replyingTo?.id, media);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true, true), 100);
    } catch (error: any) {
      console.error('Failed to send media:', error);
      Alert.alert('Error', error?.message || 'Failed to send media. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, replyingTo, onSendMessage, scrollToBottom]);

  const handleSendVoice = useCallback(async (voiceData: { uri: string; duration: number; waveform: number[] }) => {
    if (sending) return;

    setSending(true);
    try {
      const media = [{
        id: Date.now().toString(),
        type: 'audio',
        url: voiceData.uri,
        duration: voiceData.duration,
        waveform: voiceData.waveform,
      }];
      await onSendMessage('', replyingTo?.id, media);
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true, true), 100);
    } catch (error: any) {
      console.error('Failed to send voice message:', error);
      Alert.alert('Error', error?.message || 'Failed to send voice message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, replyingTo, onSendMessage, scrollToBottom]);

  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    // Jump straight to the latest message when focusing input.
    keepPinnedToBottomRef.current = true;
    scrollToBottomInstant();
  }, [scrollToBottomInstant]);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    keepPinnedToBottomRef.current = false;
  }, []);

  const handleInputBarLayout = useCallback((event: any) => {
    const height = event?.nativeEvent?.layout?.height;
    if (typeof height !== 'number' || height <= 0) return;
    setInputBarHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!keepPinnedToBottomRef.current || isUserScrollingRef.current) return;
    kickToExactBottom(false);
  }, [kickToExactBottom]);

  const renderHeader = useCallback(() => {
    const handlePhoneCall = async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const phoneNumber = '+254794252032';

        Alert.alert(
          'Make Phone Call',
          `Call ${phoneNumber}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Call',
              onPress: async () => {
                try {
                  const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
                  if (supported) {
                    await Linking.openURL(`tel:${phoneNumber}`);
                  } else {
                    Alert.alert('Error', 'Phone calls are not supported on this device.');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to make phone call.');
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('Phone call error:', error);
      }
    };

    const handleVideoCall = async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Video call feature will be available soon!');
      } catch (error) {
        console.error('Video call error:', error);
      }
    };

    const displayName = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Property Owner';
    const initial = (otherUser?.firstName?.[0] || 'P').toUpperCase();

    return (
      <View style={styles.chatHeaderWrapper}>
        <View style={[styles.chatHeader, { paddingTop: insets.top + 5 }]}>
          {onBack && (
            <IconButton
              icon="chevron-left"
              iconColor={theme.colors.onPrimary}
              size={28}
              onPress={onBack}
              style={styles.headerBackButton}
            />
          )}
          {otherUser?.avatarUrl ? (
            <Avatar.Image
              size={40}
              source={{ uri: otherUser.avatarUrl }}
              style={styles.headerAvatar}
            />
          ) : (
            <Avatar.Text
              size={40}
              label={initial}
              style={[styles.headerAvatar, styles.headerAvatarText]}
              labelStyle={{ color: theme.colors.primary }}
            />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {otherUser?.isOnline ? 'Online' : otherUser?.lastSeen ? `Last seen ${formatMessageTime(otherUser.lastSeen)}` : 'Offline'}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon} onPress={handlePhoneCall}>
              <Ionicons name="call-outline" size={22} color={theme.colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={handleVideoCall}>
              <Animated.View style={{
                transform: [{
                  scale: videoCallPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                }],
                opacity: videoCallPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              }}>
                <Ionicons name="videocam-outline" size={22} color={theme.colors.onPrimary} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    );
  }, [
    formatMessageTime,
    insets.top,
    onBack,
    onPropertyPress,
    onSendPropertyOffer,
    otherUser,
    styles.chatHeader,
    styles.chatHeaderWrapper,
    styles.headerAvatar,
    styles.headerAvatarText,
    styles.headerBackButton,
    styles.headerIcon,
    styles.headerIcons,
    styles.headerInfo,
    styles.headerName,
    styles.headerStatus,
    theme.colors.onPrimary,
    theme.colors.primary,
    videoCallPulseAnim,
  ]);

  const renderTalkingAbout = useCallback(() => {
    if (propertyContextItems.length === 0) return null;

    const mentionCount = talkingAboutItems.filter((item) => item.lastMentionAtMs > 0).length;

    return (
      <View style={styles.talkingAboutPanel}>
        <TouchableOpacity
          style={styles.talkingAboutHeader}
          onPress={() => setIsTalkingAboutExpanded((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={styles.talkingAboutTitle}>TALKING ABOUT</Text>
          <View style={styles.talkingAboutHeaderRight}>
            <View style={styles.talkingAboutCountBadge}>
              <Text style={styles.talkingAboutCountText}>{mentionCount}</Text>
            </View>
            <Ionicons
              name={isTalkingAboutExpanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {isTalkingAboutExpanded && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.talkingAboutList}
          >
            {talkingAboutItems.map((item) => {
              const isLive = liveMentionPropertyIds.includes(item.id);
              const statusMeta = propertyStatusById.get(item.id);
              const isHot = !!statusMeta?.isHot;
              const mentionText = item.mentionTimesMs.length > 0
                ? item.mentionTimesMs.map((timeMs) => formatMessageClock(timeMs)).join(', ')
                : 'No mention yet';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.talkingAboutChip, isLive && styles.talkingAboutChipLive]}
                  onPress={() => onPropertyPress?.(item.id)}
                  onLongPress={() => {
                    if (onSendPropertyOffer) {
                      void onSendPropertyOffer(item.id);
                    }
                  }}
                  delayLongPress={300}
                  activeOpacity={0.85}
                >
                  <View style={styles.talkingAboutChipRow}>
                    {item.thumbnailUri ? (
                      <Avatar.Image
                        size={22}
                        source={{ uri: item.thumbnailUri }}
                        style={styles.talkingAboutThumb}
                      />
                    ) : (
                      <View style={styles.talkingAboutThumbFallback}>
                        <Ionicons
                          name="home-outline"
                          size={12}
                          color={theme.colors.onSurface}
                        />
                      </View>
                    )}
                    <View style={styles.talkingAboutChipTextWrap}>
                      <Text style={styles.talkingAboutChipName} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <View style={styles.talkingAboutMentionRow}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={11}
                          color={theme.colors.onSurfaceVariant}
                          style={styles.talkingAboutMentionIcon}
                        />
                        <Text style={styles.talkingAboutChipMeta} numberOfLines={1}>
                          {mentionText}
                        </Text>
                      </View>
                      {!!statusMeta?.statusText && (
                        <View style={styles.talkingAboutStatusRow}>
                          <Ionicons
                            name={statusMeta.iconName}
                            size={11}
                            color={statusMeta.iconColor}
                            style={styles.talkingAboutStatusIcon}
                          />
                          <Text style={styles.talkingAboutStatusText} numberOfLines={1}>
                            {statusMeta.statusText}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {(isLive || isHot) && (
                    <View style={styles.talkingAboutLiveBadge}>
                      <Text style={styles.talkingAboutLiveText}>{isLive ? 'LIVE' : 'HOT'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }, [
    formatMessageClock,
    isTalkingAboutExpanded,
    liveMentionPropertyIds,
    onPropertyPress,
    onSendPropertyOffer,
    propertyContextItems.length,
    propertyStatusById,
    styles.talkingAboutChip,
    styles.talkingAboutChipLive,
    styles.talkingAboutChipMeta,
    styles.talkingAboutChipName,
    styles.talkingAboutChipRow,
    styles.talkingAboutChipTextWrap,
    styles.talkingAboutCountBadge,
    styles.talkingAboutCountText,
    styles.talkingAboutHeader,
    styles.talkingAboutHeaderRight,
    styles.talkingAboutList,
    styles.talkingAboutLiveBadge,
    styles.talkingAboutLiveText,
    styles.talkingAboutMentionIcon,
    styles.talkingAboutMentionRow,
    styles.talkingAboutPanel,
    styles.talkingAboutStatusIcon,
    styles.talkingAboutStatusRow,
    styles.talkingAboutStatusText,
    styles.talkingAboutThumb,
    styles.talkingAboutThumbFallback,
    styles.talkingAboutTitle,
    talkingAboutItems,
    theme.colors.onSurface,
    theme.colors.onSurfaceVariant,
  ]);

  useEffect(() => {
    if (!isInputFocused || inputBarHeight <= 0) return;
    scrollToBottomInstant();
  }, [inputBarHeight, isInputFocused, scrollToBottomInstant]);

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {renderHeader()}

        <FlatList
          ref={flatListRef}
          data={listMessages}
          inverted
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingTop: 6 },
          ]}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          onContentSizeChange={handleContentSizeChange}
          ListFooterComponent={renderTopDateSeparator}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          scrollIndicatorInsets={{ right: 1 }}
        />

        {renderTalkingAbout()}

        <View onLayout={handleInputBarLayout}>
          <ChatInputBar
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={handleSend}
            onSendMedia={handleSendMedia}
            onSendVoice={handleSendVoice}
            conversationId={conversation.id}
            isFocused={isInputFocused}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            inputRef={chatInputRef}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  messagesList: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 2,
    backgroundColor: theme.colors.primary,
  },
  chatHeaderWrapper: {
    backgroundColor: theme.colors.primary,
  },
  headerBackButton: {
    marginLeft: -8,
    marginRight: 10,
    transform: [{ translateX: -2 }, { translateY: -10 }],
  },
  headerAvatar: {
    marginRight: 12,
    backgroundColor: theme.colors.onPrimary,
    transform: [{ translateY: -10 }],
  },
  headerAvatarText: {
    backgroundColor: theme.colors.onPrimary,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
    transform: [{ translateY: -10 }],
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: theme.colors.onPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ translateY: -10 }],
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  propertyContextWrap: {
    marginTop: -8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  propertyContextHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  propertyContextHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyContextCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  propertyContextCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  propertyContextLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: theme.colors.onPrimary,
    opacity: 0.8,
    marginBottom: 0,
  },
  propertyContextList: {
    alignItems: 'center',
    paddingRight: 8,
  },
  propertyContextChip: {
    maxWidth: 220,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  propertyContextThumb: {
    backgroundColor: theme.colors.surface,
  },
  propertyContextThumbFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  propertyContextChipTextWrap: {
    flex: 1,
    marginLeft: 8,
  },
  propertyContextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyContextTitleIcon: {
    marginRight: 4,
  },
  propertyContextChipText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 164,
  },
  propertyContextDetailsText: {
    color: theme.colors.onPrimary,
    opacity: 0.82,
    fontSize: 10,
    marginTop: 1,
  },
  talkingAboutPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  talkingAboutHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  talkingAboutTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: theme.colors.onSurfaceVariant,
  },
  talkingAboutHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  talkingAboutCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  talkingAboutCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  talkingAboutList: {
    paddingRight: 8,
  },
  talkingAboutChip: {
    width: 176,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
  },
  talkingAboutChipLive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  talkingAboutChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  talkingAboutChipMeta: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    flexShrink: 1,
  },
  talkingAboutChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  talkingAboutMentionRow: {
    marginTop: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  talkingAboutMentionIcon: {
    marginRight: 4,
  },
  talkingAboutStatusRow: {
    marginTop: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  talkingAboutStatusIcon: {
    marginRight: 4,
  },
  talkingAboutStatusText: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    flexShrink: 1,
  },
  talkingAboutChipTextWrap: {
    flex: 1,
    marginLeft: 8,
  },
  talkingAboutThumb: {
    backgroundColor: theme.colors.surface,
  },
  talkingAboutThumbFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  talkingAboutLiveBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: theme.colors.primary,
  },
  talkingAboutLiveText: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    letterSpacing: 0.5,
  },
  listHeader: {
    marginBottom: 16,
  },
  messagesContent: {
    // In inverted mode, paddingBottom becomes visual top spacing.
    // Keep extra space so the first date chip at the top is not clipped.
    paddingBottom: 16,
  },
  messagesContentKeyboard: {
    paddingBottom: 40,
  },
  dateSeparatorWrap: {
    paddingHorizontal: 16,
  },
  messageContent: {
    maxWidth: '100%',
    flexShrink: 1,
    flexGrow: 1,
  },
  otherMessageContent: {
    marginTop: 0,
  },
  otherMessageContentIndented: {
    marginLeft: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  selectedMessageContainer: {
    backgroundColor: theme.app.overlayLight,
  },
  consecutiveMessage: {
    marginTop: 2,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  replyPreview: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  replyPreviewText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
});

export default ChatRoom;


