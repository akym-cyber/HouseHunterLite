import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface FloatingQuickReplyProps {
  isVisible: boolean;
  messagePosition: { x: number; y: number; width: number; height: number };
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onForward: () => void;
  onClose: () => void;
}

interface QuickReplyButton {
  id: string;
  label: string;
  emoji?: string;
  action: () => void;
  color: string;
}

const FloatingQuickReply: React.FC<FloatingQuickReplyProps> = ({
  isVisible,
  messagePosition,
  onReply,
  onReaction,
  onForward,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [buttons, setButtons] = useState<QuickReplyButton[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (isVisible) {
      // Generate quick reply buttons
      const quickButtons: QuickReplyButton[] = [
        {
          id: 'thumbs-up',
          label: '👍',
          emoji: '👍',
          action: () => onReaction('👍'),
          color: theme.app.reactions.approve,
        },
        {
          id: 'laugh',
          label: '😂',
          emoji: '😂',
          action: () => onReaction('😂'),
          color: theme.app.reactions.laugh,
        },
        {
          id: 'reply',
          label: 'Reply',
          action: onReply,
          color: theme.colors.primary,
        },
        {
          id: 'forward',
          label: 'Forward',
          action: onForward,
          color: theme.app.reactions.surprise,
        },
      ];

      setButtons(quickButtons);

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
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
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
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setButtons([]);
      });
    }
  }, [isVisible, fadeAnim, slideAnim, bounceAnim, onReply, onReaction, onForward, theme]);

  if (!isVisible || buttons.length === 0) return null;

  // Calculate position - float above the message bubble
  const containerTop = Math.max(20, messagePosition.y - 120);
  const containerLeft = Math.max(20, Math.min(messagePosition.x, screenWidth - 300));

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
          styles.container,
          {
            top: containerTop,
            left: containerLeft,
            transform: [
              { translateY: slideAnim },
              { scale: bounceAnim },
            ],
          },
        ]}
      >
        <View style={styles.buttonsGrid}>
          {buttons.map((button, index) => (
            <AnimatedButton
              key={button.id}
              button={button}
              delay={index * 50}
              onPress={() => {
                button.action();
                onClose();
              }}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

interface AnimatedButtonProps {
  button: QuickReplyButton;
  delay: number;
  onPress: () => void;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ button, delay, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
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
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, scaleAnim, bounceAnim]);

  return (
    <Animated.View
      style={[
        styles.buttonWrapper,
        {
          transform: [
            { scale: scaleAnim },
            {
              translateY: bounceAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [10, -3, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, { backgroundColor: button.color }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {button.emoji || button.label}
        </Text>
      </TouchableOpacity>
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
    zIndex: 2200,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    maxWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  buttonWrapper: {
    margin: 6,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    fontSize: 18,
    color: theme.app.iconOnDark,
    fontWeight: '600',
  },
});

export default FloatingQuickReply;
