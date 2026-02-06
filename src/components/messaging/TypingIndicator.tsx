import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';

// Animated typing indicator with three bouncing dots
const TypingIndicator: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current; // Start with subtle glow

  useEffect(() => {
    const createBounceAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -10,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600), // Pause between cycles
        ])
      );
    };

    const anim1 = createBounceAnimation(dot1Anim, 0);
    const anim2 = createBounceAnimation(dot2Anim, 200);
    const anim3 = createBounceAnimation(dot3Anim, 400);

    // Soft pulsing glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6, // More visible
          duration: 1500,
          useNativeDriver: false, // Background color animation needs main thread
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3, // Back to subtle
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    // Start all animations
    anim1.start();
    anim2.start();
    anim3.start();
    glowAnimation.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      glowAnimation.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim, glowAnim]);

  // Interpolate glow animation to background color
  const toRgba = (hexColor: string, alpha: number) => {
    const hex = hexColor.replace('#', '');
    const bigint = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0.3, 0.6],
    outputRange: [
      toRgba(theme.app.chatTypingBubble, 0.8),
      toRgba(theme.app.chatTypingBubble, 1.0),
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bubble, { backgroundColor }]}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Anim }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Anim }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Anim }] }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    marginVertical: Platform.select({
      ios: 4,
      android: 3,
      default: 2,
    }),
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    backgroundColor: theme.app.chatTypingBubble,
    borderRadius: 18,
    paddingHorizontal: Platform.select({
      ios: 12,
      android: 10,
      default: 8,
    }),
    paddingVertical: Platform.select({
      ios: 10,
      android: 8,
      default: 6,
    }),
    maxWidth: '78%',
    minWidth: Platform.select({
      ios: 70,
      android: 60,
      default: 50,
    }),
    minHeight: 40,
    // Subtle elevation
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.app.chatTypingDot,
    marginHorizontal: 2,
  },
});

export default TypingIndicator;
