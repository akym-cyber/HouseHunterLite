// Kenyan Payment Methods Integration
// Supports M-Pesa, Swypt, Airtel Money, Bank Transfer, Cash, Cheque

import { lightAppColors } from '../theme/colors';

const paymentColors = lightAppColors.payment;

// Payment method definitions with Kenyan-specific details
export const PAYMENT_METHODS = {
  mpesa: {
    name: 'M-Pesa',
    provider: 'Safaricom',
    instructions: 'Lipa na M-Pesa: Paybill 123456',
    shortInstructions: 'Paybill 123456',
    color: paymentColors.yellow,
    textColor: paymentColors.yellowText,
    icon: '💰',
    networks: ['safaricom'],
    fees: 'Free for most transactions',
    limits: 'Up to Ksh 500,000/day',
    processingTime: 'Instant'
  },
  swypt: {
    name: 'Swypt',
    provider: 'Swypt',
    instructions: 'Pay securely via Swypt app',
    shortInstructions: 'Via Swypt app',
    color: paymentColors.green,
    textColor: paymentColors.greenText,
    icon: '🔄',
    networks: ['all'],
    fees: 'Low transaction fees',
    limits: 'Based on account limits',
    processingTime: 'Instant'
  },
  airtel: {
    name: 'Airtel Money',
    provider: 'Airtel',
    instructions: 'Airtel Money: *247# or app',
    shortInstructions: '*247# or app',
    color: paymentColors.red,
    textColor: paymentColors.redText,
    icon: '📱',
    networks: ['airtel'],
    fees: 'Standard Airtel Money fees',
    limits: 'Up to Ksh 100,000/transaction',
    processingTime: 'Instant'
  },
  bank: {
    name: 'Bank Transfer',
    provider: 'Various Banks',
    instructions: 'Bank transfer to: Equity Bank 1234567890',
    shortInstructions: 'Bank transfer',
    color: paymentColors.blue,
    textColor: paymentColors.blueText,
    icon: '🏦',
    networks: ['all'],
    fees: 'Bank charges apply',
    limits: 'No limits',
    processingTime: '1-3 business days'
  },
  cash: {
    name: 'Cash',
    provider: 'In Person',
    instructions: 'Cash payment on viewing/property handover',
    shortInstructions: 'Cash on viewing',
    color: paymentColors.lime,
    textColor: paymentColors.limeText,
    icon: '💵',
    networks: ['all'],
    fees: 'No fees',
    limits: 'No limits',
    processingTime: 'Immediate'
  },
  cheque: {
    name: 'Cheque',
    provider: 'Bank Cheque',
    instructions: 'Bank cheque payable to HouseHunter Ltd',
    shortInstructions: 'Bank cheque',
    color: paymentColors.purple,
    textColor: paymentColors.purpleText,
    icon: '📄',
    networks: ['all'],
    fees: 'Bank charges may apply',
    limits: 'No limits',
    processingTime: '3-7 business days'
  }
};

// County-specific payment method popularity and availability
export const COUNTY_PAYMENT_PREFERENCES = {
  // Major cities with all payment options
  nairobi: ['mpesa', 'swypt', 'bank', 'cash', 'airtel', 'cheque'],
  mombasa: ['mpesa', 'airtel', 'bank', 'cash', 'swypt'],
  kisumu: ['mpesa', 'swypt', 'bank', 'cash'],
  nakuru: ['mpesa', 'bank', 'cash', 'swypt'],
  eldoret: ['mpesa', 'bank', 'cash'],

  // Default for counties not explicitly listed
  default: ['mpesa', 'cash']
};

// Network detection based on phone number patterns
export const NETWORK_PATTERNS = {
  safaricom: [/^(07[0-2]|07[8-9]|011\d{6})/], // 070-072, 078-079, 011
  airtel: [/^(073[0-9]|075[7-9]|011\d{6})/],   // 073, 0757-0759
  telkom: [/^(077[0-9])/],                      // 077
  equitel: [/^(076[8-9])/],                     // 0768-0769
  unknown: []                                  // Fallback
};

// Helper functions
export const getPaymentMethod = (methodKey) => {
  return PAYMENT_METHODS[methodKey.toLowerCase()] || null;
};

export const getPopularPaymentMethod = (countyName) => {
  const countyKey = countyName.toLowerCase().replace(/\s+/g, '_');
  const availableMethods = COUNTY_PAYMENT_PREFERENCES[countyKey] || COUNTY_PAYMENT_PREFERENCES.default;
  return availableMethods[0]; // First method is most popular
};

export const getOrderedPaymentMethods = (countyName) => {
  const countyKey = countyName.toLowerCase().replace(/\s+/g, '_');
  return COUNTY_PAYMENT_PREFERENCES[countyKey] || COUNTY_PAYMENT_PREFERENCES.default;
};

export const detectUserPaymentMethods = (userProfile = {}) => {
  const {
    phoneNetwork = 'safaricom',
    hasSwyptAccount = false,
    hasBankAccount = false,
    hasAirtelMoney = false,
    preferredMethods = []
  } = userProfile;

  const availableMethods = [];

  // Always include M-Pesa for Safaricom users
  if (phoneNetwork === 'safaricom') {
    availableMethods.push('mpesa');
  }

  // Include Airtel Money for Airtel users
  if (phoneNetwork === 'airtel' || hasAirtelMoney) {
    availableMethods.push('airtel');
  }

  // Include Swypt if user has account
  if (hasSwyptAccount) {
    availableMethods.push('swypt');
  }

  // Include bank transfer if user has bank account
  if (hasBankAccount) {
    availableMethods.push('bank');
  }

  // Always include cash as fallback
  availableMethods.push('cash');

  // Add user preferences at the beginning
  if (preferredMethods.length > 0) {
    const prioritizedMethods = [...preferredMethods, ...availableMethods.filter(m => !preferredMethods.includes(m))];
    return prioritizedMethods.slice(0, 4); // Limit to 4 methods
  }

  return availableMethods.slice(0, 4);
};

export const detectNetworkFromPhone = (phoneNumber) => {
  if (!phoneNumber) return 'unknown';

  // Clean phone number (remove spaces, +, 254 prefix)
  const cleanNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+?254/, '');

  for (const [network, patterns] of Object.entries(NETWORK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(cleanNumber)) {
        return network;
      }
    }
  }

  return 'unknown';
};

export const generatePaymentReply = (method, amount = null, context = {}) => {
  const paymentMethod = getPaymentMethod(method);
  if (!paymentMethod) return `Pay via ${method}`;

  let reply = paymentMethod.instructions;

  if (amount) {
    reply = `Pay Ksh ${amount.toLocaleString()}: ${paymentMethod.shortInstructions}`;
  }

  // Add contextual information
  if (context.isDeposit) {
    reply += ' (Deposit)';
  } else if (context.isViewing) {
    reply += ' (Viewing fee)';
  }

  return reply;
};

export const getPaymentMethodForCounty = (countyName, userMethods = []) => {
  const countyMethods = getOrderedPaymentMethods(countyName);
  const availableMethods = userMethods.length > 0 ? userMethods : countyMethods;

  // Return the first available method
  return availableMethods[0] || 'cash';
};

export const formatPaymentInstruction = (method, amount = null, propertyType = null) => {
  const paymentMethod = getPaymentMethod(method);
  if (!paymentMethod) return `Pay via ${method}`;

  let instruction = paymentMethod.instructions;

  if (amount) {
    const amountText = `Ksh ${amount.toLocaleString()}`;
    instruction = `${amountText} via ${paymentMethod.shortInstructions}`;

    if (propertyType) {
      instruction += ` (${propertyType} ${paymentMethod.name})`;
    }
  }

  return instruction;
};

// Validation functions
export const isValidPaymentMethod = (method) => {
  return method in PAYMENT_METHODS;
};

export const validatePhoneForPayment = (phoneNumber, method) => {
  const network = detectNetworkFromPhone(phoneNumber);

  switch (method.toLowerCase()) {
    case 'mpesa':
      return network === 'safaricom';
    case 'airtel':
      return network === 'airtel';
    default:
      return true; // Other methods don't require specific networks
  }
};

// Export all payment methods for easy access
export const getAllPaymentMethods = () => {
  return Object.keys(PAYMENT_METHODS);
};

export const getPaymentMethodsByNetwork = (network) => {
  return Object.entries(PAYMENT_METHODS)
    .filter(([_, method]) => method.networks.includes(network) || method.networks.includes('all'))
    .map(([key, _]) => key);
};

// Debug/Testing functions
export const testPaymentMethods = () => {
  console.log('🧪 Testing Kenyan Payment Methods:');

  // Test network detection
  const testPhones = ['0712345678', '0733456789', '0774567890'];
  testPhones.forEach(phone => {
    const network = detectNetworkFromPhone(phone);
    console.log(`Phone ${phone} → Network: ${network}`);
  });

  // Test user payment method detection
  const testUsers = [
    { phoneNetwork: 'safaricom', hasSwyptAccount: true },
    { phoneNetwork: 'airtel', hasBankAccount: true },
    { phoneNetwork: 'unknown', hasSwyptAccount: false }
  ];

  testUsers.forEach((user, i) => {
    const methods = detectUserPaymentMethods(user);
    console.log(`User ${i + 1} (${user.phoneNetwork}) → Methods: ${methods.join(', ')}`);
  });

  console.log('✅ Payment methods validation complete');
};
