// Kenyan Smart Reply Buttons Component
import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Chip } from 'react-native-paper';
import { useTheme } from '../../theme/useTheme';

const SmartReplyButtons = ({
  replies = [],
  isLoading = false,
  onReplySelect,
  detectedContext = {},
  style = {}
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  <SmartReplyLoadingInner message={message} />
);

const SmartReplyLoadingInner = ({ message }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={theme.app.chatBubbleSent} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
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
    backgroundColor: theme.app.smartReplyBackground,
    borderColor: theme.app.border,
  },
  mpesaReply: {
    backgroundColor: theme.app.payment.yellow,
    borderColor: theme.app.payment.yellow,
    textColor: theme.app.payment.yellowText,
  },
  swyptReply: {
    backgroundColor: theme.app.payment.green,
    borderColor: theme.app.payment.green,
    textColor: theme.app.payment.greenText,
  },
  airtelReply: {
    backgroundColor: theme.app.payment.red,
    borderColor: theme.app.payment.red,
    textColor: theme.app.payment.redText,
  },
  replyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.app.smartReplyText,
  },
  countyIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  countyChip: {
    backgroundColor: 'transparent',
    borderColor: theme.app.chatBubbleSent,
  },
  countyChipText: {
    color: theme.app.chatBubbleSent,
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
    color: theme.app.textSecondary,
    fontStyle: 'italic',
  },
});

export default SmartReplyButtons;
