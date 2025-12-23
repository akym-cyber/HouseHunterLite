import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';

interface MessageEmotionPulseProps {
  reactions: { [emoji: string]: string[] };
  children: React.ReactNode;
}

const MessageEmotionPulse: React.FC<MessageEmotionPulseProps> = ({
  reactions,
  children,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Calculate emotion data from reactions
  const emotionData = useMemo(() => {
    const totalReactions = Object.values(reactions).reduce((sum, users) => sum + users.length, 0);
    const dominantEmoji = Object.entries(reactions)
      .reduce((max, [emoji, users]) =>
        users.length > (reactions[max]?.length || 0) ? emoji : max, '');

    // Map emojis to colors and intensities
    const emotionMap: { [key: string]: { color: string; intensity: number } } = {
      '❤️': { color: '#FF1744', intensity: 0.4 }, // Red for love
      '👍': { color: '#2196F3', intensity: 0.3 }, // Blue for approval
      '😂': { color: '#FF9800', intensity: 0.35 }, // Orange for laughter
      '😮': { color: '#9C27B0', intensity: 0.3 }, // Purple for surprise
      '😢': { color: '#00BCD4', intensity: 0.25 }, // Cyan for sadness
      '😡': { color: '#F44336', intensity: 0.45 }, // Red for anger
      '🙌': { color: '#FFC107', intensity: 0.35 }, // Yellow for celebration
      '👏': { color: '#4CAF50', intensity: 0.3 }, // Green for applause
    };

    const emotion = emotionMap[dominantEmoji] || { color: '#E1F5FE', intensity: 0.1 };
    const intensity = Math.min(totalReactions * 0.1, emotion.intensity); // Cap intensity

    return {
      color: emotion.color,
      intensity: totalReactions > 0 ? intensity : 0,
      totalReactions,
    };
  }, [reactions]);

  useEffect(() => {
    if (emotionData.totalReactions > 0) {
      // Create continuous pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: emotionData.intensity * 0.8,
              duration: 2000,
              useNativeDriver: false, // Background color animation
            }),
            Animated.timing(glowAnim, {
              toValue: emotionData.intensity * 0.6,
              duration: 2000,
              useNativeDriver: false, // Shadow animation
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: emotionData.intensity * 0.3,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: emotionData.intensity * 0.2,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
        // Reset to zero when unmounting
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      };
    }
  }, [emotionData, pulseAnim, glowAnim]);

  // Interpolate background color based on emotion
  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', emotionData.color + '15'], // Very subtle alpha
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          ...Platform.select({
            ios: {
              shadowOpacity,
              shadowColor: emotionData.color,
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 6],
              }),
            },
            android: {
              elevation: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2],
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
        shadowOffset: { width: 0, height: 1 },
      },
    }),
  },
});

export default MessageEmotionPulse;
