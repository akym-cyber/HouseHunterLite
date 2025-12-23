import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DateSeparatorProps {
  dateText: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ dateText }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{dateText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  text: {
    backgroundColor: '#F0F0F0',
    color: '#666666',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default DateSeparator;
