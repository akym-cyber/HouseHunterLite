import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TimeSeparatorProps {
  timeText: string;
}

const TimeSeparator: React.FC<TimeSeparatorProps> = ({ timeText }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{timeText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    backgroundColor: '#F8F8F8',
    color: '#999999',
    fontSize: 11,
    fontWeight: '400',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default TimeSeparator;
