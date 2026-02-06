export type AppColors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  inputBackground: string;
  placeholder: string;
  icon: string;
  iconOnDark: string;
  favoriteActive: string;
  divider: string;
  shadow: string;
  emojiShadow: string;
  overlayDark: string;
  overlayStrong: string;
  overlayScrim: string;
  overlayLight: string;
  overlayLightStrong: string;
  overlayMedium: string;
  mediaPlaceholder: string;
  mediaModalBackground: string;
  mediaBadgeBackground: string;
  mediaDotInactive: string;
  mediaCounterBackground: string;
  chatBackground: string;
  chatBubbleSent: string;
  chatBubbleReceived: string;
  chatBubbleSentText: string;
  chatBubbleReceivedText: string;
  chatBubbleSentMeta: string;
  chatBubbleReceivedMeta: string;
  chatStatusRead: string;
  chatStatusError: string;
  chatTypingBubble: string;
  chatTypingDot: string;
  dateSeparatorBackground: string;
  dateSeparatorText: string;
  timeSeparatorBackground: string;
  timeSeparatorText: string;
  recordingAccent: string;
  recordingBackground: string;
  smartReplyBackground: string;
  smartReplyText: string;
  payment: {
    yellow: string;
    yellowText: string;
    green: string;
    greenText: string;
    red: string;
    redText: string;
    blue: string;
    blueText: string;
    lime: string;
    limeText: string;
    purple: string;
    purpleText: string;
  };
  reactions: {
    love: string;
    approve: string;
    laugh: string;
    surprise: string;
    sadness: string;
    anger: string;
    celebration: string;
    applause: string;
    neutral: string;
  };
  highlight: {
    mention: string;
    important: string;
  };
};

export const lightAppColors: AppColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#F5F5F5',
  textPrimary: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  primary: '#2196F3',
  secondary: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  inputBackground: '#F5F5F5',
  placeholder: '#757575',
  icon: '#757575',
  iconOnDark: '#FFFFFF',
  favoriteActive: '#FF0000',
  divider: '#E0E0E0',
  shadow: '#000000',
  emojiShadow: 'rgba(0, 0, 0, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
  overlayScrim: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',
  overlayLightStrong: 'rgba(255, 255, 255, 0.9)',
  overlayMedium: 'rgba(0, 0, 0, 0.3)',
  mediaPlaceholder: '#EDEDED',
  mediaModalBackground: '#000000',
  mediaBadgeBackground: 'rgba(0, 0, 0, 0.55)',
  mediaDotInactive: 'rgba(255, 255, 255, 0.5)',
  mediaCounterBackground: 'rgba(0, 0, 0, 0.5)',
  chatBackground: '#FFFFFF',
  chatBubbleSent: '#007AFF',
  chatBubbleReceived: '#E5E5EA',
  chatBubbleSentText: '#FFFFFF',
  chatBubbleReceivedText: '#000000',
  chatBubbleSentMeta: 'rgba(255, 255, 255, 0.8)',
  chatBubbleReceivedMeta: 'rgba(0, 0, 0, 0.6)',
  chatStatusRead: '#00D4AA',
  chatStatusError: '#FF3B30',
  chatTypingBubble: '#E5E5EA',
  chatTypingDot: '#666666',
  dateSeparatorBackground: '#F0F0F0',
  dateSeparatorText: '#666666',
  timeSeparatorBackground: '#F8F8F8',
  timeSeparatorText: '#999999',
  recordingAccent: '#ff4444',
  recordingBackground: 'rgba(255, 244, 244, 0.9)',
  smartReplyBackground: '#F8F9FA',
  smartReplyText: '#333333',
  payment: {
    yellow: '#FFC72C',
    yellowText: '#000000',
    green: '#00B894',
    greenText: '#FFFFFF',
    red: '#E30613',
    redText: '#FFFFFF',
    blue: '#4A90E2',
    blueText: '#FFFFFF',
    lime: '#7ED321',
    limeText: '#FFFFFF',
    purple: '#9013FE',
    purpleText: '#FFFFFF',
  },
  reactions: {
    love: '#FF1744',
    approve: '#2196F3',
    laugh: '#FF9800',
    surprise: '#9C27B0',
    sadness: '#00BCD4',
    anger: '#F44336',
    celebration: '#FFC107',
    applause: '#4CAF50',
    neutral: '#E1F5FE',
  },
  highlight: {
    mention: '#FFC107',
    important: '#F44336',
  },
};

export const darkAppColors: AppColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#242424',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#424242',
  primary: '#90CAF9',
  secondary: '#FFB74D',
  error: '#EF5350',
  success: '#81C784',
  warning: '#FFB74D',
  info: '#90CAF9',
  inputBackground: '#1F1F1F',
  placeholder: '#8A8A8A',
  icon: '#B0B0B0',
  iconOnDark: '#FFFFFF',
  favoriteActive: '#FF453A',
  divider: '#2F2F2F',
  shadow: '#000000',
  emojiShadow: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  overlayStrong: 'rgba(0, 0, 0, 0.85)',
  overlayScrim: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(255, 255, 255, 0.08)',
  overlayLightStrong: 'rgba(255, 255, 255, 0.18)',
  overlayMedium: 'rgba(0, 0, 0, 0.4)',
  mediaPlaceholder: '#1F1F1F',
  mediaModalBackground: '#000000',
  mediaBadgeBackground: 'rgba(0, 0, 0, 0.6)',
  mediaDotInactive: 'rgba(255, 255, 255, 0.4)',
  mediaCounterBackground: 'rgba(0, 0, 0, 0.6)',
  chatBackground: '#121212',
  chatBubbleSent: '#0A84FF',
  chatBubbleReceived: '#2C2C2E',
  chatBubbleSentText: '#FFFFFF',
  chatBubbleReceivedText: '#FFFFFF',
  chatBubbleSentMeta: 'rgba(255, 255, 255, 0.8)',
  chatBubbleReceivedMeta: 'rgba(255, 255, 255, 0.6)',
  chatStatusRead: '#00D4AA',
  chatStatusError: '#FF3B30',
  chatTypingBubble: '#2C2C2E',
  chatTypingDot: '#B0B0B0',
  dateSeparatorBackground: '#1E1E1E',
  dateSeparatorText: '#8A8A8A',
  timeSeparatorBackground: '#1E1E1E',
  timeSeparatorText: '#8A8A8A',
  recordingAccent: '#FF6B6B',
  recordingBackground: 'rgba(255, 107, 107, 0.15)',
  smartReplyBackground: '#1A1A1A',
  smartReplyText: '#E0E0E0',
  payment: {
    yellow: '#FFC72C',
    yellowText: '#000000',
    green: '#00B894',
    greenText: '#FFFFFF',
    red: '#E30613',
    redText: '#FFFFFF',
    blue: '#4A90E2',
    blueText: '#FFFFFF',
    lime: '#7ED321',
    limeText: '#FFFFFF',
    purple: '#9013FE',
    purpleText: '#FFFFFF',
  },
  reactions: {
    love: '#FF1744',
    approve: '#2196F3',
    laugh: '#FF9800',
    surprise: '#9C27B0',
    sadness: '#00BCD4',
    anger: '#F44336',
    celebration: '#FFC107',
    applause: '#4CAF50',
    neutral: '#1E3A4A',
  },
  highlight: {
    mention: '#FFC107',
    important: '#F44336',
  },
};
