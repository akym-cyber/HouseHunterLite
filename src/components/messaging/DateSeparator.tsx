import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface DateSeparatorProps {
  dateText: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ dateText }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{dateText}</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  text: {
    backgroundColor: theme.app.dateSeparatorBackground,
    color: theme.app.dateSeparatorText,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default DateSeparator;
