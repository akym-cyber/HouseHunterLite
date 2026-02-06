import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface ReactionButtonProps {
  emoji: string;
  count: number;
  messageId: string;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({ emoji, count, messageId }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [previousCount, setPreviousCount] = useState(count);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Trigger pop animation when count increases
  useEffect(() => {
    if (count > previousCount) {
      // Spring animation for natural bounce effect when count increases
      Animated.spring(scaleAnim, {
        toValue: 1.4, // Scale up to 140% when count increases
        friction: 4, // Natural spring friction
        tension: 120, // Spring tension
        useNativeDriver: true,
      }).start(() => {
        // Return to normal size
        Animated.spring(scaleAnim, {
          toValue: 1, // Back to normal size
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }).start();
      });
    }
    setPreviousCount(count);
  }, [count, previousCount, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.reaction}
        activeOpacity={0.7}
        onPress={() => {
          // Could implement reaction removal logic here
          console.log(`Pressed reaction ${emoji} on message ${messageId}`);
        }}
      >
        <Text style={styles.reactionText}>
          {emoji} {count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  reaction: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: Platform.select({
      ios: 8,
      android: 6,
      default: 6,
    }),
    paddingVertical: Platform.select({
      ios: 4,
      android: 3,
      default: 3,
    }),
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 2,
    // Subtle elevation for reactions too
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  reactionText: {
    fontSize: Platform.select({
      ios: 12,
      android: 11,
      default: 11,
    }),
    color: theme.colors.onSurfaceVariant,
  },
});

export default ReactionButton;
