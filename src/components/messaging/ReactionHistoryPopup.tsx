import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Dimensions } from 'react-native';
import { defaultTheme } from '../../styles/theme';

interface ReactionHistoryPopupProps {
  reactions: { [emoji: string]: string[] };
  messageId: string;
  isVisible: boolean;
  onClose: () => void;
  onAddReaction: (emoji: string) => void;
  position: { x: number; y: number; width: number; height: number };
}

const ReactionHistoryPopup: React.FC<ReactionHistoryPopupProps> = ({
  reactions,
  messageId,
  isVisible,
  onClose,
  onAddReaction,
  position,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, fadeAnim, slideAnim, scaleAnim]);

  if (!isVisible) return null;

  const reactionEntries = Object.entries(reactions);
  const { width: screenWidth } = Dimensions.get('window');

  // Position the popup above or below the message
  const popupTop = position.y - 120; // Position above message
  const popupLeft = Math.max(20, Math.min(position.x, screenWidth - 200)); // Center on message, keep on screen

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View
        style={[
          styles.popup,
          {
            top: popupTop,
            left: popupLeft,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Reactions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reactionsGrid}>
          {reactionEntries.map(([emoji, userIds]) => (
            <ReactionItem
              key={emoji}
              emoji={emoji}
              count={userIds.length}
              onPress={() => onAddReaction(emoji)}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

interface ReactionItemProps {
  emoji: string;
  count: number;
  onPress: () => void;
}

const ReactionItem: React.FC<ReactionItemProps> = ({ emoji, count, onPress }) => {
  const [previousCount, setPreviousCount] = useState(count);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > previousCount) {
      // Animate count increase
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setPreviousCount(count);
  }, [count, previousCount, scaleAnim]);

  return (
    <TouchableOpacity
      style={styles.reactionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.Text style={[styles.emoji, { transform: [{ scale: scaleAnim }] }]}>
        {emoji}
      </Animated.Text>
      <Text style={styles.count}>{count}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popup: {
    position: 'absolute',
    backgroundColor: defaultTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    maxWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: defaultTheme.colors.onSurface,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: defaultTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: defaultTheme.colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionItem: {
    alignItems: 'center',
    margin: 8,
    minWidth: 40,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
});

export default ReactionHistoryPopup;
