import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface ReactionReplayProps {
  reactions: { [emoji: string]: string[] };
  isVisible: boolean;
  onClose: () => void;
}

interface ReplayReaction {
  emoji: string;
  count: number;
  userId: string;
  delay: number;
}

const ReactionReplay: React.FC<ReactionReplayProps> = ({
  reactions,
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [replayReactions, setReplayReactions] = useState<ReplayReaction[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Prepare reactions for replay
      const allReactions: ReplayReaction[] = [];
      let delay = 0;

      Object.entries(reactions).forEach(([emoji, userIds]) => {
        userIds.forEach((userId, index) => {
          allReactions.push({
            emoji,
            count: index + 1,
            userId,
            delay: delay + (index * 300), // Stagger each reaction
          });
        });
        delay += userIds.length * 300 + 500; // Add pause between emoji groups
      });

      setReplayReactions(allReactions);

      // Start replay animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsPlaying(true);
      });
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsPlaying(false);
        setReplayReactions([]);
      });
    }
  }, [isVisible, reactions, fadeAnim]);

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Reaction History</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.replayArea}>
            {isPlaying && replayReactions.map((reaction, index) => (
              <AnimatedReaction
                key={`${reaction.emoji}-${reaction.userId}-${index}`}
                emoji={reaction.emoji}
                finalCount={reaction.count}
                delay={reaction.delay}
              />
            ))}
          </View>

          <Text style={styles.instruction}>
            {isPlaying ? 'Watch the reactions appear in order...' : 'Tap to replay'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface AnimatedReactionProps {
  emoji: string;
  finalCount: number;
  delay: number;
}

const AnimatedReaction: React.FC<AnimatedReactionProps> = ({
  emoji,
  finalCount,
  delay,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [currentCount, setCurrentCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Pop in animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Count up animation
        setCurrentCount(finalCount);

        // Settle down
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, scaleAnim, bounceAnim, finalCount]);

  return (
    <Animated.View
      style={[
        styles.animatedReaction,
        {
          transform: [
            { scale: scaleAnim },
            {
              translateY: bounceAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [20, -5, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      <Text style={styles.reactionCount}>{currentCount}</Text>
    </Animated.View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.app.overlayScrim,
    zIndex: 2500,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  replayArea: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  animatedReaction: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
  },
  reactionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  reactionCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  instruction: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});

export default ReactionReplay;
