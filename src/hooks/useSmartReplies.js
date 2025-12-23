// Kenyan Smart Replies React Hook
import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateSmartReplies, detectContextFromMessage } from '../services/keywordReplies.js';
import { getCountyByName } from '../utils/kenyanCounties.js';
import { detectUserPaymentMethods } from '../utils/paymentMethods.js';

const useSmartReplies = (currentMessage = '', userContext = {}) => {
  const [smartReplies, setSmartReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedContext, setDetectedContext] = useState({});

  // Default user context
  const defaultContext = useMemo(() => ({
    userCounty: 'nairobi',
    userPaymentMethods: ['mpesa', 'cash'],
    propertyType: null,
    currentProperty: null,
    userLocation: null,
    phoneNetwork: 'safaricom', // Default assumption
    hasSwyptAccount: false,
    hasBankAccount: false,
    ...userContext
  }), [userContext]);

  // Enhanced context with user payment methods detection
  const enhancedContext = useMemo(() => {
    const userPaymentMethods = detectUserPaymentMethods({
      phoneNetwork: defaultContext.phoneNetwork,
      hasSwyptAccount: defaultContext.hasSwyptAccount,
      hasBankAccount: defaultContext.hasBankAccount
    });

    return {
      ...defaultContext,
      userPaymentMethods
    };
  }, [defaultContext]);

  // Generate smart replies when message changes
  useEffect(() => {
    if (!currentMessage || currentMessage.trim().length < 2) {
      setSmartReplies([]);
      setDetectedContext({});
      return;
    }

    setIsLoading(true);

    // Debounce the reply generation for better performance
    const timeoutId = setTimeout(() => {
      try {
        // Detect context from the current message
        const context = detectContextFromMessage(currentMessage, enhancedContext);
        setDetectedContext(context);

        // Generate smart replies
        const replies = generateSmartReplies(currentMessage, enhancedContext);
        setSmartReplies(replies);
      } catch (error) {
        console.error('Error generating smart replies:', error);
        setSmartReplies([]);
      } finally {
        setIsLoading(false);
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentMessage, enhancedContext]);

  // Function to regenerate replies with updated context
  const regenerateReplies = useCallback((updatedContext = {}) => {
    const newContext = { ...enhancedContext, ...updatedContext };
    const replies = generateSmartReplies(currentMessage, newContext);
    setSmartReplies(replies);
  }, [currentMessage, enhancedContext]);

  // Function to select a smart reply
  const selectReply = useCallback((replyText) => {
    // You can add analytics tracking here
    console.log('Smart reply selected:', replyText);

    // Return the selected reply for the parent component to handle
    return replyText;
  }, []);

  // Function to get county information for UI display
  const getCountyInfo = useCallback(() => {
    const countyName = detectedContext.county || enhancedContext.userCounty;
    return getCountyByName(countyName);
  }, [detectedContext.county, enhancedContext.userCounty]);

  // Function to check if Swahili should be used
  const shouldUseSwahili = useCallback(() => {
    return detectedContext.isSwahili || false;
  }, [detectedContext.isSwahili]);

  return {
    smartReplies,
    isLoading,
    detectedContext,
    selectReply,
    regenerateReplies,
    getCountyInfo,
    shouldUseSwahili,
    // Expose context for debugging
    context: enhancedContext
  };
};

export default useSmartReplies;

// Hook for managing Kenyan context specifically
export const useKenyanContext = () => {
  const [userCounty, setUserCounty] = useState('nairobi');
  const [phoneNetwork, setPhoneNetwork] = useState('safaricom');
  const [hasSwyptAccount, setHasSwyptAccount] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('english');

  // Load user preferences from storage (you would implement this)
  useEffect(() => {
    // Load from AsyncStorage or your preferred storage
    // For now, using defaults
  }, []);

  const updateCounty = useCallback((county) => {
    setUserCounty(county);
    // Persist to storage
  }, []);

  const updatePhoneNetwork = useCallback((network) => {
    setPhoneNetwork(network);
    // Persist to storage
  }, []);

  const context = useMemo(() => ({
    userCounty,
    phoneNetwork,
    hasSwyptAccount,
    hasBankAccount,
    preferredLanguage,
    userPaymentMethods: detectUserPaymentMethods({
      phoneNetwork,
      hasSwyptAccount,
      hasBankAccount
    })
  }), [userCounty, phoneNetwork, hasSwyptAccount, hasBankAccount, preferredLanguage]);

  return {
    context,
    updateCounty,
    updatePhoneNetwork,
    setHasSwyptAccount,
    setHasBankAccount,
    setPreferredLanguage
  };
};
