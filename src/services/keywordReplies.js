// Kenyan Smart Replies Generation Engine
import { getCountyByName, formatKenyanPrice, formatKenyanPriceRange } from '../utils/kenyanCounties.js';
import { generatePaymentReply, getPopularPaymentMethod, getOrderedPaymentMethods } from '../utils/paymentMethods.js';
import {
  detectIntent,
  detectPropertyType,
  detectArea,
  detectCounty,
  detectPaymentMethod,
  detectBudgetRange,
  detectUrgency,
  isSwahiliMessage
} from '../utils/patterns.js';

// Main smart reply generation function
export const generateSmartReplies = (message, context = {}) => {
  const {
    userCounty = 'nairobi',
    userPaymentMethods = ['mpesa', 'cash'],
    propertyType = null,
    currentProperty = null
  } = context;

  // Analyze the incoming message
  const intents = detectIntent(message);
  const detectedPropertyType = detectPropertyType(message) || propertyType;
  const detectedArea = detectArea(message);
  const detectedCounty = detectCounty(message) || userCounty;
  const detectedPayment = detectPaymentMethod(message);
  const budgetRange = detectBudgetRange(message);
  const urgency = detectUrgency(message);
  const isSwahili = isSwahiliMessage(message);

  // Get county data for pricing
  const countyData = getCountyByName(detectedCounty);
  const popularPayment = getPopularPaymentMethod(detectedCounty);

  // Generate replies based on primary intent
  let replies = [];

  if (intents.includes('price')) {
    replies = generatePriceReplies(detectedPropertyType, countyData, budgetRange, isSwahili);
  } else if (intents.includes('availability')) {
    replies = generateAvailabilityReplies(detectedPropertyType, countyData, urgency, isSwahili);
  } else if (intents.includes('viewing')) {
    replies = generateViewingReplies(detectedPropertyType, countyData, urgency, isSwahili);
  } else if (intents.includes('location')) {
    replies = generateLocationReplies(detectedCounty, detectedArea, isSwahili);
  } else if (intents.includes('payment')) {
    replies = generatePaymentMethodReplies(userPaymentMethods, detectedPayment, countyData);
  } else if (intents.includes('deposit')) {
    replies = generateDepositReplies(detectedPropertyType, countyData, isSwahili);
  } else if (intents.includes('contact')) {
    replies = generateContactReplies(isSwahili);
  } else if (intents.includes('features')) {
    replies = generateFeatureReplies(detectedPropertyType, isSwahili);
  } else {
    // Default replies based on property type
    replies = generateDefaultReplies(detectedPropertyType, countyData, isSwahili);
  }

  // Ensure we always return exactly 3 replies
  while (replies.length < 3) {
    replies.push(getFallbackReply(isSwahili));
  }

  return replies.slice(0, 3); // Limit to 3 replies
};

// Price-related reply generation
const generatePriceReplies = (propertyType, countyData, budgetRange, isSwahili) => {
  if (!propertyType || !countyData.pricing[propertyType]) {
    return [
      isSwahili ? 'Bei inatofautiana, niambie aina ya nyumba' : 'Prices vary, tell me property type',
      isSwahili ? 'Kutoka Ksh 10,000 hadi 100,000' : 'From Ksh 10,000 to 100,000',
      isSwahili ? 'Bei gani unataka?' : 'What price range are you looking for?'
    ];
  }

  const [minPrice, maxPrice] = countyData.pricing[propertyType];
  const priceRange = formatKenyanPriceRange(minPrice, maxPrice);

  const replies = [
    priceRange,
    `${formatKenyanPrice(minPrice)} negotiable`,
    isSwahili ? 'Bei hii ni kwa mwezi' : 'This is monthly rent'
  ];

  // Add deposit information for first reply
  if (propertyType !== 'bedsitter') {
    replies[0] = `${priceRange} (${formatKenyanPrice(minPrice)} deposit)`;
  }

  return replies;
};

// Availability-related reply generation
const generateAvailabilityReplies = (propertyType, countyData, urgency, isSwahili) => {
  const timeframes = {
    now: isSwahili ? 'leo' : 'today',
    thisWeek: isSwahili ? 'wiki hii' : 'this week',
    nextWeek: isSwahili ? 'wiki ijayo' : 'next week',
    thisMonth: isSwahili ? 'mwezi huu' : 'this month',
    flexible: isSwahili ? 'wakati wowote' : 'anytime'
  };

  const timeframe = timeframes[urgency] || timeframes.flexible;

  return [
    isSwahili ? `Inapatikana ${timeframe}` : `Available ${timeframe}`,
    isSwahili ? 'Tuna nyumba nyingi sasa' : 'We have many properties now',
    isSwahili ? 'Nitakuonyesha orodha' : 'Let me show you the list'
  ];
};

// Viewing-related reply generation
const generateViewingReplies = (propertyType, countyData, urgency, isSwahili) => {
  const urgentReplies = [
    isSwahili ? 'Tafadhali njoo leo' : 'Please come today',
    isSwahili ? 'Tuko busy sana' : 'We are very busy',
    isSwahili ? 'Weka booking sasa' : 'Book viewing now'
  ];

  const normalReplies = [
    isSwahili ? 'Usijali, tuna wakati' : 'No problem, we have time',
    isSwahili ? 'Weka siku unayotaka' : 'Choose your preferred day',
    isSwahili ? 'Viewing ni bure' : 'Viewing is free'
  ];

  return urgency === 'now' ? urgentReplies : normalReplies;
};

// Location-related reply generation
const generateLocationReplies = (county, area, isSwahili) => {
  const countyName = county.charAt(0).toUpperCase() + county.slice(1);

  if (area) {
    return [
      isSwahili ? `Ikona ${area}, ${countyName}` : `Located in ${area}, ${countyName}`,
      isSwahili ? 'Eneo salama na nzuri' : 'Safe and good area',
      isSwahili ? 'Karibu sana na barabara' : 'Very close to main road'
    ];
  }

  return [
    isSwahili ? `Ikona ${countyName}` : `Located in ${countyName}`,
    isSwahili ? 'Kuna maeneo mengi' : 'Many areas available',
    isSwahili ? 'Niambie eneo unataka' : 'Tell me which area you prefer'
  ];
};

// Payment method reply generation
const generatePaymentMethodReplies = (userMethods, detectedPayment, countyData) => {
  const availableMethods = getOrderedPaymentMethods(countyData.name.toLowerCase());

  const replies = availableMethods.slice(0, 3).map(method => {
    const paymentMethod = require('../utils/paymentMethods.js').getPaymentMethod(method);
    return paymentMethod ? paymentMethod.instructions : `Pay via ${method}`;
  });

  return replies;
};

// Deposit-related reply generation
const generateDepositReplies = (propertyType, countyData, isSwahili) => {
  if (!propertyType || !countyData.pricing[propertyType]) {
    return [
      isSwahili ? 'Deposit ni mwezi 1' : 'Deposit is 1 month rent',
      isSwahili ? 'Ksh 10,000 - 50,000' : 'Ksh 10,000 - 50,000',
      isSwahili ? 'Inategemea ukubwa' : 'Depends on property size'
    ];
  }

  const [minPrice] = countyData.pricing[propertyType];
  const deposit = formatKenyanPrice(minPrice);

  return [
    `${deposit} deposit`,
    isSwahili ? 'Deposit inarudishwa' : 'Deposit is refundable',
    isSwahili ? 'Kulipa wakati wa kuhamia' : 'Pay when moving in'
  ];
};

// Contact-related reply generation
const generateContactReplies = (isSwahili) => {
  return [
    isSwahili ? 'Piga simu: 0712 345 678' : 'Call: 0712 345 678',
    isSwahili ? 'WhatsApp: 0712 345 678' : 'WhatsApp: 0712 345 678',
    isSwahili ? 'Email: info@househunter.co.ke' : 'Email: info@househunter.co.ke'
  ];
};

// Feature-related reply generation
const generateFeatureReplies = (propertyType, isSwahili) => {
  const features = {
    bedsitter: isSwahili ? 'Kitchen, bathroom, parking' : 'Kitchen, bathroom, parking',
    oneBedroom: isSwahili ? 'Kitchen, bathroom, lounge, parking' : 'Kitchen, bathroom, lounge, parking',
    twoBedroom: isSwahili ? 'Master bedroom, guest room, modern kitchen' : 'Master bedroom, guest room, modern kitchen',
    threeBedroom: isSwahili ? 'Spacious rooms, garden, 2 bathrooms' : 'Spacious rooms, garden, 2 bathrooms'
  };

  const featureText = features[propertyType] || (isSwahili ? 'Vitu vyote vya msingi' : 'All basic amenities');

  return [
    featureText,
    isSwahili ? 'Nyumba mpya kabisa' : 'Brand new house',
    isSwahili ? 'Tuna picha nyingi' : 'We have many photos'
  ];
};

// Default reply generation
const generateDefaultReplies = (propertyType, countyData, isSwahili) => {
  if (!propertyType) {
    return [
      isSwahili ? 'Niambie aina ya nyumba unataka' : 'Tell me what type of property you want',
      isSwahili ? 'Bedsitter, one bedroom, two bedroom?' : 'Bedsitter, one bedroom, two bedroom?',
      isSwahili ? 'Bei inatofautiana' : 'Prices vary by location'
    ];
  }

  const [minPrice] = countyData.pricing[propertyType] || [15000];
  const priceText = formatKenyanPrice(minPrice);

  return [
    `${propertyType}: ${priceText}/month`,
    isSwahili ? 'Tuna sasa' : 'Available now',
    isSwahili ? 'Unataka kuona?' : 'Want to view?'
  ];
};

// Fallback reply when we can't determine intent
const getFallbackReply = (isSwahili) => {
  const fallbacks = isSwahili ? [
    'Sawa, niambie zaidi',
    'Tuna nyumba nyingi',
    'Bei gani unataka?'
  ] : [
    'Okay, tell me more details',
    'We have many properties',
    'What price range are you looking for?'
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

// Context detection helper
export const detectContextFromMessage = (message, currentContext = {}) => {
  return {
    intent: detectIntent(message),
    propertyType: detectPropertyType(message),
    area: detectArea(message),
    county: detectCounty(message),
    paymentMethod: detectPaymentMethod(message),
    budgetRange: detectBudgetRange(message),
    urgency: detectUrgency(message),
    isSwahili: isSwahiliMessage(message),
    ...currentContext
  };
};

// Export for testing
export const testSmartReplies = () => {
  const testMessages = [
    "How much is a 2 bedroom in Kilimani?",
    "Bei ya bedsitter Kisumu?",
    "Is there availability in Westlands?",
    "Can I view tomorrow?",
    "How do I pay via M-Pesa?"
  ];

  console.log("🧪 Testing Kenyan Smart Replies:");
  testMessages.forEach((msg, index) => {
    const replies = generateSmartReplies(msg);
    console.log(`${index + 1}. "${msg}"`);
    replies.forEach(reply => console.log(`   → "${reply}"`));
    console.log('');
  });
};
