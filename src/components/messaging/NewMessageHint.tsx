import React, { useEffect, useRef, useMemo } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface NewMessageHintProps {
  count: number;
  onPress: () => void;
  visible: boolean;
}

const NewMessageHint: React.FC<NewMessageHintProps> = ({ count, onPress, visible }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulsing animation
      const startPulse = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startPulse();
    } else {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
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
  }, [visible, fadeAnim, scaleAnim, pulseAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.hintButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.hintText}>
          {count > 1 ? `${count} new messages` : 'New message'}
        </Text>
        <Text style={styles.hintIcon}>↓</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.select({
      ios: 100, // Above input area
      android: 120,
      default: 100,
    }),
    right: 20,
    zIndex: 1000,
  },
  hintButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // Subtle shadow for floating effect
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  hintText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  hintIcon: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default NewMessageHint;
