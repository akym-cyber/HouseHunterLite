import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface TimeSeparatorProps {
  timeText: string;
}

const TimeSeparator: React.FC<TimeSeparatorProps> = ({ timeText }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{timeText}</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    backgroundColor: theme.app.timeSeparatorBackground,
    color: theme.app.timeSeparatorText,
    fontSize: 11,
    fontWeight: '400',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default TimeSeparator;
