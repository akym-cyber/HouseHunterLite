import { StyleSheet, Platform } from 'react-native';

// Instagram-style message bubble shapes with tails
// Uses CSS border tricks to create triangular tails without SVG
// Colors match the app's existing theme (#007AFF for sent, #E9E9EB for received)

export const createBubbleStyles = (bubbleColor = '#007AFF') => {
  return StyleSheet.create({
    // Base bubble styles
    bubble: {
      maxWidth: '80%',
      minWidth: Platform.select({
        ios: 70,
        android: 60,
        default: 50,
      }),
      minHeight: 40,
      padding: Platform.select({
        ios: 12,
        android: 10,
        default: 8,
      }),
      position: 'relative',
    },

    // Sent message bubble (right tail)
    sentBubble: {
      backgroundColor: bubbleColor,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 4, // Sharp corner
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 4,
      marginRight: 12, // Space for tail
    },

    // Received message bubble (left tail)
    receivedBubble: {
      backgroundColor: bubbleColor,
      borderTopLeftRadius: 4, // Sharp corner
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 18,
      marginLeft: 12, // Space for tail
    },

    // Tail for sent messages (right-pointing)
    sentTail: {
      position: 'absolute',
      right: -8,
      bottom: 8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderLeftColor: bubbleColor,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
      borderBottomWidth: 6,
      borderBottomColor: 'transparent',
    },

    // Tail for received messages (left-pointing)
    receivedTail: {
      position: 'absolute',
      left: -8,
      bottom: 8,
      width: 0,
      height: 0,
      borderRightWidth: 8,
      borderRightColor: bubbleColor,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
      borderBottomWidth: 6,
      borderBottomColor: 'transparent',
    },

    // Container for bubble with tail
    bubbleContainer: {
      position: 'relative',
      marginBottom: Platform.select({
        ios: 8,
        android: 6,
        default: 4,
      }),
    },
  });
};

// App's existing theme colors
export const appBubbleThemes = {
  sent: createBubbleStyles('#007AFF'), // App's sent message color
  received: createBubbleStyles('#E9E9EB'), // App's received message color
};

// Helper function to get bubble styles based on message type
export const getBubbleStyle = (isOwnMessage, customColor) => {
  const color = customColor || (isOwnMessage ? '#007AFF' : '#E9E9EB');
  return createBubbleStyles(color);
};
