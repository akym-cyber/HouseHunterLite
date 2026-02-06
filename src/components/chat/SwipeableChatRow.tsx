import React, { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

type SwipeableChatRowProps = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function SwipeableChatRow({
  children,
  onPress,
  onLongPress,
  onDelete,
  style,
}: SwipeableChatRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        style={[styles.row, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.75}
      >
        {children}
      </TouchableOpacity>
    </Swipeable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 8,
    marginBottom: 2,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
