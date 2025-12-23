import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';

interface MessageHighlightProps {
  isHighlighted: boolean;
  isMention?: boolean;
  isImportant?: boolean;
  children: React.ReactNode;
}

const MessageHighlight: React.FC<MessageHighlightProps> = ({
  isHighlighted,
  isMention = false,
  isImportant = false,
  children,
}) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      // Determine highlight style based on type
      const highlightColor = isMention ? 1 : isImportant ? 2 : 0; // 0=default, 1=mention, 2=important
      const scaleTarget = isMention ? 1.02 : isImportant ? 1.03 : 1.01;
      const glowIntensity = isMention ? 0.8 : isImportant ? 1.0 : 0.6;

      Animated.parallel([
        // Glow effect
        Animated.timing(glowAnim, {
          toValue: glowIntensity,
          duration: 200,
          useNativeDriver: false, // Background glow needs main thread
        }),
        // Subtle scale
        Animated.spring(scaleAnim, {
          toValue: scaleTarget,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        // Color shift for mentions
        Animated.timing(colorAnim, {
          toValue: highlightColor,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Fade out after highlight duration
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.timing(colorAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start();
        }, isMention ? 2000 : isImportant ? 2500 : 1500); // Different durations for different highlight types
      });
    }
  }, [isHighlighted, isMention, isImportant, glowAnim, scaleAnim, colorAnim]);

  // Interpolate color for mention highlights
  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      'transparent', // Normal
      'rgba(255, 193, 7, 0.15)', // Mention (yellow tint)
      'rgba(244, 67, 54, 0.1)', // Important (red tint)
    ],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ scale: scaleAnim }],
          ...Platform.select({
            ios: {
              shadowOpacity,
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 8],
              }),
              shadowColor: colorAnim.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ['transparent', '#FFC107', '#F44336'],
              }),
            },
            android: {
              elevation: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 4],
              }),
            },
          }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
});

export default MessageHighlight;
