import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface FloatingReactionProps {
  emoji: string;
  startX: number;
  startY: number;
  onComplete: () => void;
}

const FloatingReaction: React.FC<FloatingReactionProps> = ({
  emoji,
  startX,
  startY,
  onComplete,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Random curve for natural floating effect
    const randomCurve = Math.random() * 40 - 20; // -20 to +20
    const randomDelay = Math.random() * 200; // 0-200ms stagger

    Animated.sequence([
      // Initial pop-in
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Wait a bit
      Animated.delay(200 + randomDelay),
      // Float up with curve and fade out
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: -60 - Math.random() * 20, // Float up 60-80px
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: randomCurve,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete();
    });
  }, [emoji, startX, startY, onComplete, fadeAnim, scaleAnim, translateXAnim, translateYAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: startX,
          top: startY,
          opacity: fadeAnim,
          transform: [
            { translateX: translateXAnim },
            { translateY: translateYAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 3000,
  },
  emoji: {
    fontSize: 28,
    textShadowColor: theme.app.emojiShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default FloatingReaction;
