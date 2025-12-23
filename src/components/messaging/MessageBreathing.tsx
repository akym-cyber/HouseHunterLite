import React, { useEffect, useRef, useMemo } from 'react';
import { Animated } from 'react-native';

interface MessageBreathingProps {
  reactions: { [emoji: string]: string[] };
  replyCount?: number;
  children: React.ReactNode;
}

const MessageBreathing: React.FC<MessageBreathingProps> = ({
  reactions,
  replyCount = 0,
  children,
}) => {
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Calculate activity level
  const activityLevel = useMemo(() => {
    const totalReactions = Object.values(reactions).reduce((sum, users) => sum + users.length, 0);
    const totalActivity = totalReactions + replyCount;

    // Only breathe if there's significant activity (3+ reactions or replies)
    if (totalActivity >= 3) {
      // Scale breathing intensity based on activity (0.5% to 1.0% scale)
      const intensity = Math.min(0.01, totalActivity * 0.001);
      return intensity;
    }
    return 0;
  }, [reactions, replyCount]);

  useEffect(() => {
    if (activityLevel > 0) {
      // Create very subtle breathing animation
      const breathingAnimation = Animated.loop(
        Animated.sequence([
          // Inhale (scale up slightly)
          Animated.timing(breathAnim, {
            toValue: 1 + activityLevel,
            duration: 3000 + Math.random() * 1000, // 3-4 seconds, slightly randomized
            useNativeDriver: true,
          }),
          // Hold
          Animated.delay(500),
          // Exhale (scale down slightly)
          Animated.timing(breathAnim, {
            toValue: 1 - activityLevel * 0.5,
            duration: 3000 + Math.random() * 1000, // 3-4 seconds, slightly randomized
            useNativeDriver: true,
          }),
          // Hold
          Animated.delay(500),
        ])
      );

      breathingAnimation.start();

      return () => {
        breathingAnimation.stop();
        // Reset to normal scale
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      };
    } else {
      // Reset to normal if activity drops
      Animated.timing(breathAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [activityLevel, breathAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: breathAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};

export default MessageBreathing;
