// Kenyan Smart Reply Buttons Component
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Chip } from 'react-native-paper';
import { getPaymentMethod } from '../../utils/paymentMethods.js';

const SmartReplyButtons = ({
  replies = [],
  isLoading = false,
  onReplySelect,
  detectedContext = {},
  style = {}
}) => {
  // Don't render if no replies or still loading
  if (isLoading || !replies.length) {
    return null;
  }

  const handleReplyPress = (replyText) => {
    // Analytics tracking (optional)
    console.log('Smart reply tapped:', replyText);

    // Call the parent handler
    if (onReplySelect) {
      onReplySelect(replyText);
    }
  };

  const getReplyStyle = (replyText) => {
    // Check if this is a payment-related reply
    const isPaymentReply = /\b(mpesa|swypt|airtel|pay|ksh|deposit)\b/i.test(replyText);

    if (isPaymentReply) {
      // Detect payment method and apply appropriate styling
      if (replyText.toLowerCase().includes('mpesa')) {
        return styles.mpesaReply;
      } else if (replyText.toLowerCase().includes('swypt')) {
        return styles.swyptReply;
      } else if (replyText.toLowerCase().includes('airtel')) {
        return styles.airtelReply;
      }
    }

    return styles.defaultReply;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.repliesContainer}>
        {replies.map((reply, index) => (
          <TouchableOpacity
            key={`${reply}-${index}`}
            style={[styles.replyButton, getReplyStyle(reply)]}
            onPress={() => handleReplyPress(reply)}
            activeOpacity={0.7}
          >
            <Text style={[styles.replyText, getReplyStyle(reply).textColor && { color: getReplyStyle(reply).textColor }]}>
              {reply}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* County indicator (optional) */}
      {detectedContext.county && (
        <View style={styles.countyIndicator}>
          <Chip
            mode="outlined"
            style={styles.countyChip}
            textStyle={styles.countyChipText}
          >
            📍 {detectedContext.county.charAt(0).toUpperCase() + detectedContext.county.slice(1)}
          </Chip>
        </View>
      )}
    </View>
  );
};

// Loading state component
export const SmartReplyLoading = ({ message = 'Thinking...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color="#007AFF" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  repliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  replyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
    maxWidth: '48%', // Allow 2 buttons per row
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultReply: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E0E0E0',
  },
  mpesaReply: {
    backgroundColor: '#FFC72C',
    borderColor: '#FFC72C',
    textColor: '#000000',
  },
  swyptReply: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
    textColor: '#FFFFFF',
  },
  airtelReply: {
    backgroundColor: '#E30613',
    borderColor: '#E30613',
    textColor: '#FFFFFF',
  },
  replyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333333',
  },
  countyIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  countyChip: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
  },
  countyChipText: {
    color: '#007AFF',
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
});

export default SmartReplyButtons;
